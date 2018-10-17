'use strict';
import moment from 'moment';

describe('View: Job Details', () => {
    let JobDetails,
        scope,
        state,
        OutputStrings,
        Prompt,
        filter,
        ProcessErrors,
        Wait,
        httpBackend,
        ParseVariableString,
        subscribe,
        OutputStatusService;

    var mockData = {
        job_slice_count: 2,
        job_slice_number: 2,
        labels: {
            SLICE_JOB: 'foo'
        },
        tooltips: {
            SLICE_JOB_DETAILS: 'bar'
        }
    };
    let resource = {
        id: '147',
        type: 'playbook',
        model: {
            get: (obj) => {
                return obj.split('.').reduce((i,o) => i && i[o] || null, mockData);
            },
            has: jasmine.createSpy('has'),
            options: jasmine.createSpy('options'),
        },
        events: {},
        ws: {}
    };

    beforeEach(angular.mock.module('at.features.output', ($provide) => {
        state = {
            params: {
                job_search: {}
            },
            go: jasmine.createSpy('go'),
            includes: jasmine.createSpy('includes')
        }

        OutputStrings = {
            get: (obj) => {
                return obj.split('.').reduce((i,o) => i && i[o] || null, mockData);
            },
        }

        OutputStatusService = {
            subscribe: jasmine.createSpy('subscribe')
        };

        ProcessErrors = jasmine.createSpy('ProcessErrors');
        Wait = jasmine.createSpy('Wait');
        Prompt = jasmine.createSpy('Prompt');

        $provide.value('state', state);
        $provide.value('ProcessErrors', ProcessErrors);
        $provide.value('Wait', Wait);
        $provide.value('Prompt', Prompt);
        $provide.value('OutputStrings', OutputStrings);
        $provide.value('ParseVariableString', angular.noop);
        $provide.value('OutputStatusService', OutputStatusService);

        $provide.provider('$stateProvider', { '$get': function() { return function() {}; } });
        $provide.value('$stateExtender', { addState: jasmine.createSpy('addState'), });
        $provide.value('$stateRegistry', { register: jasmine.createSpy('regster'), });
        $provide.value('sanitizeFilter', angular.noop);
        $provide.value('subscribe', subscribe);
        $provide.value('moment', moment);
        $provide.value('longDateFilter', angular.noop);
    }));

    beforeEach(angular.mock.inject(function($injector, $componentController, $rootScope, $httpBackend, _state_, _OutputStrings_, _ParseVariableString_, _Prompt_, _ProcessErrors_, _Wait_, _OutputStatusService_){
        scope = $rootScope.$new();
        state = _state_;
        OutputStrings = _OutputStrings_;
        Prompt = _Prompt_;
        filter = $injector.get("$filter");
        ProcessErrors = _ProcessErrors_;
        Wait = _Wait_;
        ParseVariableString = _ParseVariableString_;
        httpBackend = $httpBackend;
        OutputStatusService = _OutputStatusService_;

        JobDetails = $componentController('atJobDetails', {
            $scope: scope,
            $state: state,
            OutputStrings: OutputStrings,
            ProcessErrors: ProcessErrors,
            Wait: Wait,
            Prompt: Prompt,
            $filter: filter,
            Wait: Wait,
            ParseVariableString: ParseVariableString,
            httpBackend: httpBackend,
            OutputStatusService: OutputStatusService,
        }, {resource: resource});
        JobDetails.$onInit();
    }));

    describe('JobDetails Component', () => {
        it('is created successfully', () => {
            expect(JobDetails).toBeDefined();
        });
        it('has method "sliceJobDetails"', () => {
            expect(JobDetails.sliceJobDetails).toBeDefined();
        });
        describe('splitJobDetails method', () => {
            it('returned values are strings', () => {
                const result = JobDetails.sliceJobDetails;
                const { label, offset, tooltip } = result;
                expect(offset).toEqual('2/2');
                expect(label).toEqual('foo');
                expect(tooltip).toEqual('bar');
            });
            it('returns null if label, offset, or tooltip is undefined', () => {
                mockData = {
                    job_slice_count: 2,
                    job_slice_number: 2,
                    labels: {
                        SPLIT_JOB: null
                    },
                    tooltips: {
                        SPLIT_JOB_DETAILS: null
                    }
                };
                JobDetails.$onInit();
                const result = JobDetails.sliceJobDetails;
                expect(result).toBeNull();
            });
            it('returns null if job_slice_count is undefined or null', () =>  {
                mockData = {
                    job_slice_count: null,
                    job_slice_number: 2,
                    labels: {
                        SPLIT_JOB: 'foo'
                    },
                    tooltips: {
                        SPLIT_JOB_DETAILS: 'bar'
                    }
                };
                JobDetails.$onInit();
                const result = JobDetails.sliceJobDetails;
                expect(result).toBeNull();
            });
            it('returns null if job_slice_number is undefined or null', () =>  {
                mockData = {
                    job_slice_count: 2,
                    job_slice_number: null,
                    labels: {
                        SPLIT_JOB: 'foo'
                    },
                    tooltips: {
                        SPLIT_JOB_DETAILS: 'bar'
                    }
                };
                JobDetails.$onInit();
                const result = JobDetails.sliceJobDetails;
                expect(result).toBeNull();
            });
            it('returns null if job is a non-sliced job', () =>  {
                mockData = {
                    job_slice_count: 1,
                    job_slice_number: null,
                    labels: {
                        SPLIT_JOB: 'foo'
                    },
                    tooltips: {
                        SPLIT_JOB_DETAILS: 'bar'
                    }
                };
                JobDetails.$onInit();
                const result = JobDetails.sliceJobDetails;
                expect(result).toBeNull();
            });
        });
    });
});