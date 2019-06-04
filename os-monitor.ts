// OS Monitoring for Node.js

// Copyright (c) 2012-2018 lfortin
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


interface InfoObject {
  loadavg  : number;
  uptime   : number;
  freemem  : number;
  totalmem : number;
}

let util     = require('util'),
    os       = require('os'),
    stream   = require('readable-stream'),
    _        = require('underscore'),
    critical = os.cpus().length,
    defaults = {
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

// constructor
class Monitor extends stream.Readable {
  private _monitorState: object;
  public version: string;
  
  constructor(options?: object) {
    super({highWaterMark: 102400});
    this._monitorState = {
      running: false,
      ended: false,
      streamBuffering: true,
      interval: undefined,
      config: _.clone(defaults)
    };
  }
  
  private _isEnded(): boolean {
    return !!this._monitorState.ended;
  }
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
};


Monitor.prototype.version = '1.0.7';


// readable stream implementation requirement
Monitor.prototype._read = function() {
  this._monitorState.streamBuffering = true;
};

Monitor.prototype.sendEvent = function(event: string, obj?: InfoObject): void {

  let eventObject = _.extend({type: event, timestamp: Math.floor(_.now() / 1000)}, obj);
  
  // for EventEmitter
  this.emit(event, eventObject);
  // for readable Stream
  if(this.config().stream && this._monitorState.streamBuffering) {
    let prettyJSON = os.EOL + JSON.stringify(eventObject, null, 2);
    if( !this.push(prettyJSON) ) {
      this._monitorState.streamBuffering = false;
    }
  }
};

Monitor.prototype.start = function(options: object) {

  if(this._isEnded()) {
    throw new Error("monitor has been ended by .destroy() method");
  }

  this.stop()
      .config(options);

  let cycle = (): void => {
    let info: InfoObject = {
      loadavg  : os.loadavg(),
      uptime   : os.uptime(),
      freemem  : os.freemem(),
      totalmem : os.totalmem()
    },
    config = this.config(),
    freemem  = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;

    if(!config.silent) {
      this.sendEvent('monitor', info);
    }
    if(info.loadavg[0] > config.critical1) {
      this.sendEvent('loadavg1', info);
    }
    if(info.loadavg[1] > config.critical5) {
      this.sendEvent('loadavg5', info);
    }
    if(info.loadavg[2] > config.critical15) {
      this.sendEvent('loadavg15', info);
    }
    if(info.freemem < freemem) {
      this.sendEvent('freemem', info);
    }
    if(Number(config.uptime) && info.uptime > Number(config.uptime)) {
      this.sendEvent('uptime', info);
    }
  };
  
  if(this.config().immediate) {
    process.nextTick(cycle);
  }
  this._monitorState.interval = setInterval(cycle, this.config().delay);

  if(!this.isRunning()) {
    this._monitorState.running = true;
    this.sendEvent('start');
  }

  return this;
};

Monitor.prototype.stop = function() {

  clearInterval(this._monitorState.interval);

  if(this.isRunning()) {
    this._monitorState.running = false;
    this.sendEvent('stop');
  }

  return this;
};

Monitor.prototype.reset = function() {
  this.sendEvent('reset');
  this[this.isRunning() ? 'start' : 'config'](_.clone(defaults));
  return this;
};

Monitor.prototype.destroy = function(err?: any) {

  if(!this._isEnded()) {
    this.sendEvent('destroy');
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
};

Monitor.prototype.config = function(options?: object): object {

  if(_.isObject(options)) {
    _.extend(this._monitorState.config, options);
    this.sendEvent('config', { options: _.clone(options) });
  }

  return this._monitorState.config;
};

Monitor.prototype.isRunning = function(): boolean {
  return !!this._monitorState.running;
};

//Monitor.prototype._isEnded = function(): boolean {
//  return !!this._monitorState.ended;
//};

Monitor.prototype.throttle = function(event: string, handler, wait: number) {
  let self     = this,
      _handler = _.wrap(handler, function(fn) {
                   if(self.isRunning()) {
                     fn.apply(this, _.toArray(arguments).slice(1));
                   }
                 });
  return self.on.call(self, event, _.throttle(_handler, wait || self.config().throttle));
};


/*
 * convenience methods
 */

/*
Monitor.prototype._sanitizeNumber = function(n: number): number {
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
};
*/

Monitor.prototype.seconds = function(n: number): number {
  return this._sanitizeNumber(n * 1000);
};

Monitor.prototype.minutes = function(n: number): number {
  return this._sanitizeNumber(n * this.seconds(60));
};

Monitor.prototype.hours = function(n: number): number {
  return this._sanitizeNumber(n * this.minutes(60));
};

Monitor.prototype.days = function(n: number): number {
  return this._sanitizeNumber(n * this.hours(24));
};


// expose OS module
Monitor.prototype.os = os;

// expose Underscore
Monitor.prototype._ = _;

// expose main class
Monitor.prototype.Monitor = Monitor;

module.exports = new Monitor();

