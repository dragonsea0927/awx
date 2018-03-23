# (c) 2012-2014, Ansible, Inc
#
# This file is part of Ansible
#
# Ansible is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Ansible is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Ansible.  If not, see <http://www.gnu.org/licenses/>.

from __future__ import (absolute_import, division, print_function)
__metaclass__ = type

from ansible.plugins.callback import CallbackBase
from websocket import create_connection
import json
import traceback

from functools import wraps

DEBUG = False


def debug(fn):
    if DEBUG:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            print('Calling', fn)
            ret_value = fn(*args, **kwargs)
            return ret_value
        return wrapper
    else:
        return fn


def catch_exceptions(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            ret_value = fn(*args, **kwargs)
            return ret_value
        except BaseException:
            print(traceback.format_exc())
            return None
    return wrapper


class CallbackModule(CallbackBase):
    '''
    This callback puts results into a host specific file in a directory in json format.
    '''

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'ansible_upload'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.task = None
        self.play = None
        self.hosts = []
        self.topology_id = None
        self.ws = None
        self.options = None
        self.create_ws_connection()

    def create_ws_connection(self):
        if self.options is not None and 'topology_id' in self.options:
            self.topology_id = self.options['topology_id']
        if self.topology_id:
            self.ws = create_connection("ws://127.0.0.1:8013/network_ui/ansible?topology_id={0}".format(self.topology_id))
        else:
            self.ws = None

    def ws_send(self, data):

        def send():
            if self.ws is None:
                self.create_ws_connection()
            self.ws.send(data)
        try:
            send()
        except BaseException:
            try:
                self.create_ws_connection()
                send()
            except BaseException:
                print (traceback.format_exc())
        

    @catch_exceptions
    @debug
    def v2_playbook_on_setup(self):
        pass

    @catch_exceptions
    @debug
    def v2_playbook_on_handler_task_start(self, task):
        pass

    @catch_exceptions
    @debug
    def v2_runner_on_ok(self, result):
        self.ws_send(json.dumps(['TaskStatus', dict(device_name=result._host.get_name(),
                                                    task_id=str(result._task._uuid),
                                                    working=False,
                                                    status="pass")]))

    @catch_exceptions
    @debug
    def v2_runner_on_failed(self, result, ignore_errors=False):
        self.ws_send(json.dumps(['TaskStatus', dict(device_name=result._host.get_name(),
                                                    task_id=str(result._task._uuid),
                                                    working=False,
                                                    status="fail")]))

    @catch_exceptions
    @debug
    def runner_on_unreachable(self, host, result, ignore_errors=False):
        self.ws_send(json.dumps(['TaskStatus', dict(device_name=host,
                                                    task_id=str(self.task._uuid),
                                                    working=False,
                                                    status="fail")]))

    @catch_exceptions
    @debug
    def v2_runner_item_on_skipped(self, result, ignore_errors=False):
        self.ws_send(json.dumps(['TaskStatus', dict(device_name=result._host.get_name(),
                                                    task_id=str(result._task._uuid),
                                                    working=False,
                                                    status="skip")]))

    @catch_exceptions
    @debug
    def DISABLED_v2_on_any(self, *args, **kwargs):
        self._display.display("--- play: {} task: {} ---".format(getattr(self.play, 'name', None), self.task))

        self._display.display("     --- ARGS ")
        for i, a in enumerate(args):
            self._display.display('     %s: %s' % (i, a))

        self._display.display("      --- KWARGS ")
        for k in kwargs:
            self._display.display('     %s: %s' % (k, kwargs[k]))

    @catch_exceptions
    @debug
    def v2_playbook_on_play_start(self, play):
        self.play = play
        self.hosts = play.get_variable_manager()._inventory.get_hosts()
        self.options = play.get_variable_manager().extra_vars

        for host in self.hosts:
            self.ws_send(json.dumps(['DeviceStatus', dict(name=host.get_name(),
                                                          working=True,
                                                          status=None)]))

    @catch_exceptions
    @debug
    def v2_playbook_on_task_start(self, task, is_conditional):
        self.task = task
        for host in self.hosts:
            self.ws_send(json.dumps(['TaskStatus', dict(device_name=host.get_name(),
                                                        task_id=str(task._uuid),
                                                        working=True,
                                                        status=None)]))

    @catch_exceptions
    @debug
    def v2_playbook_on_stats(self, stats):
        for host in self.hosts:
            s = stats.summarize(host.get_name())
            status = "pass"
            status = "fail" if s['failures'] > 0 else status
            status = "fail" if s['unreachable'] > 0 else status
            self.ws_send(json.dumps(['DeviceStatus', dict(name=host.get_name(),
                                                          working=False,
                                                          status=status)]))
