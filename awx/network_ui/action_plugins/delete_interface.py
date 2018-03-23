#---- delete_interface

from ansible.plugins.action import ActionBase

import requests


class ActionModule(ActionBase):

    BYPASS_HOST_LOOP = True

    def run(self, tmp=None, task_vars=None):
        if task_vars is None:
            task_vars = dict()
        result = super(ActionModule, self).run(tmp, task_vars)

        server = self._task.args.get('server',
                                     "{0}:{1}".format(self._play_context.remote_addr,
                                                      self._play_context.port))
        user = self._task.args.get('user', self._play_context.remote_user)
        password = self._task.args.get('password', self._play_context.password)

        interface_id = self._task.args.get('interface_id', None)

        url = server + '/api/v2/canvas/interface/' + str(interface_id) + '/'
        requests.delete(url,
                        verify=False,
                        auth=(user, password))
        return result
