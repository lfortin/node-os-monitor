// OS Monitoring for Node.js

// Copyright (c) 2012-2022 lfortin
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


const os      = require('os'),
      events  = require('events'),
      stream  = require('readable-stream'),
      _       = require('underscore'),
      { version } = require('./package.json'),
      critical: number = os.cpus().length;

enum EventType {
    MONITOR = "monitor",
    UPTIME = "uptime",
    FREEMEM = "freemem",
    LOADAVG1 = "loadavg1",
    LOADAVG5 = "loadavg5",
    LOADAVG15 = "loadavg15",
    START = "start",
    STOP = "stop",
    CONFIG = "config",
    RESET = "reset",
    DESTROY = "destroy"
}

class Monitor extends stream.Readable {

  constructor() {
    super({highWaterMark: 102400});
    this._initPlugins();
  }

  private _initPlugins(): void {
    this.extend({
      [this.constants.events.MONITOR]: (info: InfoObject, cb: Function) => {
        const config = this.config();
        if(!config.silent) {
          cb(info);
        }
      },
      [this.constants.events.LOADAVG1]: (info: InfoObject, cb: Function) => {
        const config = this.config();
        if(info.loadavg[0] > config.critical1) {
          cb(info);
        }
      },
      [this.constants.events.LOADAVG5]: (info: InfoObject, cb: Function) => {
        const config = this.config();
        if(info.loadavg[1] > config.critical5) {
          cb(info);
        }
      },
      [this.constants.events.LOADAVG15]: (info: InfoObject, cb: Function) => {
        const config = this.config();
        if(info.loadavg[2] > config.critical15) {
          cb(info);
        }
      },
      [this.constants.events.FREEMEM]: (info: InfoObject, cb: Function) => {
        const config = this.config(),
        freemem  = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;
        if(info.freemem < freemem) {
          cb(info);
        }
      },
      [this.constants.events.UPTIME]: (info: InfoObject, cb: Function) => {
        const config = this.config();
        if(Number(config.uptime) && info.uptime > Number(config.uptime)) {
          cb(info);
        }
      },
    });
  }

  public get version(): string {
    return version;
  }

  public get constants(): MonitorConstants {
    return {
      events: EventType,
      defaults: {
        delay     : 3000,
        critical1 : critical,
        critical5 : critical,
        critical15: critical,
        freemem   : 0,
        uptime    : 0,
        silent    : false,
        stream    : false,
        immediate : false
      }
    };
  }

  // expose Thenable class
  public Thenable: typeof Thenable = Thenable;

  // expose main Monitor class
  public Monitor: typeof Monitor = Monitor;

  // expose OS module
  public os = os;

  // expose Underscore
  public _ = _;

  private _monitorState: MonitorState = {
    running: false,
    ended: false,
    streamBuffering: true,
    interval: undefined,
    config: Monitor.prototype.constants.defaults,
    throttled: [],
    plugins: {}
  };

  // readable stream implementation requirement
  private _read(): void {
    this._monitorState.streamBuffering = true;
  }

  public sendEvent(event: EventType, obj: Partial<InfoObject> = {}): Monitor {
    const eventObject: EventObject = _.extend({type: event, timestamp: Math.floor(_.now() / 1000)}, obj);
  
    // for EventEmitter
    this.emit(event, eventObject);
    // for readable Stream
    if(this._readableState.flowing) {
      this._monitorState.streamBuffering = true;
    }
    if(this.config().stream && this._monitorState.streamBuffering) {
      const prettyJSON = JSON.stringify(eventObject, null, 2);
      if(!this.push(`${os.EOL}${prettyJSON}`) && !this._readableState.flowing) {
        this._monitorState.streamBuffering = false;
      }
    }

    return this;
  }

  public extend(handlers: {[key: string]: Function}): Monitor {
    _.extend(this._monitorState.plugins, handlers);
    return this;
  }

  private _cycle(): void {
    const info: InfoObject = {
      loadavg  : os.loadavg(),
      uptime   : os.uptime(),
      freemem  : os.freemem(),
      totalmem : os.totalmem()
    };

    for(const event in this._monitorState.plugins) {
      const plugin = this._monitorState.plugins[event];
      plugin(info, (info: InfoObject) => {
        this.sendEvent(event as EventType, info);
      });
    }
  }

  public start(options?: Partial<ConfigObject>): Monitor {
    if(this._isEnded()) {
      this.emit('error', new Error("monitor has been ended by .destroy() method"));
      return this;
    }
  
    this.stop()
        .config(options);
    
    if(this.config().immediate) {
      process.nextTick(() => this._cycle());
    }
    this._monitorState.interval = setInterval(() => this._cycle(), this.config().delay);
  
    this._monitorState.running = true;
    this.sendEvent(this.constants.events.START);
  
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
    this[this.isRunning() ? 'start' : 'config'](this.constants.defaults);
    return this;
  }

  public destroy(err?: unknown): Monitor {

    if(!this._isEnded()) {
      this.sendEvent(this.constants.events.DESTROY);
      this.stop();
      this.emit('close');
      stream.Readable.prototype.destroy.apply(this, [err]);
      this._monitorState.ended = true;
    }

    return this;
  }

  public config(options?: Partial<ConfigObject>): ConfigObject {

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

  public throttle(event: EventType, handler: EventHandler, wait: number): Monitor {
    if(!_.isFunction(handler)) {
      throw new Error("Handler must be a function");
    }

    const _handler: EventHandler = (eventObject: EventObject) => {
                                     if(this.isRunning()) {
                                       handler.apply(this, [eventObject]);
                                     }
                                   },
          throttledFn: EventHandler = _.throttle(_handler, wait || this.config().throttle);

    this._monitorState.throttled.push({event: event, originalFn: handler, throttledFn: throttledFn});
    return this.on(event, throttledFn);
  }

  public unthrottle(event: EventType, handler: EventHandler): Monitor {
    const {throttled} = this._monitorState;

    for(let i = throttled.length - 1; i >= 0; i--) {
      const pair = throttled[i];
      if(pair.event === event && pair.originalFn === handler) {
        this.removeListener(event, pair.throttledFn);
        throttled.splice(i, 1);
      }
    }

    return this;
  }

  public when(event: EventType): Promise<EventObjectThenable> | EventObjectThenable {
    const deferred: EventObjectThenable = new Thenable();
    let wrappedDeferred: Promise<EventObjectThenable>;

    this.once(event, (eventObj: EventObject) => {
      deferred.resolve(eventObj);
    });

    try {
      wrappedDeferred = Promise.resolve(deferred) as Promise<EventObjectThenable>;
      return wrappedDeferred;
    } catch(err: unknown) {
      return deferred;
    }
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
  }
  
  public hours(n: number): number {
    return this._sanitizeNumber(n * this.minutes(60));
  }
  
  public days(n: number): number {
    return this._sanitizeNumber(n * this.hours(24));
  }

  public createMonitor(): Monitor {
    return new Monitor();
  }
}

class Thenable<Type> extends events.EventEmitter {
  static constants = {
    state: {
      PENDING: 'pending',
      FULFILLED: 'fulfilled',
      REJECTED: 'rejected'
    }
  };
  private _thenableState: ThenableState<Type> = {
    state: Thenable.constants.state.PENDING,
    result: undefined
  };
  public resolve(result: Type): Thenable<Type> {
    const {state} = Thenable.constants;
    if(this._thenableState.state === state.PENDING) {
      this._thenableState.state = state.FULFILLED;
      this._thenableState.result = result;
      this.emit('resolve', result);
    }
    return this;
  }
  public reject(error: unknown): Thenable<Type> {
    const {state} = Thenable.constants;
    if(this._thenableState.state === state.PENDING) {
      this._thenableState.state = state.REJECTED;
      this._thenableState.result = error;
      this.emit('reject', error);
    }
    return this;
  }
  public then(onFulfilled?: ThenableResolvedHandler<Type>, onRejected?: ThenableRejectedHandler<Type>): void {
    const {state} = Thenable.constants;

    if(this._thenableState.state === state.PENDING) {
      this.once('resolve', (result: Type) => {
        onFulfilled && onFulfilled(this._thenableState.result);
      });
      this.once('reject', (error: unknown) => {
        onRejected && onRejected(this._thenableState.result);
      });
    }
    if(onFulfilled && this._thenableState.state === state.FULFILLED) {
      onFulfilled(this._thenableState.result);
    }
    if(onRejected && this._thenableState.state === state.REJECTED) {
      onRejected(this._thenableState.result);
    }
  }
  public catch(onRejected?: ThenableRejectedHandler<Type>): void {
    return this.then(undefined, onRejected);
  }
}

module.exports = new Monitor();

interface ConfigObject {
  delay     : number;
  critical1 : number;
  critical5 : number;
  critical15: number;
  freemem   : number;
  uptime    : number;
  silent    : boolean;
  stream    : boolean;
  immediate : boolean;
  throttle? : number;
}

interface MonitorState {
  running: boolean;
  ended: boolean;
  streamBuffering: boolean;
  interval?: NodeJS.Timeout;
  config: ConfigObject;
  throttled: Array<{
    event: EventType;
    originalFn: EventHandler;
    throttledFn: EventHandler;
  }>;
  plugins: {
    [key: string]: Function;
  };
}

interface MonitorConstants {
  events: {
    [key: string]: EventType;
  };
  defaults: ConfigObject;
}

interface InfoObject {
  loadavg  : Array<number>;
  uptime   : number;
  freemem  : number;
  totalmem : number;
  options? : Partial<ConfigObject>;
}

interface EventObject extends InfoObject {
  type      : EventType;
  timestamp : number;
}

interface EventHandler {
  (event: EventObject): void;
}

interface ThenableState<Type> {
  state: string;
  result?: Type | unknown;
}

interface ThenableResolvedHandler<Type> {
  (result: Type | unknown): unknown;
}

interface ThenableRejectedHandler<Type> {
  (error: unknown): unknown;
}

type EventObjectThenable = Thenable<EventObject>;
