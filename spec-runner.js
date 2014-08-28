

var assert = require('assert'),
    domain = require('domain'),
    os = require('os'),
    monitor = require('./os-monitor');

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
  assert.ok(monitor.version, "version property expected");
  assert.ok(monitor.sendEvent, ".sendEvent() method expected");
  assert.ok(monitor.start, ".start() method expected");
  assert.ok(monitor.stop, ".stop() method expected");
  assert.ok(monitor.reset, ".reset() method expected");
  assert.ok(monitor.destroy, ".destroy() method expected");
  assert.ok(monitor.config, ".config() method expected");
  assert.ok(monitor.isRunning, ".isRunning() method expected");
  assert.ok(monitor.throttle, ".throttle() method expected");
  assert.ok(monitor.seconds, ".seconds() method expected");
  assert.ok(monitor.minutes, ".minutes() method expected");
  assert.ok(monitor.hours, ".hours() method expected");
  assert.ok(monitor.days, ".days() method expected");
  assert.ok(monitor.Monitor, "Monitor class expected");
  assert.ok(monitor.os, "os object reference expected");
  assert.ok(monitor._, "_ object reference expected");
  //assert.ok(monitor.whetever, "whatever expected");


  process.stdout.write("API signature OK" + getEOL(1));


  // config
  monitor.config({test: 123});
  assert.deepEqual(monitor.config().test, 123, "config() : same config expected");
  monitor.start({test: 456});
  assert.deepEqual(monitor.config().test, 456, "start() : same config expected");
  monitor.stop();

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


  // readable stream interface
  monitor.config({stream: true});
  monitor.sendEvent('monitor', {type: 'monitor'});
  assert.ok(monitor.read(), "output expected from readable stream interface");

  process.stdout.write("readable stream interface OK" + getEOL(1));


  // isRunning() test
  assert.deepEqual(monitor.isRunning(), false, "isRunning() === false expected");
  monitor.start();
  assert.deepEqual(monitor.isRunning(), true, "isRunning() === true expected");
  monitor.stop();
  assert.deepEqual(monitor.isRunning(), false, "isRunning() === false expected");

  process.stdout.write("isRunning() test OK" + getEOL(1));
    
    
  // reset() test
  monitor.config({
                 delay: 1000,
                 critital1: 1.5,
                 critical5: 1.5,
                 critical15: 1.5,
                 freemem: 1,
                 uptime: 1,
                 silent: true,
                 stream: true,
                 immediate: true
         });
  monitor.reset();

  assert.deepEqual(monitor.config().delay, 3000, "config should be reset");
  assert.deepEqual(monitor.config().critical1, os.cpus().length, "config should be reset");
  assert.deepEqual(monitor.config().critical5, os.cpus().length, "config should be reset");
  assert.deepEqual(monitor.config().critical15, os.cpus().length, "config should be reset");
  assert.deepEqual(monitor.config().freemem, 0, "config should be reset");
  assert.deepEqual(monitor.config().uptime, 0, "config should be reset");
  assert.deepEqual(monitor.config().silent, false, "config should be reset");
  assert.deepEqual(monitor.config().stream, false, "config should be reset");
  assert.deepEqual(monitor.config().immediate, false, "config should be reset");

  process.stdout.write("reset() test OK" + getEOL(1));
    
    
  // destroy() test
  monitor.on('close', function() {
    trace.closeEvent = 'close';
  });

  monitor.destroy();

  assert.deepEqual(monitor.isRunning(), false, "isRunning() === false expected");
  assert.deepEqual(trace.closeEvent, "close", "'close' event expected");
  assert.throws(function() {
                    monitor.start();
                },
                "start() should throw");
  assert.throws(function() {
                    monitor.push('some data');
                },
                "push() should throw");

  process.stdout.write("destroy() test OK" + getEOL(1));

  monitor.removeAllListeners();

});

