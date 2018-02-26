/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

/**
 *  @ngdoc function
 *  @name shared.function:RestServices
 *  @description
 *
 * A wrapper for angular's $http service. Post user authentication API requests should go through Rest rather than directly using $http. The goal is to decouple
 * the application from $http, allowing Rest or anything that provides the same methods to handle setting authentication headers and performing tasks such as checking
 * for an expired authentication token. Having this buffer between the application and $http will prove useful should the authentication scheme change.
 *
 * #.setUrl(<url>)
 *
 * Before calling an action methods (i.e. get, put, post, destroy, options) to send the request, call setUrl. Pass a string containing the URL endpoint and any parameters.
 * Note that $http will automaticall encode the URL, replacing spaces and special characters with appropriate %hex codes. Example URL values might include:
 *
 * ```
 *    /api/v2/inventories/9/
 *    /api/v2/credentials/?name=SSH Key&kind=ssh
 * ```
 *
 * When constructing the URL be sure to use the GetBasePath() method found in js/shared/Utilities.js. GetBasePath uses the response objects from /api and
 * /api/<version>/to construct the base portion of the path. This way the API version number and base endpoints are not hard-coded within the application.
 *
 * #Action methods: .get(), put(<JSON data object>), .post(<JSON data object>), .destroy(<JSON data object>), options()
 *
 * Use the method matching the REST action to be performed. In the case of put, post and destroy a JSON object can be passed as a parameter. If included,
 * it will be sent as part of the request.
 *
 * In every case a call to an action method returns a promise object, allowing the caller to pass reponse functions to the promise methods. The functions can inspect
 * the respoinse details and initiate action. For example:
 *
 * ```
 *     var url = GetBasePath('inventories') + $stateParams.id + '/';
 *     Rest.setUrl(url);
 *     Rest.get()
 *          .then(({data}) => {
 *             // review the data object and take action
 *         })
 *         .error(function(status, data) {
 *             // handle the error - typically a call to ProcessErrors() found in js/shared/Utitlties.js
 *         });
 * ```
 *
 * ##Options Reqeusts
 *
 * options() requests are used by the GetChoices() method found in js/shared/Utilities.js. Sending an Options request to an API endpoint returns an object that includes
 * possible values for fields that are typically presented in the UI as dropdowns or &lt;select&gt; elements. GetChoices will inspect the response object for the request
 * field and return an array of { label: 'Choice Label', value: 'choice 1' } objects.
 *
 */

export default
    ['$http', '$rootScope', '$q',
        function ($http, $rootScope, $q) {
            return {

                headers: {},

                setUrl: function (url) {
                    // Ensure that a trailing slash is present at the end of the url (before query params, etc)
                    this.url = url.replace(/\/?(\?|#|$)/, '/$1');
                },
                checkExpired: function () {
                    return ($rootScope.sessionTimer) ? $rootScope.sessionTimer.isExpired() : false;
                },
                pReplace: function () {
                    //in our url, replace :xx params with a value, assuming
                    //we can find it in user supplied params.
                    var key, rgx;
                    for (key in this.params) {
                        rgx = new RegExp("\\:" + key, 'gm');
                        if (rgx.test(this.url)) {
                            this.url = this.url.replace(rgx, this.params[key]);
                            delete this.params[key];
                        }
                    }
                },
                createResponse: function (data, status) {
                    // Simulate an http response when a token error occurs
                    // http://stackoverflow.com/questions/18243286/angularjs-promises-simulate-http-promises

                    var promise = $q.reject({
                        data: data,
                        status: status
                    });
                    promise.success = function (fn) {
                        promise.then(function (response) {
                            fn(response.data, response.status);
                        }, null);
                        return promise;
                    };
                    promise.error = function (fn) {
                        promise.then(null, function (response) {
                            fn(response.data, response.status);
                        });
                        return promise;
                    };
                    return promise;
                },

                setHeader: function (hdr) {
                    // Pass in { key: value } pairs to be added to the header
                    for (var h in hdr) {
                        this.headers[h] = hdr[h];
                    }
                },
                get: function (args) {
                    args = (args) ? args : {};
                    this.params = (args.params) ? args.params : null;
                    this.pReplace();
                    var expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        return $http({
                            method: 'GET',
                            url: this.url,
                            headers: this.headers,
                            params: this.params
                        });
                    }
                },
                post: function (data) {
                    var expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        return $http({
                            method: 'POST',
                            url: this.url,
                            headers: this.headers,
                            data: data
                        });
                    }
                },
                put: function (data) {
                    var expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        return $http({
                            method: 'PUT',
                            url: this.url,
                            headers: this.headers,
                            data: data
                        });
                    }
                },
                patch: function (data) {
                    var expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        return $http({
                            method: 'PATCH',
                            url: this.url,
                            headers: this.headers,
                            data: data
                        });
                    }
                },
                destroy: function (data) {
                    var expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        return $http({
                            method: 'DELETE',
                            url: this.url,
                            headers: this.headers,
                            data: data
                        });
                    }
                },
                options: function (cache) {
                    var params,
                        expired = this.checkExpired();
                    if (expired) {
                        return this.createResponse({
                            detail: 'Session is expired'
                        }, 401);
                    } else {
                        params = {
                            method: 'OPTIONS',
                            url: this.url,
                            headers: this.headers,
                            data: '',
                            cache: (cache ? true : false)
                        };
                        return $http(params);
                    }
                }
            };
        }
    ];
