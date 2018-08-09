import Ansi from 'ansi-to-html';
import Entities from 'html-entities';

import {
    EVENT_START_PLAY,
    EVENT_STATS_PLAY,
    EVENT_START_TASK,
    OUTPUT_ELEMENT_TBODY,
} from './constants';

const EVENT_GROUPS = [
    EVENT_START_TASK,
    EVENT_START_PLAY,
];

const TIME_EVENTS = [
    EVENT_START_TASK,
    EVENT_START_PLAY,
    EVENT_STATS_PLAY,
];

const ansi = new Ansi();
const entities = new Entities.AllHtmlEntities();

// https://github.com/chalk/ansi-regex
const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
].join('|');

const re = new RegExp(pattern);
const hasAnsi = input => re.test(input);

function JobRenderService ($q, $sce, $window) {
    this.init = ({ compile, toggles }) => {
        this.parent = null;
        this.record = {};
        this.el = $(OUTPUT_ELEMENT_TBODY);
        this.hooks = { compile };

        this.createToggles = toggles;
    };

    this.sortByLineNumber = (a, b) => {
        if (a.start_line > b.start_line) {
            return 1;
        }

        if (a.start_line < b.start_line) {
            return -1;
        }

        return 0;
    };

    this.transformEventGroup = events => {
        let lines = 0;
        let html = '';

        events.sort(this.sortByLineNumber);

        for (let i = 0; i < events.length; ++i) {
            const line = this.transformEvent(events[i]);
            html += line.html;
            lines += line.count;
        }

        return { html, lines };
    };

    this.transformEvent = event => {
        if (this.record[event.uuid]) {
            return { html: '', count: 0 };
        }

        if (!event || !event.stdout) {
            return { html: '', count: 0 };
        }

        const stdout = this.sanitize(event.stdout);
        const lines = stdout.split('\r\n');

        let count = lines.length;
        let ln = event.start_line;

        const current = this.createRecord(ln, lines, event);

        const html = lines.reduce((concat, line, i) => {
            ln++;

            const isLastLine = i === lines.length - 1;

            let row = this.createRow(current, ln, line);

            if (current && current.isTruncated && isLastLine) {
                row += this.createRow(current);
                count++;
            }

            return `${concat}${row}`;
        }, '');

        return { html, count };
    };

    this.isHostEvent = (event) => {
        if (typeof event.host === 'number') {
            return true;
        }

        if (event.type === 'project_update_event' &&
            event.event !== 'runner_on_skipped' &&
            event.event_data.host) {
            return true;
        }

        return false;
    };

    this.createRecord = (ln, lines, event) => {
        if (!event.uuid) {
            return null;
        }

        const info = {
            id: event.id,
            line: ln + 1,
            name: event.event,
            uuid: event.uuid,
            level: event.event_level,
            start: event.start_line,
            end: event.end_line,
            isTruncated: (event.end_line - event.start_line) > lines.length,
            lineCount: lines.length,
            isHost: this.isHostEvent(event),
        };

        if (event.parent_uuid) {
            info.parents = this.getParentEvents(event.parent_uuid);
        }

        if (info.isTruncated) {
            info.truncatedAt = event.start_line + lines.length;
        }

        if (EVENT_GROUPS.includes(event.event)) {
            info.isParent = true;

            if (event.event_level === 1) {
                this.parent = event.uuid;
            }

            if (event.parent_uuid) {
                if (this.record[event.parent_uuid]) {
                    if (this.record[event.parent_uuid].children &&
                        !this.record[event.parent_uuid].children.includes(event.uuid)) {
                        this.record[event.parent_uuid].children.push(event.uuid);
                    } else {
                        this.record[event.parent_uuid].children = [event.uuid];
                    }
                }
            }
        }

        if (TIME_EVENTS.includes(event.event)) {
            info.time = this.getTimestamp(event.created);
            info.line++;
        }

        this.record[event.uuid] = info;

        return info;
    };

    this.getRecord = uuid => this.record[uuid];

    this.deleteRecord = uuid => {
        delete this.record[uuid];
    };

    this.getParentEvents = (uuid, list) => {
        list = list || [];
        // always push its parent if exists
        list.push(uuid);
        // if we can get grandparent in current visible lines, we also push it
        if (this.record[uuid] && this.record[uuid].parents) {
            list = list.concat(this.record[uuid].parents);
        }

        return list;
    };

    this.createRow = (current, ln, content) => {
        let id = '';
        let timestamp = '';
        let tdToggle = '';
        let tdEvent = '';
        let classList = '';

        content = content || '';

        if (hasAnsi(content)) {
            content = ansi.toHtml(content);
        }

        if (current) {
            if (this.createToggles && current.isParent && current.line === ln) {
                id = current.uuid;
                tdToggle = `<div class="at-Stdout-toggle" ng-click="vm.toggleLineExpand('${id}')"><i class="fa fa-angle-down can-toggle"></i></div>`;
            }

            if (current.isHost) {
                tdEvent = `<div class="at-Stdout-event--host" ng-click="vm.showHostDetails('${current.id}', '${current.uuid}')"><span ng-non-bindable>${content}</span></div>`;
            }

            if (current.time && current.line === ln) {
                timestamp = `<span>${current.time}</span>`;
            }

            if (current.parents) {
                classList = current.parents.reduce((list, uuid) => `${list} child-of-${uuid}`, '');
            }
        }

        if (!tdEvent) {
            tdEvent = `<div class="at-Stdout-event"><span ng-non-bindable>${content}</span></div>`;
        }

        if (!tdToggle) {
            tdToggle = '<div class="at-Stdout-toggle"></div>';
        }

        if (!ln) {
            ln = '...';
        }

        return `
            <div id="${id}" class="at-Stdout-row ${classList}">
                ${tdToggle}
                <div class="at-Stdout-line">${ln}</div>
                ${tdEvent}
                <div class="at-Stdout-time">${timestamp}</div>
            </div>`;
    };

    this.getTimestamp = created => {
        const date = new Date(created);
        const hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
        const minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
        const second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();

        return `${hour}:${minute}:${second}`;
    };

    this.remove = elements => this.requestAnimationFrame(() => elements.remove());

    this.requestAnimationFrame = fn => $q(resolve => {
        $window.requestAnimationFrame(() => {
            if (fn) {
                fn();
            }

            return resolve();
        });
    });

    this.compile = content => {
        this.hooks.compile(content);

        return this.requestAnimationFrame();
    };

    this.clear = () => {
        const elements = this.el.children();
        return this.remove(elements);
    };

    this.shift = lines => {
        const elements = this.el.children().slice(0, lines);

        return this.remove(elements);
    };

    this.pop = lines => {
        const elements = this.el.children().slice(-lines);

        return this.remove(elements);
    };

    this.prepend = events => {
        if (events.length < 1) {
            return $q.resolve();
        }

        const result = this.transformEventGroup(events);
        const html = this.trustHtml(result.html);

        const newElements = angular.element(html);

        return this.requestAnimationFrame(() => this.el.prepend(newElements))
            .then(() => this.compile(newElements))
            .then(() => result.lines);
    };

    this.append = events => {
        if (events.length < 1) {
            return $q.resolve();
        }

        const result = this.transformEventGroup(events);
        const html = this.trustHtml(result.html);

        const newElements = angular.element(html);

        return this.requestAnimationFrame(() => this.el.append(newElements))
            .then(() => this.compile(newElements))
            .then(() => result.lines);
    };

    this.trustHtml = html => $sce.getTrustedHtml($sce.trustAsHtml(html));

    this.sanitize = html => entities.encode(html);
}

JobRenderService.$inject = ['$q', '$sce', '$window'];

export default JobRenderService;
