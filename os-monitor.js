// OS Monitoring for Node.js
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var util = require('util'), os = require('os'), stream = require('readable-stream'), _ = require('underscore'), critical = os.cpus().length, defaults = {
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
// constructor
var Monitor = /** @class */ (function (_super) {
    __extends(Monitor, _super);
    function Monitor() {
        var _this = _super.call(this, { highWaterMark: 102400 }) || this;
        _this._monitorState = {
            running: false,
            ended: false,
            streamBuffering: true,
            interval: undefined,
            config: _.clone(defaults)
        };
        return _this;
    }
    Monitor.prototype.sendEvent = function (event, obj) {
        var eventObject = _.extend({ type: event, timestamp: Math.floor(_.now() / 1000) }, obj);
        // for EventEmitter
        this.emit(event, eventObject);
        // for readable Stream
        if (this.config().stream && this._monitorState.streamBuffering) {
            var prettyJSON = os.EOL + JSON.stringify(eventObject, null, 2);
            if (!this.push(prettyJSON)) {
                this._monitorState.streamBuffering = false;
            }
        }
    };
    Monitor.prototype._isEnded = function () {
        return !!this._monitorState.ended;
    };
    Monitor.prototype.start = function (options) {
        var _this = this;
        if (this._isEnded()) {
            throw new Error("monitor has been ended by .destroy() method");
        }
        this.stop()
            .config(options);
        var cycle = function () {
            var info = {
                loadavg: os.loadavg(),
                uptime: os.uptime(),
                freemem: os.freemem(),
                totalmem: os.totalmem()
            }, config = _this.config(), freemem = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;
            if (!config.silent) {
                _this.sendEvent('monitor', info);
            }
            if (info.loadavg[0] > config.critical1) {
                _this.sendEvent('loadavg1', info);
            }
            if (info.loadavg[1] > config.critical5) {
                _this.sendEvent('loadavg5', info);
            }
            if (info.loadavg[2] > config.critical15) {
                _this.sendEvent('loadavg15', info);
            }
            if (info.freemem < freemem) {
                _this.sendEvent('freemem', info);
            }
            if (Number(config.uptime) && info.uptime > Number(config.uptime)) {
                _this.sendEvent('uptime', info);
            }
        };
        if (this.config().immediate) {
            process.nextTick(cycle);
        }
        this._monitorState.interval = setInterval(cycle, this.config().delay);
        if (!this.isRunning()) {
            this._monitorState.running = true;
            this.sendEvent('start');
        }
        return this;
    };
    Monitor.prototype.stop = function () {
        clearInterval(this._monitorState.interval);
        if (this.isRunning()) {
            this._monitorState.running = false;
            this.sendEvent('stop');
        }
        return this;
    };
    Monitor.prototype.reset = function () {
        this.sendEvent('reset');
        this[this.isRunning() ? 'start' : 'config'](_.clone(defaults));
        return this;
    };
    Monitor.prototype.destroy = function (err) {
        if (!this._isEnded()) {
            this.sendEvent('destroy');
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
            this.sendEvent('config', { options: _.clone(options) });
        }
        return this._monitorState.config;
    };
    Monitor.prototype.isRunning = function () {
        return !!this._monitorState.running;
    };
    Monitor.prototype.throttle = function (event, handler, wait) {
        var self = this, _handler = _.wrap(handler, function (fn) {
            if (self.isRunning()) {
                fn.apply(this, _.toArray(arguments).slice(1));
            }
        });
        return self.on.call(self, event, _.throttle(_handler, wait || self.config().throttle));
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
    Monitor.prototype.hours = function (n) {
        return this._sanitizeNumber(n * this.minutes(60));
    };
    Monitor.prototype.days = function (n) {
        return this._sanitizeNumber(n * this.hours(24));
    };
    return Monitor;
}(stream.Readable));
Monitor.prototype.version = '1.0.7';
// readable stream implementation requirement
Monitor.prototype._read = function () {
    this._monitorState.streamBuffering = true;
};
// expose OS module
Monitor.prototype.os = os;
// expose Underscore
Monitor.prototype._ = _;
// expose main class
Monitor.prototype.Monitor = Monitor;
module.exports = new Monitor();
