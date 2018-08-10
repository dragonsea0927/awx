export const API_MAX_PAGE_SIZE = 200;
export const API_ROOT = '/api/v2/';

export const EVENT_START_TASK = 'playbook_on_task_start';
export const EVENT_START_PLAY = 'playbook_on_play_start';
export const EVENT_START_PLAYBOOK = 'playbook_on_start';
export const EVENT_STATS_PLAY = 'playbook_on_stats';

export const HOST_STATUS_KEYS = ['dark', 'failures', 'changed', 'ok', 'skipped'];

export const JOB_STATUS_COMPLETE = ['successful', 'failed', 'unknown'];
export const JOB_STATUS_INCOMPLETE = ['canceled', 'error'];
export const JOB_STATUS_UNSUCCESSFUL = ['failed'].concat(JOB_STATUS_INCOMPLETE);
export const JOB_STATUS_FINISHED = JOB_STATUS_COMPLETE.concat(JOB_STATUS_INCOMPLETE);

export const OUTPUT_ELEMENT_CONTAINER = '.at-Stdout-container';
export const OUTPUT_ELEMENT_TBODY = '#atStdoutResultTable';
export const OUTPUT_MAX_LAG = 120;
export const OUTPUT_ORDER_BY = 'counter';
export const OUTPUT_PAGE_CACHE = true;
export const OUTPUT_PAGE_LIMIT = 5;
export const OUTPUT_PAGE_SIZE = 50;
export const OUTPUT_SCROLL_DELAY = 100;
export const OUTPUT_SCROLL_THRESHOLD = 0.1;
export const OUTPUT_SEARCH_DOCLINK = 'https://docs.ansible.com/ansible-tower/3.3.0/html/userguide/search_sort.html';
export const OUTPUT_SEARCH_FIELDS = ['changed', 'created', 'failed', 'host_name', 'stdout', 'task', 'role', 'playbook', 'play'];
export const OUTPUT_SEARCH_KEY_EXAMPLES = ['host_name:localhost', 'task:set', 'created:>=2000-01-01'];
export const OUTPUT_EVENT_LIMIT = OUTPUT_PAGE_LIMIT * OUTPUT_PAGE_SIZE;

export const WS_PREFIX = 'ws';
