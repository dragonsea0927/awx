/*************************************************
 * Copyright (c) 2016 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/
import ReconnectingWebSocket from 'reconnectingwebsocket';
export default
['$rootScope', '$location', '$log','$state', '$q', 'i18n',
    function ($rootScope, $location, $log, $state, $q, i18n) {
        var needsResubscribing = false,
        socketPromise = $q.defer();
        return {
            init: function() {
                var self = this,
                    host = window.location.host,
                    protocol,
                    url;

                if($location.protocol() === 'http'){
                    protocol = 'ws';
                }
                if($location.protocol() === 'https'){
                    protocol = 'wss';
                }
                url = `${protocol}://${host}/websocket/`;

                if (!$rootScope.sessionTimer || ($rootScope.sessionTimer && !$rootScope.sessionTimer.isExpired())) {

                    $log.debug('Socket connecting to: ' + url);
                    self.socket = new ReconnectingWebSocket(url, null, {
                        timeoutInterval: 3000,
                        maxReconnectAttempts: 10                    });

                    self.socket.onopen = function () {
                        $log.debug("Websocket connection opened. Socket readyState: " + self.socket.readyState);
                        socketPromise.resolve();
                        self.checkStatus();
                        if(needsResubscribing){
                            self.subscribe(self.getLast());
                            needsResubscribing = false;
                        }

                    };

                    self.socket.onerror = function (error) {
                        self.checkStatus();
                        $log.debug('Websocket Error Logged: ' + error); //log errors
                    };

                    self.socket.onconnecting = function () {
                        self.checkStatus();
                        $log.debug('Websocket reconnecting');
                        needsResubscribing = true;
                    };

                    self.socket.onclose = function () {
                        self.checkStatus();
                        $log.debug(`Websocket disconnected`);
                    };

                    self.socket.onmessage = this.onMessage;

                    return self.socket;
                }
                else {
                    // encountered expired token, redirect to login page
                    $rootScope.sessionTimer.expireSession('idle');
                    $location.url('/login');
                }
            },
            onMessage: function(e){
                // Function called when messages are received on by the UI from
                // the API over the websocket. This will route each message to
                // the appropriate controller for the current $state.
                $log.debug('Received From Server: ' + e.data);

                var data = JSON.parse(e.data), str = "";
                if(data.group_name==="jobs" && !('status' in data)){
                    // we know that this must have been a
                    // summary complete message b/c status is missing.
                    // A an object w/ group_name === "jobs" AND a 'status' key
                    // means it was for the event: status_changed.
                    $log.debug('Job summary_complete ' + data.unified_job_id);
                    $rootScope.$broadcast('ws-jobs-summary', data);
                    return;
                }
                else if(data.group_name==="job_events"){
                    // The naming scheme is "ws" then a
                    // dash (-) and the group_name, then the job ID
                    // ex: 'ws-jobs-<jobId>'
                    str = `ws-${data.group_name}-${data.job}`;
                }
                else if(data.group_name==="ad_hoc_command_events"){
                    // The naming scheme is "ws" then a
                    // dash (-) and the group_name, then the job ID
                    // ex: 'ws-jobs-<jobId>'
                    str = `ws-${data.group_name}-${data.ad_hoc_command}`;
                }
                else if(data.group_name==="control"){
                    // As of v. 3.1.0, there is only 1 "control"
                    // message, which is for expiring the session if the
                    // session limit is breached.
                    $log.debug(data.reason);
                    $rootScope.sessionTimer.expireSession('session_limit');
                    $state.go('signOut');
                }
                else {
                    // The naming scheme is "ws" then a
                    // dash (-) and the group_name.
                    // ex: 'ws-jobs'
                    str = `ws-${data.group_name}`;
                }
                $rootScope.$broadcast(str, data);
            },
            disconnect: function(){
                if(this.socket){
                    this.socket.close();
                    delete this.socket;
                    console.log("Socket deleted: "+this.socket);
                }
            },
            subscribe: function(state){
                // Subscribe is used to tell the API that the UI wants to
                // listen for specific messages. A subscription object could
                // look like {"groups":{"jobs": ["status_changed", "summary"]}.
                // This is used by all socket-enabled $states
                this.emit(JSON.stringify(state.data.socket));
                this.setLast(state);
            },
            unsubscribe: function(state){
                // Unsubscribing tells the API that the user is no longer on
                // on a socket-enabled page, and sends an empty groups object
                // to the API: {"groups": {}}.
                // This is used for all pages that are socket-disabled
                if(this.requiresNewSubscribe(state)){
                    this.emit(JSON.stringify(state.data.socket) || JSON.stringify({"groups": {}}));
                }
                this.setLast(state);
            },
            setLast: function(state){
                this.last = state;
            },
            getLast: function(){
                return this.last;
            },
            requiresNewSubscribe(state){
                // This function is used for unsubscribing. If the last $state
                // required an "unsubscribe", then we don't need to unsubscribe
                // again, b/c the UI is already unsubscribed from all groups
                if (this.getLast() !== undefined){
                    if( _.isEmpty(state.data.socket.groups) && _.isEmpty(this.getLast().data.socket.groups)){
                        return false;
                    }
                    else {
                        return true;
                    }
                }
                else {
                    return true;
                }
            },
            checkStatus: function() {
                // Function for changing the socket indicator icon in the nav bar
                var self = this;
                if(self){
                    if(self.socket){
                        if (self.socket.readyState === 0 ) {
                            $rootScope.socketStatus = 'connecting';
                            $rootScope.socketTip = i18n._(`Live events: attempting to connect to the ${$rootScope.BRAND_NAME} server.`);
                        }
                        else if (self.socket.readyState === 1){
                            $rootScope.socketStatus = 'ok';
                            $rootScope.socketTip = i18n._("Live events: connected. Pages containing job status information will automatically update in real-time.");
                        }
                        else if (self.socket.readyState === 2 || self.socket.readyState === 3 ){
                            $rootScope.socketStatus = 'error';
                            $rootScope.socketTip = i18n._(`Live events: error connecting to the ${$rootScope.BRAND_NAME} server.`);
                        }
                        return;
                    }
                }

            },
            emit: function(data, callback) {
                // Function used for sending objects to the API over the
                // websocket.
                var self = this;
                socketPromise.promise.then(function(){
                    if(self.socket.readyState === 0){
                        $log.debug('Unable to send message, waiting 500ms to resend. Socket readyState: ' + self.socket.readyState);
                        setTimeout(function(){
                            self.subscribe(self.getLast());
                        }, 500);
                    }
                    else if(self.socket.readyState === 1){
                        self.socket.send(data, function () {
                            var args = arguments;
                            self.scope.$apply(function () {
                                if (callback) {
                                    callback.apply(self.socket, args);
                                }
                            });
                        });
                        $log.debug('Sent to Websocket Server: ' + data);
                    }
                });
            },
            addStateResolve: function(state, id){
                // This function is used for add a state resolve to all states,
                // socket-enabled AND socket-disabled, and whether the $state
                // requires a subscribe or an unsubscribe
                var self = this;
                socketPromise.promise.then(function(){
                    if(!state.data || !state.data.socket){
                        _.merge(state.data, {socket: {groups: {}}});
                        self.unsubscribe(state);
                    }
                    else{
                        if(state.data && state.data.socket && state.data.socket.groups.hasOwnProperty( "job_events")){
                            state.data.socket.groups.job_events = [id];
                        }
                        if(state.data && state.data.socket && state.data.socket.groups.hasOwnProperty( "ad_hoc_command_events")){
                            state.data.socket.groups.ad_hoc_command_events = [id];
                        }
                        if(state.data && state.data.socket && state.data.socket.groups.hasOwnProperty( "workflow_events")){
                            state.data.socket.groups.workflow_events = [id];
                        }
                        self.subscribe(state);
                    }
                    return true;
                });
            }
        };
    }];
