# Copyright (c) 2017 Ansible Tower by Red Hat
# All Rights Reserved.

from copy import copy
import json
import time
import logging
import traceback
import socket
import sys
from datetime import datetime


from django.conf import settings


class TimeFormatter(logging.Formatter):
    '''
    Custom log formatter used for inventory imports
    '''
    def format(self, record):
        record.relativeSeconds = record.relativeCreated / 1000.0
        return logging.Formatter.format(self, record)


class LogstashFormatterBase(logging.Formatter):

    def __init__(self, message_type='Logstash', tags=None, fqdn=False):
        self.message_type = message_type
        self.tags = tags if tags is not None else []

        if fqdn:
            self.host = socket.getfqdn()
        else:
            self.host = socket.gethostname()

    def get_extra_fields(self, record):
        # The list contains all the attributes listed in
        # http://docs.python.org/library/logging.html#logrecord-attributes
        skip_list = (
            'args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
            'funcName', 'id', 'levelname', 'levelno', 'lineno', 'module',
            'msecs', 'msecs', 'message', 'msg', 'name', 'pathname', 'process',
            'processName', 'relativeCreated', 'thread', 'threadName', 'extra')

        if sys.version_info < (3, 0):
            easy_types = (basestring, bool, dict, float, int, long, list, type(None))
        else:
            easy_types = (str, bool, dict, float, int, list, type(None))

        fields = {}

        for key, value in record.__dict__.items():
            if key not in skip_list:
                if isinstance(value, easy_types):
                    fields[key] = value
                else:
                    fields[key] = repr(value)

        return fields

    def get_debug_fields(self, record):
        fields = {
            'stack_trace': self.format_exception(record.exc_info),
            'lineno': record.lineno,
            'process': record.process,
            'thread_name': record.threadName,
        }

        # funcName was added in 2.5
        if not getattr(record, 'funcName', None):
            fields['funcName'] = record.funcName

        # processName was added in 2.6
        if not getattr(record, 'processName', None):
            fields['processName'] = record.processName

        return fields

    @classmethod
    def format_source(cls, message_type, host, path):
        return "%s://%s/%s" % (message_type, host, path)

    @classmethod
    def format_timestamp(cls, time):
        tstamp = datetime.utcfromtimestamp(time)
        return tstamp.strftime("%Y-%m-%dT%H:%M:%S") + ".%03d" % (tstamp.microsecond / 1000) + "Z"

    @classmethod
    def format_exception(cls, exc_info):
        return ''.join(traceback.format_exception(*exc_info)) if exc_info else ''

    @classmethod
    def serialize(cls, message):
        if sys.version_info < (3, 0):
            return json.dumps(message)
        else:
            return bytes(json.dumps(message), 'utf-8')


class LogstashFormatter(LogstashFormatterBase):

    def reformat_data_for_log(self, raw_data, kind=None):
        '''
        Process dictionaries from various contexts (job events, activity stream
        changes, etc.) to give meaningful information
        Output a dictionary which will be passed in logstash or syslog format
        to the logging receiver
        '''
        if kind == 'activity_stream':
            try:
                raw_data['changes'] = json.loads(raw_data.get('changes', '{}'))
            except Exception:
                pass  # best effort here, if it's not valid JSON, then meh
            return raw_data
        elif kind == 'system_tracking':
            data = copy(raw_data['ansible_facts'])
        else:
            data = copy(raw_data)
        if isinstance(data, str):
            data = json.loads(data)
        data_for_log = {}

        def index_by_name(alist):
            """Takes a list of dictionaries with `name` as a key in each dict
            and returns a dictionary indexed by those names"""
            adict = {}
            for item in alist:
                subdict = copy(item)
                if 'name' in subdict:
                    name = subdict.get('name', None)
                elif 'path' in subdict:
                    name = subdict.get('path', None)
                if name:
                    # Logstash v2 can not accept '.' in a name
                    name = name.replace('.', '_')
                    adict[name] = subdict
            return adict

        def convert_to_type(t, val):
            if t is float:
                val = val[:-1] if val.endswith('s') else val
                try:
                    return float(val)
                except ValueError:
                    return val
            elif t is int:
                try:
                    return int(val)
                except ValueError:
                    return val
            elif t is str:
                return val

        if kind == 'job_events':
            job_event = raw_data['python_objects']['job_event']
            for field_object in job_event._meta.fields:

                if not field_object.__class__ or not field_object.__class__.__name__:
                    field_class_name = ''
                else:
                    field_class_name = field_object.__class__.__name__
                if field_class_name in ['ManyToOneRel', 'ManyToManyField']:
                    continue

                fd = field_object.name
                key = fd
                if field_class_name == 'ForeignKey':
                    fd = '{}_id'.format(field_object.name)

                try:
                    data_for_log[key] = getattr(job_event, fd)
                    if fd in ['created', 'modified'] and data_for_log[key] is not None:
                        time_float = time.mktime(data_for_log[key].timetuple())
                        data_for_log[key] = self.format_timestamp(time_float)
                except Exception as e:
                    data_for_log[key] = 'Exception `{}` producing field'.format(e)

            data_for_log['event_display'] = job_event.get_event_display2()

        elif kind == 'system_tracking':
            data.pop('ansible_python_version', None)
            if 'ansible_python' in data:
                data['ansible_python'].pop('version_info', None)

            data_for_log['ansible_facts'] = data
            data_for_log['ansible_facts_modified'] = raw_data['ansible_facts_modified']
            data_for_log['inventory_id'] = raw_data['inventory_id']
            data_for_log['host_name'] = raw_data['host_name']
            data_for_log['job_id'] = raw_data['job_id']
        elif kind == 'performance':
            request = raw_data['python_objects']['request']
            response = raw_data['python_objects']['response']

            # Note: All of the below keys may not be in the response "dict"
            # For example, X-API-Query-Time and X-API-Query-Count will only
            # exist if SQL_DEBUG is turned on in settings.
            headers = [
                (float, 'X-API-Time'),  # may end with an 's' "0.33s"
                (float, 'X-API-Total-Time'),
                (int, 'X-API-Query-Count'),
                (float, 'X-API-Query-Time'), # may also end with an 's'
                (str, 'X-API-Node'),
            ]
            data_for_log['x_api'] = {k: convert_to_type(t, response[k]) for (t, k) in headers if k in response}

            data_for_log['request'] = {
                'method': request.method,
                'path': request.path,
                'path_info': request.path_info,
                'query_string': request.META['QUERY_STRING'],
            }

            if hasattr(request, 'data'):
                data_for_log['request']['data'] = request.data

        return data_for_log

    def get_extra_fields(self, record):
        fields = super(LogstashFormatter, self).get_extra_fields(record)
        if record.name.startswith('awx.analytics'):
            log_kind = record.name[len('awx.analytics.'):]
            fields = self.reformat_data_for_log(fields, kind=log_kind)
        # General AWX metadata
        for log_name, setting_name in [
                ('type', 'LOG_AGGREGATOR_TYPE'),
                ('cluster_host_id', 'CLUSTER_HOST_ID'),
                ('tower_uuid', 'LOG_AGGREGATOR_TOWER_UUID')]:
            if hasattr(settings, setting_name):
                fields[log_name] = getattr(settings, setting_name, None)
            elif log_name == 'type':
                fields[log_name] = 'other'
        return fields

    def format(self, record):
        message = {
            # Fields not included, but exist in related logs
            # 'path': record.pathname
            # '@version': '1', # from python-logstash
            # 'tags': self.tags,
            '@timestamp': self.format_timestamp(record.created),
            'message': record.getMessage(),
            'host': self.host,

            # Extra Fields
            'level': record.levelname,
            'logger_name': record.name,
        }

        # Add extra fields
        message.update(self.get_extra_fields(record))

        # If exception, add debug info
        if record.exc_info:
            message.update(self.get_debug_fields(record))

        return self.serialize(message)
