// OS Monitoring for Node.js

// Copyright (c) 2009-2012 Laurent Fortin
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
    events   = require('events'),
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
    config   = {};

// constructor
var Osm = function() {
  events.EventEmitter.call(this);
  return this;
};

// get EventEmitter class properties
util.inherits(Osm, events.EventEmitter);


Osm.prototype.start = function(options) {

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

    self.emit('monitor', _.extend({type: 'monitor'}, info));

    if(info.loadavg[0] > config.critical1) {
      self.emit('loadavg1', _.extend({type: 'loadavg1'}, info));
    }
    if(info.loadavg[1] > config.critical5) {
      self.emit('loadavg5', _.extend({type: 'loadavg5'}, info));
    }
    if(info.loadavg[2] > config.critical15) {
      self.emit('loadavg15', _.extend({type: 'loadavg15'}, info));
    }
    if(info.freemem < freemem) {
      self.emit('freemem', _.extend({type: 'freemem'}, info));
    }
  }, config.delay);

  return self;
};


Osm.prototype.stop = function() {

  clearInterval(interval);

  return this;
};

Osm.prototype.config = function(options) {
  _.defaults(config, defaults);

  if(_.isObject(options)) {
    return _.extend(config, options);
  }

  return config;
};

// deprecated stuff
Osm.prototype.setConfig = Osm.prototype.config;

// expose OS module
Osm.prototype.os = os;

module.exports = new Osm();

