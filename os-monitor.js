// OS Monitoring for Node.js

// Copyright (c) 2012 Laurent Fortin
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


var util     = require('util'),
    os       = require('os'),
    through  = require('through'),
    _        = require('underscore'),
    interval = undefined,
    critical = os.cpus().length,
    defaults = {
      delay     : 3000,
      critical1 : critical,
      critical5 : critical,
      critical15: critical,
      freemem   : 0
    },
    running  = false,
    config   = {};

// main object
var Osm = through(function write(data) {
                    this.emit('data', data);
                  },
                  function end() {
                    this.emit('end');
                  });

Osm.version = '0.0.10';


Osm.sendEvent = function(event, data) {
  // for EventEmitter
  this.emit(event, data);
  // for readable Stream
  this.write(JSON.stringify(data));
};

Osm.start = function(options) {

  var self = this;

  self.stop()
      .config(options);

  interval  = setInterval(function() {
    var info = {
      loadavg  : os.loadavg(),
      uptime   : os.uptime(),
      freemem  : os.freemem(),
      totalmem : os.totalmem()
    },
    freemem  = (config.freemem < 1) ? config.freemem * info.totalmem : config.freemem;

    self.sendEvent('monitor', _.extend({type: 'monitor'}, info));

    if(info.loadavg[0] > config.critical1) {
      self.sendEvent('loadavg1', _.extend({type: 'loadavg1'}, info));
    }
    if(info.loadavg[1] > config.critical5) {
      self.sendEvent('loadavg5', _.extend({type: 'loadavg5'}, info));
    }
    if(info.loadavg[2] > config.critical15) {
      self.sendEvent('loadavg15', _.extend({type: 'loadavg15'}, info));
    }
    if(info.freemem < freemem) {
      self.sendEvent('freemem', _.extend({type: 'freemem'}, info));
    }
  }, config.delay);

  if(!self.isRunning()) {
    running = true;
    self.sendEvent('start', {type: 'start'});
  }

  return self;
};

Osm.stop = function() {

  clearInterval(interval);

  if(this.isRunning()) {
    running = false;
    this.sendEvent('stop', {type: 'stop'});
  }

  return this;
};

Osm.config = function(options) {
  _.defaults(config, defaults);

  if(_.isObject(options)) {
    _.extend(config, options);
    this.sendEvent('config', {type: 'config', options: _.clone(options)});
  }

  return config;
};

Osm.isRunning = function() {
  return !!running;
};

Osm.throttle = function(event, handler, wait) {
  var self     = this,
      _handler = _.wrap(handler, function(fn) {
                   if(self.isRunning()) {
                     fn.apply(this, _.toArray(arguments).slice(1));
                   }
                 });
  return self.on.call(self, event, _.throttle(_handler, wait || config.throttle));
};

// deprecated stuff
Osm.setConfig = Osm.config;

// expose OS module
Osm.os = os;

// expose Underscore
Osm._ = _;

module.exports = Osm;

