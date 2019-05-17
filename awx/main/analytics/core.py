import inspect
import json
import logging
import os
import os.path
import tempfile
import shutil
import subprocess

from django.conf import settings
from django.utils.encoding import smart_str
from django.utils.timezone import now, timedelta
from rest_framework.exceptions import PermissionDenied

from awx.conf.license import get_license
from awx.main.models import Job
from awx.main.access import access_registry
from awx.main.models.ha import TowerAnalyticsState


__all__ = ['register', 'gather', 'ship']


logger = logging.getLogger('awx.main.analytics')


def _valid_license():
    try:
        if get_license(show_key=False).get('license_type', 'UNLICENSED') == 'open':
            return False
        access_registry[Job](None).check_license()
    except PermissionDenied:
        logger.exception("A valid license was not found:")
        return False
    return True


def register(key):
    """
    A decorator used to register a function as a metric collector.

    Decorated functions should return JSON-serializable objects.

    @register('projects_by_scm_type')
    def projects_by_scm_type():
        return {'git': 5, 'svn': 1, 'hg': 0}
    """

    def decorate(f):
        f.__awx_analytics_key__ = key
        return f

    return decorate


def gather(dest=None, module=None):
    """
    Gather all defined metrics and write them as JSON files in a .tgz

    :param dest:    the (optional) absolute path to write a compressed tarball
    :pararm module: the module to search for registered analytic collector
                    functions; defaults to awx.main.analytics.collectors
    """

    run_now = now()
    state = TowerAnalyticsState.get_solo()
    last_run = state.last_run
    logger.debug("Last analytics run was: {}".format(last_run))
    
    max_interval = now() - timedelta(days=7)
    if last_run < max_interval or not last_run:
        last_run = max_interval


    if _valid_license() is False:
        logger.exception("Invalid License provided, or No License Provided")
        return "Error: Invalid License provided, or No License Provided"
    
    if not settings.INSIGHTS_TRACKING_STATE:
        logger.error("Insights analytics not enabled")
        return

    if module is None:
        from awx.main.analytics import collectors
        module = collectors

    dest = dest or tempfile.mkdtemp(prefix='awx_analytics')
    for name, func in inspect.getmembers(module):
        if inspect.isfunction(func) and hasattr(func, '__awx_analytics_key__'):
            key = func.__awx_analytics_key__
            path = '{}.json'.format(os.path.join(dest, key))
            with open(path, 'w', encoding='utf-8') as f:
                try:
                    json.dump(func(last_run), f)
                except Exception:
                    logger.exception("Could not generate metric {}.json".format(key))
                    f.close()
                    os.remove(f.name)
    try:
        collectors.copy_tables(since=last_run, full_path=dest)
    except Exception:
        logger.exception("Could not copy tables")
        
    # can't use isoformat() since it has colons, which GNU tar doesn't like
    tarname = '_'.join([
        settings.SYSTEM_UUID,
        run_now.strftime('%Y-%m-%d-%H%M%S%z')
    ])
    tgz = shutil.make_archive(
        os.path.join(os.path.dirname(dest), tarname),
        'gztar',
        dest
    )
    shutil.rmtree(dest)
    return tgz


def ship(path):
    """
    Ship gathered metrics via the Insights agent
    """
    agent = 'insights-client'
    if shutil.which(agent) is None:
        logger.error('could not find {} on PATH'.format(agent))
        return
    logger.debug('shipping analytics file: {}'.format(path))
    try:
        cmd = [
            agent, '--payload', path, '--content-type', settings.INSIGHTS_AGENT_MIME
        ]
        output = smart_str(subprocess.check_output(cmd, timeout=60 * 5))
        logger.debug(output)
        # reset the `last_run` when data is shipped
        run_now = now()
        state = TowerAnalyticsState.get_solo()
        state.last_run = run_now
        state.save()

    except subprocess.CalledProcessError:
        logger.exception('{} failure:'.format(cmd))
    except subprocess.TimeoutExpired:
        logger.exception('{} timeout:'.format(cmd))
