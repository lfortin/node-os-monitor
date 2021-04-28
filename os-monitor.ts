// OS Monitoring for Node.js

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


const os       = require('os'),
      stream   = require('readable-stream'),
      _        = require('underscore'),
      critical: number = os.cpus().length,
      defaults: Function = (): ConfigObject => {
        return {
          delay     : 3000,
          critical1 : critical,
          critical5 : critical,
          critical15: critical,
          freemem   : 0,
          uptime    : 0,
          silent    : false,
          stream    : false,
          immediate : false
        };
      };

class Monitor extends stream.Readable {

  constructor() {
    super({highWaterMark: 102400});
  }

  public get version(): string {
    return '1.1.0';
  }

  public get constants(): MonitorConstants {
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
  }

  // expose OS module
  public os = os;

  // expose Underscore
  public _ = _;

  private _monitorState: MonitorState = {
    running: false,
    ended: false,
    streamBuffering: true,
    interval: undefined,
    config: defaults(),
    throttled: []
  };

  // readable stream implementation requirement
  private _read(): void {
    this._monitorState.streamBuffering = true;
  }

  public sendEvent(event: string, obj: InfoObject = {}): Monitor {
    let eventObject = _.extend({type: event, timestamp: Math.floor(_.now() / 1000)}, obj);
  
    // for EventEmitter
    this.emit(event, eventObject);
    // for readable Stream
    if(this.config().stream && this._monitorState.streamBuffering) {
      let prettyJSON = JSON.stringify(eventObject, null, 2);
      if(!this.push(`${os.EOL}${prettyJSON}`)) {
        this._monitorState.streamBuffering = false;
      }
    }

    return this;
  }

  private _cycle(): void {
    let info: InfoObject = {
      loadavg  : os.loadavg(),
      uptime   : os.uptime(),
      freemem  : os.freemem(),
      totalmem : os.totalmem()
    },
    config = this.config(),
    freemem  = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;

    if(!config.silent) {
      this.sendEvent(this.constants.events.MONITOR, info);
    }
    if(info.loadavg[0] > config.critical1) {
      this.sendEvent(this.constants.events.LOADAVG1, info);
    }
    if(info.loadavg[1] > config.critical5) {
      this.sendEvent(this.constants.events.LOADAVG5, info);
    }
    if(info.loadavg[2] > config.critical15) {
      this.sendEvent(this.constants.events.LOADAVG15, info);
    }
    if(info.freemem < freemem) {
      this.sendEvent(this.constants.events.FREEMEM, info);
    }
    if(Number(config.uptime) && info.uptime > Number(config.uptime)) {
      this.sendEvent(this.constants.events.UPTIME, info);
    }
  }

  public start(options?: ConfigObject): Monitor {
    if(this._isEnded()) {
      throw new Error("monitor has been ended by .destroy() method");
    }
  
    this.stop()
        .config(options);
    
    if(this.config().immediate) {
      process.nextTick(() => this._cycle());
    }
    this._monitorState.interval = setInterval(() => this._cycle(), this.config().delay);
  
    if(!this.isRunning()) {
      this._monitorState.running = true;
      this.sendEvent(this.constants.events.START);
    }
  
    return this;
  }

  public stop(): Monitor {

    clearInterval(this._monitorState.interval);
  
    if(this.isRunning()) {
      this._monitorState.running = false;
      this.sendEvent(this.constants.events.STOP);
    }
  
    return this;
  }

  public reset(): Monitor {
    this.sendEvent(this.constants.events.RESET);
    this[this.isRunning() ? 'start' : 'config'](defaults());
    return this;
  };

  public destroy(err?: any): Monitor {

    if(!this._isEnded()) {
      this.sendEvent(this.constants.events.DESTROY);
      this.stop();
      if(this instanceof stream.Readable) {
        this.emit('close');
        if(_.isFunction(stream.Readable.prototype.destroy)) {
          stream.Readable.prototype.destroy.apply(this, [err]);
        }
        this.push(null);
      }
      this._monitorState.ended = true;
    }
  
    return this;
  }

  public config(options?: ConfigObject): ConfigObject {

    if(_.isObject(options)) {
      _.extend(this._monitorState.config, options);
      this.sendEvent(this.constants.events.CONFIG, { options: _.clone(options) });
    }
  
    return this._monitorState.config;
  }

  public isRunning(): boolean {
    return !!this._monitorState.running;
  }

  private _isEnded(): boolean {
    return !!this._monitorState.ended;
  }

  public throttle(event: string, handler: Function, wait: number): Monitor {
    let self     = this,
        _handler = _.wrap(handler, function(fn) {
                     if(self.isRunning()) {
                       fn.apply(self, _.toArray(arguments).slice(1));
                     }
                   }),
        throttledFn = _.throttle(_handler, wait || this.config().throttle);

    this._monitorState.throttled.push({originalFn: handler, throttledFn: throttledFn});
    return this.on(event, throttledFn);
  }

  public unthrottle(event: string, handler: Function): Monitor {
    const throttled = this._monitorState.throttled;

    for(let i = throttled.length - 1; i >= 0; i--) {
      let pair = throttled[i];
      if(pair.originalFn === handler) {
        this.removeListener(event, pair.throttledFn);
        throttled.splice(i, 1);
      }
    }

    return this;
  }

  /*
  * convenience methods
  */
  private _sanitizeNumber(n: number): number {
    if(!_.isNumber(n)) {
      throw new Error("Number expected");
    }
    if(!n || n < 0) {
      throw new Error("Number must be greater than 0");
    }
    // Math.pow(2, 31);
    if(n >= 2147483648) {
      throw new Error("Number must be smaller than 2147483648");
    }
    return n;
  }

  public seconds(n: number): number {
    return this._sanitizeNumber(n * 1000);
  }

  public minutes(n: number): number {
    return this._sanitizeNumber(n * this.seconds(60));
  };
  
  public hours(n: number): number {
    return this._sanitizeNumber(n * this.minutes(60));
  };
  
  public days(n: number): number {
    return this._sanitizeNumber(n * this.hours(24));
  };
};

// expose main class
Monitor.prototype.Monitor = Monitor;

module.exports = new Monitor();


interface ConfigObject {
  delay?     : number;
  critical1? : number;
  critical5? : number;
  critical15?: number;
  freemem?   : number;
  uptime?    : number;
  silent?    : boolean;
  stream?    : boolean;
  immediate? : boolean;
  throttle?  : number;
}

interface MonitorState {
  running: boolean;
  ended: boolean;
  streamBuffering: boolean;
  interval: any;
  config: ConfigObject;
  throttled: Array<{ originalFn: Function, throttledFn: Function }>;
}

interface MonitorConstants {
  events: {
    MONITOR: string;
    UPTIME: string;
    FREEMEM: string;
    LOADAVG1: string;
    LOADAVG5: string;
    LOADAVG15: string;
    START: string;
    STOP: string;
    CONFIG: string;
    RESET: string;
    DESTROY: string;
  }
}

interface InfoObject {
  loadavg?  : Array<number>;
  uptime?   : number;
  freemem?  : number;
  totalmem? : number;
  options?  : ConfigObject;
}