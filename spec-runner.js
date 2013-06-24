

var assert = require('assert'),
    domain = require('domain'),
    os = require('os'),
    monitor = require('os-monitor');

function getEOL(n) {
  var lines = [];
  for(var i = 0; i < n; i++) {
    lines.push(os.EOL);
  }
  return lines.join('');
}

process.stdout.write("running tests..." + getEOL(2));


var tester = domain.create();

tester.on('error', function(error) {
  process.stderr.write(error + getEOL(2));
  process.exit();
});


tester.run(function() {

  // API signature
  assert.ok(monitor._read, "internal ._read() method expected");
  assert.ok(monitor.sendEvent, ".sendEvent() method expected");
  assert.ok(monitor.start, ".start() method expected");
  assert.ok(monitor.stop, ".stop() method expected");
  assert.ok(monitor.config, ".config() method expected");
  assert.ok(monitor.isRunning, ".isRunning() method expected");
  assert.ok(monitor.throttle, ".throttle() method expected");
  assert.ok(monitor.os, "os object reference expected");
  assert.ok(monitor._, "_ object reference expected");
  //assert.ok(monitor.whetever, "whatever expected");


  process.stdout.write("API signature OK" + getEOL(1));


  // config
  monitor.config({test: 123});
  assert.deepEqual(monitor.config().test, 123, "same config expected");


  process.stdout.write("config OK" + getEOL(1));


  // events
  var trace = {};

  monitor.on('monitor', function(event) {
    trace.monitorEvent = event.type;
  });
  monitor.on('loadavg1', function(event) {
    trace.loadavg1Event = event.type;
  });
  monitor.on('loadavg5', function(event) {
    trace.loadavg5Event = event.type;
  });
  monitor.on('loadavg15', function(event) {
    trace.loadavg15Event = event.type;
  });
  monitor.on('freemem', function(event) {
    trace.freememEvent = event.type;
  });
  monitor.on('uptime', function(event) {
    trace.uptimeEvent = event.type;
  });
  monitor.sendEvent('monitor', {type: 'monitor'});
  monitor.sendEvent('loadavg1', {type: 'loadavg1'});
  monitor.sendEvent('loadavg5', {type: 'loadavg5'});
  monitor.sendEvent('loadavg15', {type: 'loadavg15'});
  monitor.sendEvent('freemem', {type: 'freemem'});
  monitor.sendEvent('uptime', {type: 'uptime'});
  
  assert.deepEqual(trace.monitorEvent, "monitor", "'monitor' event expected");
  assert.deepEqual(trace.loadavg1Event, "loadavg1", "'loadavg1' event expected");
  assert.deepEqual(trace.loadavg5Event, "loadavg5", "'loadavg5' event expected");
  assert.deepEqual(trace.loadavg15Event, "loadavg15", "'loadavg15' event expected");
  assert.deepEqual(trace.freememEvent, "freemem", "'freemem' event expected");
  assert.deepEqual(trace.uptimeEvent, "uptime", "'uptime' event expected");
  
  process.stdout.write("events OK" + getEOL(1));

  monitor.removeAllListeners();
});

