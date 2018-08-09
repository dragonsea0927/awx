/* eslint camelcase: 0 */
import { OUTPUT_PAGE_LIMIT } from './constants';

function PageService ($q) {
    this.init = (storage, api, { getScrollHeight }) => {
        const { prepend, append, shift, pop, deleteRecord } = storage;
        const { getPage, getFirst, getLast, getLastPageNumber, getMaxCounter } = api;

        this.api = {
            getPage,
            getFirst,
            getLast,
            getLastPageNumber,
            getMaxCounter,
        };

        this.storage = {
            prepend,
            append,
            shift,
            pop,
            deleteRecord,
        };

        this.hooks = {
            getScrollHeight,
        };

        this.records = {};
        this.uuids = {};

        this.state = {
            head: 0,
            tail: 0,
        };

        this.chain = $q.resolve();
    };

    this.pushFront = (results, key) => {
        if (!results) {
            return $q.resolve();
        }

        return this.storage.append(results)
            .then(() => {
                const tail = key || ++this.state.tail;

                this.records[tail] = {};
                results.forEach(({ counter, start_line, end_line, uuid }) => {
                    this.records[tail][counter] = { start_line, end_line };
                    this.uuids[counter] = uuid;
                });

                return $q.resolve();
            });
    };

    this.pushBack = (results, key) => {
        if (!results) {
            return $q.resolve();
        }

        return this.storage.prepend(results)
            .then(() => {
                const head = key || --this.state.head;

                this.records[head] = {};
                results.forEach(({ counter, start_line, end_line, uuid }) => {
                    this.records[head][counter] = { start_line, end_line };
                    this.uuids[counter] = uuid;
                });

                return $q.resolve();
            });
    };

    this.popBack = () => {
        if (this.getRecordCount() === 0) {
            return $q.resolve();
        }

        const pageRecord = this.records[this.state.head] || {};

        let lines = 0;
        const counters = [];

        Object.keys(pageRecord)
            .forEach(counter => {
                lines += pageRecord[counter].end_line - pageRecord[counter].start_line;
                counters.push(counter);
            });

        return this.storage.shift(lines)
            .then(() => {
                counters.forEach(counter => {
                    this.storage.deleteRecord(this.uuids[counter]);
                    delete this.uuids[counter];
                });

                delete this.records[this.state.head++];

                return $q.resolve();
            });
    };

    this.popFront = () => {
        if (this.getRecordCount() === 0) {
            return $q.resolve();
        }

        const pageRecord = this.records[this.state.tail] || {};

        let lines = 0;
        const counters = [];

        Object.keys(pageRecord)
            .forEach(counter => {
                lines += pageRecord[counter].end_line - pageRecord[counter].start_line;
                counters.push(counter);
            });

        return this.storage.pop(lines)
            .then(() => {
                counters.forEach(counter => {
                    this.storage.deleteRecord(this.uuids[counter]);
                    delete this.uuids[counter];
                });

                delete this.records[this.state.tail--];

                return $q.resolve();
            });
    };

    this.getNext = () => {
        const lastPageNumber = this.api.getLastPageNumber();
        const number = Math.min(this.state.tail + 1, lastPageNumber);

        const isLoaded = (number >= this.state.head && number <= this.state.tail);
        const isValid = (number >= 1 && number <= lastPageNumber);

        let popHeight = this.hooks.getScrollHeight();

        if (!isValid || isLoaded) {
            this.chain = this.chain
                .then(() => $q.resolve(popHeight));

            return this.chain;
        }

        const pageCount = this.state.head - this.state.tail;

        if (pageCount >= OUTPUT_PAGE_LIMIT) {
            this.chain = this.chain
                .then(() => this.popBack())
                .then(() => {
                    popHeight = this.hooks.getScrollHeight();

                    return $q.resolve();
                });
        }

        this.chain = this.chain
            .then(() => this.api.getPage(number))
            .then(events => this.pushFront(events))
            .then(() => $q.resolve(popHeight));

        return this.chain;
    };

    this.getPrevious = () => {
        const number = Math.max(this.state.head - 1, 1);

        const isLoaded = (number >= this.state.head && number <= this.state.tail);
        const isValid = (number >= 1 && number <= this.api.getLastPageNumber());

        let popHeight = this.hooks.getScrollHeight();

        if (!isValid || isLoaded) {
            this.chain = this.chain
                .then(() => $q.resolve(popHeight));

            return this.chain;
        }

        const pageCount = this.state.head - this.state.tail;

        if (pageCount >= OUTPUT_PAGE_LIMIT) {
            this.chain = this.chain
                .then(() => this.popFront())
                .then(() => {
                    popHeight = this.hooks.getScrollHeight();

                    return $q.resolve();
                });
        }

        this.chain = this.chain
            .then(() => this.api.getPage(number))
            .then(events => this.pushBack(events))
            .then(() => $q.resolve(popHeight));

        return this.chain;
    };

    this.clear = () => {
        const count = this.getRecordCount();

        for (let i = 0; i <= count; ++i) {
            this.chain = this.chain.then(() => this.popBack());
        }

        return this.chain;
    };

    this.getLast = () => this.clear()
        .then(() => this.api.getLast())
        .then(events => {
            const lastPage = this.api.getLastPageNumber();

            this.state.head = lastPage;
            this.state.tail = lastPage;

            return this.pushBack(events, lastPage);
        })
        .then(() => this.getPrevious());

    this.getFirst = () => this.clear()
        .then(() => this.api.getFirst())
        .then(events => {
            this.state.head = 1;
            this.state.tail = 1;

            return this.pushBack(events, 1);
        })
        .then(() => this.getNext());

    this.isOnLastPage = () => this.api.getLastPageNumber() === this.state.tail;
    this.getRecordCount = () => Object.keys(this.records).length;
    this.getTailCounter = () => this.state.tail;
    this.getMaxCounter = () => this.api.getMaxCounter();
}

PageService.$inject = ['$q'];

export default PageService;
