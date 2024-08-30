// OS Monitoring for Node.js

// Copyright (c) 2012-2024 lfortin
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


const os          = require('node:os'),
      fs          = require('node:fs'),
      stream      = require('node:stream'),
      throttle    = require('lodash.throttle'),
      { version } = require('./package.json'),
      critical: number = os.cpus().length;

export enum EventType {
    MONITOR = "monitor",
    UPTIME = "uptime",
    FREEMEM = "freemem",
    DISKFREE = "diskfree",
    LOADAVG1 = "loadavg1",
    LOADAVG5 = "loadavg5",
    LOADAVG15 = "loadavg15",
    START = "start",
    STOP = "stop",
    CONFIG = "config",
    RESET = "reset",
    DESTROY = "destroy"
}

export class Monitor extends stream.Readable {

  constructor() {
    super({highWaterMark: 102400});
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
        diskfree  : {},
        silent    : false,
        stream    : false,
        immediate : false
      }
    };
  }

  // expose main Monitor class
  public Monitor: typeof Monitor = Monitor;

  // expose OS module
  public os = os;

  private _monitorState: MonitorState = {
    running: false,
    ended: false,
    streamBuffering: true,
    interval: undefined,
    config: Monitor.prototype.constants.defaults,
    throttled: []
  };

  // readable stream implementation requirement
  private _read(): void {
    this._monitorState.streamBuffering = true;
  }

  public sendEvent(event: EventType, obj: Partial<InfoObject> = {}): Monitor {
    const eventObject: EventObject = {...obj, type: event, timestamp: Math.floor(Date.now() / 1000)};
  
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

  private _createInfoObject(): InfoObject {
    return {
      loadavg  : os.loadavg(),
      uptime   : os.uptime(),
      freemem  : os.freemem(),
      totalmem : os.totalmem()
    };
  }

  private async _cycle(): Promise<void> {
    const info: InfoObject = this._createInfoObject(),
          config = this.config();
    
    if(config.diskfree && Object.keys(config.diskfree).length) {
      const deferreds: Array<Promise<void>> = [];

      for(const path in config.diskfree) {
        const deferredStats: Promise<StatFs> = fs.promises.statfs(path),
              deferred: Promise<void> = deferredStats.then(stats => {
                info.diskfree = Object.assign(info.diskfree || {}, {[path]: stats.bfree});
              }, (err: unknown) => {
                this.emit('error', err);
              });
        deferreds.push(deferred);
      }

      await Promise.all(deferreds);

      for(const path in config.diskfree) {
        const dfConfig: number = config.diskfree[path];
        if(info.diskfree && info.diskfree[path] < dfConfig) {
          this.sendEvent(this.constants.events.DISKFREE, info);
        }
      }
    }
    this._sendEvents(info);
  }

  private _sendEvents(info: InfoObject): void {
    const config = this.config(),
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

  public start(options?: Partial<ConfigObject>): Monitor {
    if(this._isEnded()) {
      this.emit('error', new Error("monitor has been ended by .destroy() method"));
      return this;
    }
    if(options) {
      this._validateConfig(options);
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

    if(options !== null && typeof options === 'object') {
      this._validateConfig(options);
      Object.assign(this._monitorState.config, options);
      this.sendEvent(this.constants.events.CONFIG, { options: { ...options } });
    }
  
    return this._monitorState.config;
  }

  private _validateConfig(options: Partial<ConfigObject>): void {
    if(options.diskfree && Object.keys(options.diskfree).length && !fs.statfs) {
      throw new Error("diskfree not supported");
    }
  }

  public isRunning(): boolean {
    return !!this._monitorState.running;
  }

  private _isEnded(): boolean {
    return !!this._monitorState.ended;
  }

  public throttle(event: EventType, handler: EventHandler, wait: number): Monitor {
    if(typeof handler !== 'function') {
      throw new Error("Handler must be a function");
    }

    const _handler: EventHandler = (eventObject: EventObject) => {
                                     if(this.isRunning()) {
                                       handler.apply(this, [eventObject]);
                                     }
                                   },
          throttledFn: EventHandler = throttle(_handler, wait || this.config().throttle);

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

  public when(event: EventType): Promise<EventObject> {
    return new Promise((resolve) => {
      this.once(event, (eventObj: EventObject) => resolve(eventObj));
    });
  }

  /*
  * convenience methods
  */
  private _sanitizeNumber(n: number): number {
    if(!Number.isInteger(n)) {
      throw new Error("Integer expected");
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

  public blocks(bytes: number, blockSize = 1): number {
    return Math.ceil(bytes / blockSize);
  }

  public createMonitor(): Monitor {
    return new Monitor();
  }
}

module.exports = new Monitor();

export interface StatFs {
  type  : number;
  bsize : number;
  blocks: number;
  bfree : number;
  bavail: number;
  files : number;
  ffree : number;
}

export interface DiskfreeConfig {
  [key: string]: number;
}

export interface ConfigObject {
  delay     : number;
  critical1 : number;
  critical5 : number;
  critical15: number;
  freemem   : number;
  uptime    : number;
  silent    : boolean;
  stream    : boolean;
  immediate : boolean;
  diskfree  : DiskfreeConfig;
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
}

export interface MonitorConstants {
  events: {
    [key: string]: EventType;
  };
  defaults: ConfigObject;
}

export interface DiskfreeInfo {
  [key: string]: number;
}

export interface InfoObject {
  loadavg  : Array<number>;
  uptime   : number;
  freemem  : number;
  totalmem : number;
  diskfree?: DiskfreeInfo;
  options? : Partial<ConfigObject>;
}

export interface EventObject extends Partial<InfoObject> {
  type      : EventType;
  timestamp : number;
}

export interface EventHandler {
  (event: EventObject): void;
}
