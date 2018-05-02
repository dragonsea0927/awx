# Copyright (c) 2015 Ansible, Inc.
# All Rights Reserved.

import datetime
import logging
import re

import dateutil.rrule
from operator import itemgetter
import dateutil.parser
from dateutil.tz import datetime_exists, tzutc

# Django
from django.db import models
from django.db.models.query import QuerySet
from django.utils.timezone import now, make_aware
from django.utils.translation import ugettext_lazy as _

# AWX
from awx.api.versioning import reverse
from awx.main.models.base import * # noqa
from awx.main.models.jobs import LaunchTimeConfig
from awx.main.utils import ignore_inventory_computed_fields
from awx.main.consumers import emit_channel_notification

import pytz


logger = logging.getLogger('awx.main.models.schedule')

__all__ = ['Schedule']


class ScheduleFilterMethods(object):

    def enabled(self, enabled=True):
        return self.filter(enabled=enabled)

    def before(self, dt):
        return self.filter(next_run__lt=dt)

    def after(self, dt):
        return self.filter(next_run__gt=dt)

    def between(self, begin, end):
        return self.after(begin).before(end)


class ScheduleQuerySet(ScheduleFilterMethods, QuerySet):
    pass


class ScheduleManager(ScheduleFilterMethods, models.Manager):

    use_for_related_objects = True

    def get_queryset(self):
        return ScheduleQuerySet(self.model, using=self._db)


class Schedule(CommonModel, LaunchTimeConfig):

    class Meta:
        app_label = 'main'
        ordering = ['-next_run']

    objects = ScheduleManager()

    unified_job_template = models.ForeignKey(
        'UnifiedJobTemplate',
        related_name='schedules',
        on_delete=models.CASCADE,
    )
    enabled = models.BooleanField(
        default=True,
        help_text=_("Enables processing of this schedule.")
    )
    dtstart = models.DateTimeField(
        null=True,
        default=None,
        editable=False,
        help_text=_("The first occurrence of the schedule occurs on or after this time.")
    )
    dtend = models.DateTimeField(
        null=True,
        default=None,
        editable=False,
        help_text=_("The last occurrence of the schedule occurs before this time, aftewards the schedule expires.")
    )
    rrule = models.CharField(
        max_length=255,
        help_text=_("A value representing the schedules iCal recurrence rule.")
    )
    next_run = models.DateTimeField(
        null=True,
        default=None,
        editable=False,
        help_text=_("The next time that the scheduled action will run.")
    )

    @classmethod
    def get_zoneinfo(self):
        from dateutil.zoneinfo import get_zonefile_instance
        return [
            {'name': zone}
            for zone in sorted(get_zonefile_instance().zones)
        ]

    @property
    def timezone(self):
        utc = tzutc()
        _rrule = dateutil.rrule.rrulestr(
            self.rrule,
            tzinfos={x: utc for x in dateutil.parser.parserinfo().UTCZONE}
        )
        tzinfo = _rrule._dtstart.tzinfo
        if tzinfo == utc:
            return 'UTC'
        fname = tzinfo._filename
        all_zones = map(itemgetter('name'), Schedule.get_zoneinfo())
        all_zones.sort(key = lambda x: -len(x))
        for zone in all_zones:
            if fname.endswith(zone):
                return zone
        logger.warn('Could not detect valid zoneinfo for {}'.format(self.rrule))
        return ''

    @classmethod
    def rrulestr(cls, rrule, **kwargs):
        """
        Apply our own custom rrule parsing requirements
        """
        kwargs['forceset'] = True

        #
        # RFC5545 specifies that the UNTIL rule part MUST ALWAYS be a date
        # with UTC time.  This is extra work for API implementers because
        # it requires them to perform DTSTART local -> UTC datetime coercion on
        # POST and UTC -> DTSTART local coercion on GET.
        #
        # This block of code is a departure from the RFC.  If you send an
        # rrule like this to the API (without a Z on the UNTIL):
        #
        # DTSTART;TZID=America/New_York:20180502T150000 RRULE:FREQ=HOURLY;INTERVAL=1;UNTIL=20180502T180000
        #
        # ...we'll assume that the naive UNTIL is intended to match the DTSTART
        # timezone (America/New_York), and so we'll coerce to UTC _for you_
        # automatically.
        #
        if 'until=' in rrule.lower():
            # if DTSTART;TZID= is used, coerce "naive" UNTIL values
            # to the proper UTC date
            match_until = re.match(".*?UNTIL\=(?P<until>[0-9]+T[0-9]+)(?P<utcflag>Z?)", rrule)
            if not len(match_until.group('utcflag')):
                # rrule = DTSTART;TZID=America/New_York:20200601T120000 RRULE:...;UNTIL=20200601T170000

                # Find the UNTIL=N part of the string
                # naive_until = 20200601T170000
                naive_until = match_until.group('until')

                # What is the DTSTART timezone for:
                # DTSTART;TZID=America/New_York:20200601T120000 RRULE:...;UNTIL=20200601T170000Z
                # local_tz = tzfile('/usr/share/zoneinfo/America/New_York')
                local_tz = dateutil.rrule.rrulestr(
                    rrule.replace(naive_until, naive_until + 'Z'),
                    tzinfos={x: tzutc() for x in dateutil.parser.parserinfo().UTCZONE}
                )._dtstart.tzinfo

                # Make a datetime object with tzinfo=<the DTSTART timezone>
                # localized_until = datetime.datetime(2020, 6, 1, 17, 0, tzinfo=tzfile('/usr/share/zoneinfo/America/New_York'))
                localized_until = make_aware(
                    datetime.datetime.strptime(naive_until, "%Y%m%dT%H%M%S"),
                    local_tz
                )

                # Coerce the datetime to UTC and format it as a string w/ Zulu format
                # utc_until = 20200601T220000Z
                utc_until = localized_until.astimezone(pytz.utc).strftime('%Y%m%dT%H%M%SZ')

                # rrule was:    DTSTART;TZID=America/New_York:20200601T120000 RRULE:...;UNTIL=20200601T170000
                # rrule is now: DTSTART;TZID=America/New_York:20200601T120000 RRULE:...;UNTIL=20200601T220000Z
                rrule = rrule.replace(naive_until, utc_until)

        x = dateutil.rrule.rrulestr(rrule, **kwargs)

        for r in x._rrule:
            if r._dtstart and r._dtstart.tzinfo is None:
                raise ValueError(
                    'A valid TZID must be provided (e.g., America/New_York)'
                )

        if 'MINUTELY' in rrule or 'HOURLY' in rrule:
            try:
                first_event = x[0]
                if first_event < now() - datetime.timedelta(days=365 * 5):
                    raise ValueError('RRULE values with more than 1000 events are not allowed.')
            except IndexError:
                pass
        return x

    def __unicode__(self):
        return u'%s_t%s_%s_%s' % (self.name, self.unified_job_template.id, self.id, self.next_run)

    def get_absolute_url(self, request=None):
        return reverse('api:schedule_detail', kwargs={'pk': self.pk}, request=request)

    def get_job_kwargs(self):
        config_data = self.prompts_dict()
        job_kwargs, rejected, errors = self.unified_job_template._accept_or_ignore_job_kwargs(**config_data)
        if errors:
            logger.info('Errors creating scheduled job: {}'.format(errors))
        job_kwargs['_eager_fields'] = {'launch_type': 'scheduled', 'schedule': self}
        return job_kwargs

    def update_computed_fields(self):
        future_rs = Schedule.rrulestr(self.rrule)
        next_run_actual = future_rs.after(now())

        if next_run_actual is not None:
            if not datetime_exists(next_run_actual):
                # skip imaginary dates, like 2:30 on DST boundaries
                next_run_actual = future_rs.after(next_run_actual)
            next_run_actual = next_run_actual.astimezone(pytz.utc)

        self.next_run = next_run_actual
        try:
            self.dtstart = future_rs[0].astimezone(pytz.utc)
        except IndexError:
            self.dtstart = None
        self.dtend = None
        if 'until' in self.rrule.lower() or 'count' in self.rrule.lower():
            try:
                self.dtend = future_rs[-1].astimezone(pytz.utc)
            except IndexError:
                self.dtend = None
        emit_channel_notification('schedules-changed', dict(id=self.id, group_name='schedules'))
        with ignore_inventory_computed_fields():
            self.unified_job_template.update_computed_fields()

    def save(self, *args, **kwargs):
        self.update_computed_fields()
        super(Schedule, self).save(*args, **kwargs)
