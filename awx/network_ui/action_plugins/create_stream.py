#---- create_stream

from ansible.plugins.action import ActionBase

import requests
import json


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

        var = self._task.args.get('var', None)
        the_list = self._task.args.get('list', None)
        list_var = self._task.args.get('list_var', None)

        from_device = self._task.args.get('from_device', None)
        to_device = self._task.args.get('to_device', None)
        label = self._task.args.get('label', None)

        id = self._task.args.get('id', 0)

        url = server + '/api/v2/canvas/stream/'
        headers = {'content-type': 'application/json'}
        response = requests.post(url, data=json.dumps(dict(from_device=from_device,
                                                           to_device=to_device,
                                                           label=label,
                                                           id=id,
                                                           )),
                                 verify=False,
                                 auth=(user, password),
                                 headers=headers)
        if var is not None:
            result['ansible_facts'] = {var: response.json()}
        elif list_var is not None:
            if the_list is None:
                the_list = []
            the_list.append(response.json())
            result['ansible_facts'] = {list_var: the_list}
        return result
