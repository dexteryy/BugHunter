/**
 * Copyright (C) 2011, Dexter.Yy, MIT License
 *
 * @import lib/oz.js
 * @import mod/lang.js
 */
define("event", ["lang"], function(_){

    var fnQueue = _.fnQueue,
        slice = Array.prototype.slice;

    function Promise(opt){
        if (opt) {
            this.subject = opt.subject;
        }
        this.doneHandlers = fnQueue();
        this.failHandlers = fnQueue();
        this.observeHandlers = fnQueue();
        this._alterQueue = fnQueue();
        this._lastQueue = this.doneHandlers;
        this.status = 0;
        this._argsCache = [];
    }

    var actors = Promise.prototype = {

        then: function(handler, errorHandler){
            var _status = this.status;
            if (errorHandler) {
                if (_status === 2) {
                    this._resultCache = errorHandler.apply(this, this._argsCache);
                } else if (!_status) {
                    this.failHandlers.push(errorHandler);
                    this._lastQueue = this.failHandlers;
                }
            }
            if (handler) {
                if (_status === 1) {
                    this._resultCache = handler.apply(this, this._argsCache);
                } else if (!_status) {
                    this.doneHandlers.push(handler);
                    this._lastQueue = this.doneHandlers;
                }
            }
            return this;
        },

        done: function(handler){
            return this.then(handler);
        },

        fail: function(handler){
            return this.then(false, handler);
        },

        cancel: function(handler, errorHandler){
            if (handler) {
                this.doneHandlers.clear(handler);
            }
            if (errorHandler) {
                this.failHandlers.clear(errorHandler);
            }
            return this;            
        },

        bind: function(handler){
            if (this.status) {
                handler.apply(this, this._argsCache);
            }
            this.observeHandlers.push(handler);
            return this;
        },

        unbind: function(handler){
            this.observeHandlers.clear(handler);
            return this;            
        },

        fire: function(params){
            params = params || [];
            this.observeHandlers.apply(this, params);
            var onceHandlers = this.doneHandlers;
            this.doneHandlers = this._alterQueue;
            onceHandlers.apply(this, params);
            onceHandlers.length = 0;
            this._alterQueue = onceHandlers;
            return this;
        },

        error: function(params){
            params = params || [];
            this.observeHandlers.apply(this, params);
            var onceHandlers = this.failHandlers;
            this.failHandlers = this._alterQueue;
            onceHandlers.apply(this, params); 
            onceHandlers.length = 0;
            this._alterQueue = onceHandlers;
            return this;
        },

        resolve: function(params){
            this.status = 1;
            this._argsCache = params;
            return this.fire(params);
        },

        reject: function(params){
            this.status = 2;
            this._argsCache = params;
            return this.error(params);
        },

        reset: function(){
            this.status = 0;
            this._argsCache = [];
            this.doneHandlers.length = 0;
            this.failHandlers.length = 0;
            return this;
        },

        follow: function(){
            var next = new Promise();
            next._prevActor = this;
            if (this.status) {
                pipe(this._resultCache, next);
            } else {
                var handler = this._lastQueue.pop();
                if (handler) {
                    this._lastQueue.push(function(){
                        return pipe(handler.apply(this, arguments), next);
                    });
                }
            }
            return next;
        },

        end: function(){
            return this._prevActor;
        },

        all: function(){
            this._count = this._total;
            return this;
        },

        any: function(){
            this._count = 1;
            return this;
        },

        some: function(n){
            this._count = n;
            return this;
        }

    };

    actors.wait = actors.then;
    actors.on = actors.bind;
    actors.removeListener = actors.unbind;
    actors.emit = actors.fire;

    function when(n){
        var mutiArgs = [],
            mutiPromise = new Promise();
        mutiPromise._count = mutiPromise._total = arguments.length;
        Array.prototype.forEach.call(arguments, function(promise, i){
            var mutiPromise = this;
            promise.then(callback, callback);
            function callback(params){
                mutiArgs[i] = params;
                if (--mutiPromise._count === 0) {
                    mutiPromise.resolve.call(mutiPromise, mutiArgs);
                }
            }
        }, mutiPromise);
        return mutiPromise;
    }

    function pipe(prev, next){
        if (prev && prev.then) {
            prev.then(function(){
                next.resolve(slice.call(arguments));
            }, function(){
                next.reject(slice.call(arguments));
            });
        }
        return prev;
    }

    function dispatchFactory(i){
        return function(subject){
            var promise = this.lib[subject];
            if (!promise) {
                promise = this.lib[subject] = new Promise({ subject: subject });
            }
            promise[i].apply(promise, slice.call(arguments, 1));
            return this;
        };
    }

    function Event(){
        this.lib = {};
    }

    Event.prototype = (function(methods){
        for (var i in actors) {
            methods[i] = dispatchFactory(i);
        }
        return methods;
    })({});

    Event.prototype.promise = function(subject){
        var promise = this.lib[subject];
        if (!promise) {
            promise = this.lib[subject] = new Promise({ subject: subject });
        }
        return promise;
    };

    Event.prototype.when = function(){
        var args = [];
        for (var i = 0, l = arguments.length; i < l; i++) {
            args.push(this.promise(arguments[i]));
        }
        return when.apply(this, args);
    };

    function exports(){
        return new Event();
    }

    exports.Promise = Promise;
    exports.when = when;

    return exports;
});
