
# AWX
from awx.main.scheduler.dag_simple import SimpleDAG


class WorkflowDAG(SimpleDAG):
    def __init__(self, workflow_job=None):
        super(WorkflowDAG, self).__init__()
        if workflow_job:
            self._init_graph(workflow_job)

    def _init_graph(self, workflow_job):
        node_qs = workflow_job.workflow_job_nodes
        workflow_nodes = node_qs.prefetch_related('success_nodes', 'failure_nodes', 'always_nodes').all()
        for workflow_node in workflow_nodes:
            self.add_node(workflow_node)

        for node_type in ['success_nodes', 'failure_nodes', 'always_nodes']:
            for workflow_node in workflow_nodes:
                related_nodes = getattr(workflow_node, node_type).all()
                for related_node in related_nodes:
                    self.add_edge(workflow_node, related_node, node_type)

    def bfs_nodes_to_run(self):
        root_nodes = self.get_root_nodes()
        nodes = root_nodes
        nodes_found = []

        for index, n in enumerate(nodes):
            obj = n['node_object']
            job = obj.job

            if not job:
                nodes_found.append(n)
            # Job is about to run or is running. Hold our horses and wait for
            # the job to finish. We can't proceed down the graph path until we
            # have the job result.
            elif job.status not in ['failed', 'successful']:
                continue
            elif job.status == 'failed':
                children_failed = self.get_dependencies(obj, 'failure_nodes')
                children_always = self.get_dependencies(obj, 'always_nodes')
                children_all = children_failed + children_always
                nodes.extend(children_all)
            elif job.status == 'successful':
                children_success = self.get_dependencies(obj, 'success_nodes')
                children_always = self.get_dependencies(obj, 'always_nodes')
                children_all = children_success + children_always
                nodes.extend(children_all)
        return [n['node_object'] for n in nodes_found]

    def cancel_node_jobs(self):
        cancel_finished = True
        for n in self.nodes:
            obj = n['node_object']
            job = obj.job

            if not job:
                continue
            elif job.can_cancel:
                cancel_finished = False
                job.cancel()
        return cancel_finished

    def is_workflow_done(self):
        root_nodes = self.get_root_nodes()
        nodes = root_nodes
        is_failed = False

        for index, n in enumerate(nodes):
            obj = n['node_object']
            job = obj.job

            if obj.unified_job_template is None:
                is_failed = True
                continue
            elif not job:
                return False, False

            children_success = self.get_dependencies(obj, 'success_nodes')
            children_failed = self.get_dependencies(obj, 'failure_nodes')
            children_always = self.get_dependencies(obj, 'always_nodes')
            if not is_failed and job.status != 'successful':
                children_all = children_success + children_failed + children_always
                for child in children_all:
                    if child['node_object'].job:
                        break
                else:
                    is_failed = True if children_all else job.status in ['failed', 'canceled', 'error']

            if job.status in ['canceled', 'error']:
                continue
            elif job.status == 'failed':
                nodes.extend(children_failed + children_always)
            elif job.status == 'successful':
                nodes.extend(children_success + children_always)
            else:
                # Job is about to run or is running. Hold our horses and wait for
                # the job to finish. We can't proceed down the graph path until we
                # have the job result.
                return False, False
        return True, is_failed
