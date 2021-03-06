// OS Monitoring for Node.js
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// Copyright (c) 2012-2021 lfortin
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
var os = require('os'), events = require('events'), stream = require('readable-stream'), _ = require('underscore'), version = require('./package.json').version, critical = os.cpus().length, defaults = function () {
    return {
        delay: 3000,
        critical1: critical,
        critical5: critical,
        critical15: critical,
        freemem: 0,
        uptime: 0,
        silent: false,
        stream: false,
        immediate: false
    };
};
var Monitor = /** @class */ (function (_super) {
    __extends(Monitor, _super);
    function Monitor() {
        var _this = _super.call(this, { highWaterMark: 102400 }) || this;
        // expose OS module
        _this.os = os;
        // expose Underscore
        _this._ = _;
        _this._monitorState = {
            running: false,
            ended: false,
            streamBuffering: true,
            interval: undefined,
            config: defaults(),
            throttled: []
        };
        return _this;
    }
    Object.defineProperty(Monitor.prototype, "version", {
        get: function () {
            return version;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Monitor.prototype, "constants", {
        get: function () {
            return {
                events: {
                    MONITOR: 'monitor',
                    UPTIME: 'uptime',
                    FREEMEM: 'freemem',
                    LOADAVG1: 'loadavg1',
                    LOADAVG5: 'loadavg5',
                    LOADAVG15: 'loadavg15',
                    START: 'start',
                    STOP: 'stop',
                    CONFIG: 'config',
                    RESET: 'reset',
                    DESTROY: 'destroy'
                }
            };
        },
        enumerable: false,
        configurable: true
    });
    // readable stream implementation requirement
    Monitor.prototype._read = function () {
        this._monitorState.streamBuffering = true;
    };
    Monitor.prototype.sendEvent = function (event, obj) {
        if (obj === void 0) { obj = {}; }
        var eventObject = _.extend({ type: event, timestamp: Math.floor(_.now() / 1000) }, obj);
        // for EventEmitter
        this.emit(event, eventObject);
        // for readable Stream
        if (this.config().stream && this._monitorState.streamBuffering) {
            var prettyJSON = JSON.stringify(eventObject, null, 2);
            if (!this.push("" + os.EOL + prettyJSON)) {
                this._monitorState.streamBuffering = false;
            }
        }
        return this;
    };
    Monitor.prototype._cycle = function () {
        var info = {
            loadavg: os.loadavg(),
            uptime: os.uptime(),
            freemem: os.freemem(),
            totalmem: os.totalmem()
        }, config = this.config(), freemem = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;
        if (!config.silent) {
            this.sendEvent(this.constants.events.MONITOR, info);
        }
        if (info.loadavg[0] > config.critical1) {
            this.sendEvent(this.constants.events.LOADAVG1, info);
        }
        if (info.loadavg[1] > config.critical5) {
            this.sendEvent(this.constants.events.LOADAVG5, info);
        }
        if (info.loadavg[2] > config.critical15) {
            this.sendEvent(this.constants.events.LOADAVG15, info);
        }
        if (info.freemem < freemem) {
            this.sendEvent(this.constants.events.FREEMEM, info);
        }
        if (Number(config.uptime) && info.uptime > Number(config.uptime)) {
            this.sendEvent(this.constants.events.UPTIME, info);
        }
    };
    Monitor.prototype.start = function (options) {
        var _this = this;
        if (this._isEnded()) {
            throw new Error("monitor has been ended by .destroy() method");
        }
        this.stop()
            .config(options);
        if (this.config().immediate) {
            process.nextTick(function () { return _this._cycle(); });
        }
        this._monitorState.interval = setInterval(function () { return _this._cycle(); }, this.config().delay);
        if (!this.isRunning()) {
            this._monitorState.running = true;
            this.sendEvent(this.constants.events.START);
        }
        return this;
    };
    Monitor.prototype.stop = function () {
        clearInterval(this._monitorState.interval);
        if (this.isRunning()) {
            this._monitorState.running = false;
            this.sendEvent(this.constants.events.STOP);
        }
        return this;
    };
    Monitor.prototype.reset = function () {
        this.sendEvent(this.constants.events.RESET);
        this[this.isRunning() ? 'start' : 'config'](defaults());
        return this;
    };
    ;
    Monitor.prototype.destroy = function (err) {
        if (!this._isEnded()) {
            this.sendEvent(this.constants.events.DESTROY);
            this.stop();
            if (this instanceof stream.Readable) {
                this.emit('close');
                if (_.isFunction(stream.Readable.prototype.destroy)) {
                    stream.Readable.prototype.destroy.apply(this, [err]);
                }
                this.push(null);
            }
            this._monitorState.ended = true;
        }
        return this;
    };
    Monitor.prototype.config = function (options) {
        if (_.isObject(options)) {
            _.extend(this._monitorState.config, options);
            this.sendEvent(this.constants.events.CONFIG, { options: _.clone(options) });
        }
        return this._monitorState.config;
    };
    Monitor.prototype.isRunning = function () {
        return !!this._monitorState.running;
    };
    Monitor.prototype._isEnded = function () {
        return !!this._monitorState.ended;
    };
    Monitor.prototype.throttle = function (event, handler, wait) {
        var self = this, _handler = _.wrap(handler, function (fn) {
            if (self.isRunning()) {
                fn.apply(self, _.toArray(arguments).slice(1));
            }
        }), throttledFn = _.throttle(_handler, wait || this.config().throttle);
        this._monitorState.throttled.push({ originalFn: handler, throttledFn: throttledFn });
        return this.on(event, throttledFn);
    };
    Monitor.prototype.unthrottle = function (event, handler) {
        var throttled = this._monitorState.throttled;
        for (var i = throttled.length - 1; i >= 0; i--) {
            var pair = throttled[i];
            if (pair.originalFn === handler) {
                this.removeListener(event, pair.throttledFn);
                throttled.splice(i, 1);
            }
        }
        return this;
    };
    Monitor.prototype.when = function (event) {
        var deferred = new Thenable();
        var wrappedDeferred;
        this.once(event, function (eventObj) {
            deferred.resolve(eventObj);
        });
        try {
            wrappedDeferred = Promise.resolve(deferred);
            return wrappedDeferred;
        }
        catch (err) {
            return deferred;
        }
    };
    /*
    * convenience methods
    */
    Monitor.prototype._sanitizeNumber = function (n) {
        if (!_.isNumber(n)) {
            throw new Error("Number expected");
        }
        if (!n || n < 0) {
            throw new Error("Number must be greater than 0");
        }
        // Math.pow(2, 31);
        if (n >= 2147483648) {
            throw new Error("Number must be smaller than 2147483648");
        }
        return n;
    };
    Monitor.prototype.seconds = function (n) {
        return this._sanitizeNumber(n * 1000);
    };
    Monitor.prototype.minutes = function (n) {
        return this._sanitizeNumber(n * this.seconds(60));
    };
    ;
    Monitor.prototype.hours = function (n) {
        return this._sanitizeNumber(n * this.minutes(60));
    };
    ;
    Monitor.prototype.days = function (n) {
        return this._sanitizeNumber(n * this.hours(24));
    };
    ;
    return Monitor;
}(stream.Readable));
;
var Thenable = /** @class */ (function (_super) {
    __extends(Thenable, _super);
    function Thenable() {
        var _this = _super.call(this) || this;
        _this._thenableState = {
            state: Thenable.constants.state.PENDING,
            result: undefined
        };
        return _this;
    }
    Thenable.prototype.resolve = function (result) {
        var state = Thenable.constants.state;
        if (this._thenableState.state === state.PENDING) {
            this._thenableState.state = state.FULFILLED;
            this._thenableState.result = result;
            this.emit('resolve', result);
        }
        return this;
    };
    Thenable.prototype.reject = function (error) {
        var state = Thenable.constants.state;
        if (this._thenableState.state === state.PENDING) {
            this._thenableState.state = state.REJECTED;
            this._thenableState.result = error;
            this.emit('reject', error);
        }
        return this;
    };
    Thenable.prototype.then = function (onFulfilled, onRejected) {
        var _this = this;
        var state = Thenable.constants.state;
        if (this._thenableState.state === state.PENDING) {
            this.once('resolve', function (result) {
                _this._callOnFulfilled(onFulfilled);
            });
            this.once('reject', function (error) {
                _this._callOnRejected(onRejected);
            });
        }
        this._callOnFulfilled(onFulfilled);
        this._callOnRejected(onRejected);
    };
    Thenable.prototype.catch = function (onRejected) {
        return this.then(undefined, onRejected);
    };
    Thenable.prototype._callOnFulfilled = function (onFulfilled) {
        var state = Thenable.constants.state;
        if (onFulfilled && this._thenableState.state === state.FULFILLED) {
            onFulfilled(this._thenableState.result);
        }
    };
    Thenable.prototype._callOnRejected = function (onRejected) {
        var state = Thenable.constants.state;
        if (onRejected && this._thenableState.state === state.REJECTED) {
            onRejected(this._thenableState.result);
        }
    };
    Thenable.constants = {
        state: {
            PENDING: 'pending',
            FULFILLED: 'fulfilled',
            REJECTED: 'rejected'
        }
    };
    return Thenable;
}(events.EventEmitter));
// expose Thenable class
Monitor.prototype.Thenable = Thenable;
// expose main Monitor class
Monitor.prototype.Monitor = Monitor;
module.exports = new Monitor();
