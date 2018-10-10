import datetime
import os
import signal
import subprocess
import sys
import time

from celery import Celery
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    """Watch local celery workers"""
    help=("Sends a periodic ping to the local celery process over AMQP to ensure "
          "it's responsive; this command is only intended to run in an environment "
          "where celeryd is running")

    #
    # Just because celery is _running_ doesn't mean it's _working_; it's
    # imperative that celery workers are _actually_ handling AMQP messages on
    # their appropriate queues for awx to function.  Unfortunately, we've been
    # plagued by a variety of bugs in celery that cause it to hang and become
    # an unresponsive zombie, such as:
    #
    # https://github.com/celery/celery/issues/4185
    # https://github.com/celery/celery/issues/4457
    #
    # The goal of this code is periodically send a broadcast AMQP message to
    # the celery process on the local host via celery.app.control.ping;
    # If that _fails_, we attempt to determine the pid of the celery process
    # and send SIGHUP (which tends to resolve these sorts of issues for us).
    #

    INTERVAL = 60

    def _log(self, msg):
        sys.stderr.write(datetime.datetime.utcnow().isoformat())
        sys.stderr.write(' ')
        sys.stderr.write(msg)
        sys.stderr.write('\n')

    def handle(self, **options):
        app = Celery('awx')
        app.config_from_object('django.conf:settings')
        while True:
            try:
                pongs = app.control.ping(['celery@{}'.format(settings.CLUSTER_HOST_ID)], timeout=30)
            except Exception:
                pongs = []
            if not pongs:
                self._log('celery is not responsive to ping over local AMQP')
                pid = self.getpid()
                if pid:
                    self._log('sending SIGHUP to {}'.format(pid))
                    os.kill(pid, signal.SIGHUP)
            time.sleep(self.INTERVAL)

    def getpid(self):
        cmd = 'supervisorctl pid tower-processes:awx-celeryd'
        if os.path.exists('/supervisor_task.conf'):
            cmd = 'supervisorctl -c /supervisor_task.conf pid tower-processes:celery'
        try:
            return int(subprocess.check_output(cmd, shell=True))
        except Exception:
            self._log('could not detect celery pid')
