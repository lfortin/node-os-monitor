"use strict";
// OS Monitoring for Node.js
// Copyright (c) 2012-2023 lfortin
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
const os = require('node:os'), fs = require('node:fs'), stream = require('node:stream'), throttle = require('lodash.throttle'), { version } = require('./package.json'), critical = os.cpus().length;
var EventType;
(function (EventType) {
    EventType["MONITOR"] = "monitor";
    EventType["UPTIME"] = "uptime";
    EventType["FREEMEM"] = "freemem";
    EventType["DISKFREE"] = "diskfree";
    EventType["LOADAVG1"] = "loadavg1";
    EventType["LOADAVG5"] = "loadavg5";
    EventType["LOADAVG15"] = "loadavg15";
    EventType["START"] = "start";
    EventType["STOP"] = "stop";
    EventType["CONFIG"] = "config";
    EventType["RESET"] = "reset";
    EventType["DESTROY"] = "destroy";
})(EventType || (EventType = {}));
class Monitor extends stream.Readable {
    constructor() {
        super({ highWaterMark: 102400 });
    }
    get version() {
        return version;
    }
    get constants() {
        return {
            events: EventType,
            defaults: {
                delay: 3000,
                critical1: critical,
                critical5: critical,
                critical15: critical,
                freemem: 0,
                uptime: 0,
                diskfree: {},
                silent: false,
                stream: false,
                immediate: false
            }
        };
    }
    // expose main Monitor class
    Monitor = Monitor;
    // expose OS module
    os = os;
    _monitorState = {
        running: false,
        ended: false,
        streamBuffering: true,
        interval: undefined,
        config: Monitor.prototype.constants.defaults,
        throttled: []
    };
    // readable stream implementation requirement
    _read() {
        this._monitorState.streamBuffering = true;
    }
    sendEvent(event, obj = {}) {
        const eventObject = { ...obj, type: event, timestamp: Math.floor(Date.now() / 1000) };
        // for EventEmitter
        this.emit(event, eventObject);
        // for readable Stream
        if (this._readableState.flowing) {
            this._monitorState.streamBuffering = true;
        }
        if (this.config().stream && this._monitorState.streamBuffering) {
            const prettyJSON = JSON.stringify(eventObject, null, 2);
            if (!this.push(`${os.EOL}${prettyJSON}`) && !this._readableState.flowing) {
                this._monitorState.streamBuffering = false;
            }
        }
        return this;
    }
    _createInfoObject() {
        return {
            loadavg: os.loadavg(),
            uptime: os.uptime(),
            freemem: os.freemem(),
            totalmem: os.totalmem()
        };
    }
    async _cycle() {
        const info = this._createInfoObject(), config = this.config();
        if (config.diskfree && Object.keys(config.diskfree).length) {
            const deferreds = [];
            for (const path in config.diskfree) {
                const deferredStats = fs.promises.statfs(path), deferred = deferredStats.then(stats => {
                    info.diskfree = Object.assign(info.diskfree || {}, { [path]: stats.bfree });
                }, (err) => {
                    this.emit('error', err);
                });
                deferreds.push(deferred);
            }
            await Promise.all(deferreds);
            for (const path in config.diskfree) {
                const dfConfig = config.diskfree[path];
                if (info.diskfree && info.diskfree[path] < dfConfig) {
                    this.sendEvent(this.constants.events.DISKFREE, info);
                }
            }
        }
        this._sendEvents(info);
    }
    _sendEvents(info) {
        const config = this.config(), freemem = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;
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
    }
    start(options) {
        if (this._isEnded()) {
            this.emit('error', new Error("monitor has been ended by .destroy() method"));
            return this;
        }
        if (options) {
            this._validateConfig(options);
        }
        this.stop()
            .config(options);
        if (this.config().immediate) {
            process.nextTick(() => this._cycle());
        }
        this._monitorState.interval = setInterval(() => this._cycle(), this.config().delay);
        this._monitorState.running = true;
        this.sendEvent(this.constants.events.START);
        return this;
    }
    stop() {
        clearInterval(this._monitorState.interval);
        if (this.isRunning()) {
            this._monitorState.running = false;
            this.sendEvent(this.constants.events.STOP);
        }
        return this;
    }
    reset() {
        this.sendEvent(this.constants.events.RESET);
        this[this.isRunning() ? 'start' : 'config'](this.constants.defaults);
        return this;
    }
    destroy(err) {
        if (!this._isEnded()) {
            this.sendEvent(this.constants.events.DESTROY);
            this.stop();
            this.emit('close');
            stream.Readable.prototype.destroy.apply(this, [err]);
            this._monitorState.ended = true;
        }
        return this;
    }
    config(options) {
        if (options !== null && typeof options === 'object') {
            this._validateConfig(options);
            Object.assign(this._monitorState.config, options);
            this.sendEvent(this.constants.events.CONFIG, { options: { ...options } });
        }
        return this._monitorState.config;
    }
    _validateConfig(options) {
        if (options.diskfree && Object.keys(options.diskfree).length && !fs.statfs) {
            throw new Error("diskfree not supported");
        }
    }
    isRunning() {
        return !!this._monitorState.running;
    }
    _isEnded() {
        return !!this._monitorState.ended;
    }
    throttle(event, handler, wait) {
        if (typeof handler !== 'function') {
            throw new Error("Handler must be a function");
        }
        const _handler = (eventObject) => {
            if (this.isRunning()) {
                handler.apply(this, [eventObject]);
            }
        }, throttledFn = throttle(_handler, wait || this.config().throttle);
        this._monitorState.throttled.push({ event: event, originalFn: handler, throttledFn: throttledFn });
        return this.on(event, throttledFn);
    }
    unthrottle(event, handler) {
        const { throttled } = this._monitorState;
        for (let i = throttled.length - 1; i >= 0; i--) {
            const pair = throttled[i];
            if (pair.event === event && pair.originalFn === handler) {
                this.removeListener(event, pair.throttledFn);
                throttled.splice(i, 1);
            }
        }
        return this;
    }
    when(event) {
        return new Promise((resolve) => {
            this.once(event, (eventObj) => resolve(eventObj));
        });
    }
    /*
    * convenience methods
    */
    _sanitizeNumber(n) {
        if (!Number.isInteger(n)) {
            throw new Error("Integer expected");
        }
        if (!n || n < 0) {
            throw new Error("Number must be greater than 0");
        }
        // Math.pow(2, 31);
        if (n >= 2147483648) {
            throw new Error("Number must be smaller than 2147483648");
        }
        return n;
    }
    seconds(n) {
        return this._sanitizeNumber(n * 1000);
    }
    minutes(n) {
        return this._sanitizeNumber(n * this.seconds(60));
    }
    hours(n) {
        return this._sanitizeNumber(n * this.minutes(60));
    }
    days(n) {
        return this._sanitizeNumber(n * this.hours(24));
    }
    blocks(bytes, blockSize = 1) {
        return Math.ceil(bytes / blockSize);
    }
    createMonitor() {
        return new Monitor();
    }
}
module.exports = new Monitor();
