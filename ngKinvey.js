(function() {
    'use strict';

    angular
        .module('ngKinvey', ['ngResource', 'ngBase64'])

        .provider('$kinvey', ['$base64', function($base64) {

            var apiVersion = 3;

            var baseUrl = 'https://baas.kinvey.com/';
            var appdata = 'appdata/';
            var userdata = 'user/';
            var groupdata = 'group/';

            var headers = {
                user: {
                    'X-Kinvey-API-Version': apiVersion,
                    'Authorization': ''
                },
                basic: {
                    'X-Kinvey-API-Version': apiVersion,
                    'Authorization': ''
                }
            };

            var appKey;

            return {

                init: function(options) {
                    if(!options || !options.appKey || !options.appSecret) {
                        throw '$kinveyProvider.init requires an options object: {\'appId\':\'YOUR APP ID\',\'appSecret\':\'YOUR APP SECRET\'}';
                    }
                    appKey = options.appKey;
                    headers.user.Authorization = headers.basic.Authorization = 'Basic '+$base64.encode(options.appKey+':'+options.appSecret);
                },

                $get: ['$resource', '$http', '$q', function($resource, $http, $q) {
                    function handshake() {
                        var deferred = $q.defer();
                        $http.get(baseUrl + appdata + appKey, {
                            headers: headers.user
                        }).then(
                                function(response) {
                                    deferred.resolve(response.data);
                                },
                                function(error) {
                                    deferred.reject(error);
                                }
                            );
                        return deferred.promise;
                    }

                    var User = $resource(baseUrl + userdata + appKey + '/:_id', {_id: '@_id'} ,{
                        login: {
                            method: 'POST',
                            params: {
                                _id: 'login'
                            },
                            transformResponse: function(data) {
                                data = angular.fromJson(data);
                                if(!data.error) {
                                    headers.user.Authorization = 'Kinvey '+data._kmd.authtoken;
                                }
                                return new User(data);
                            },
                            headers: headers.user
                        },
                        current: {
                            method: 'GET',
                            params: {
                                _id: '_me'
                            },
                            headers: headers.user
                        },
                        logout: {
                            method: 'POST',
                            params: {
                                _id: '_logout'
                            },
                            transformResponse: function() {
                                headers.user.Authorization = headers.basic.Authorization;
                            },
                            headers: headers.user
                        },
                        signup: {
                            method: 'POST',
                            headers: headers.basic,
                            transformResponse: function(data) {

                                data = angular.fromJson(data);
                                if(!data.error) {
                                    headers.user.Authorization = 'Kinvey '+data._kmd.authtoken;
                                }
                                return new User(data);
                            }
                        },
                        get: {
                            method: 'GET',
                            headers: headers.user
                        },
                        save:   {
                            method:'PUT',
                            headers: headers.user
                        },
                        query:  {
                            method:'GET',
                            headers: headers.user,
                            isArray:true,
                            params: {
                                _id: ''
                            }
                        },
                        remove: {
                            method:'DELETE',
                            params: {
                                hard: true
                            },
                            headers: headers.user
                        },
                        delete: {
                            method:'DELETE',
                            params: {
                                hard: true
                            },
                            headers: headers.user
                        }
                    });

                    var Group = $resource(baseUrl + groupdata + appKey + '/:_id', {_id: '@_id'}, {
                        get: {
                            method: 'GET',
                            headers: headers.user
                        },
                        save: {
                            method: 'PUT',
                            headers: headers.user
                        },
                        delete: {
                            method: 'DELETE',
                            headers: headers.user
                        }
                    });

                    function Object(className) {
                        var retVal = $resource(baseUrl + appdata + appKey + '/' + className + '/:_id', {_id: '@_id'}, {
                            create: {
                                method: 'POST',
                                headers: headers.user,
                                params: {
                                    _id: ''
                                }
                            },
                            get: {
                                method: 'GET',
                                headers: headers.user
                            },
                            save: {
                                method: 'PUT',
                                headers: headers.user
                            },
                            delete: {
                                method: 'DELETE',
                                headers: headers.user
                            },
                            query: {
                                method: 'GET',
                                headers: headers.user,
                                isArray:true,
                                params: {
                                    _id: ''
                                }
                            }
                        });
                        var origGet = retVal.query;
                        retVal.query = function(a1, a2, a3, a4) {
                            /*
                             * This is a very hacky solution to protecting the '$' namespace
                             * inside queries so that mongo operators remain untouched. Hopefully
                             * one day a more elegant solution will come from Angular themselves.
                             */
                            if(a1.query) {
                                a1.query = JSON.stringify(a1.query);
                            }
                            return origGet(a1, a2, a3, a4);
                        };
                        return retVal;
                    }

                    return {
                        handshake: handshake,
                        User: User,
                        Group: Group,
                        Object: Object
                    };
                }]
            };
    }]);
})();