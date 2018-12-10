

var assert = require('assert'),
    os = require('os'),
    mock = require('mock-os');

// mock os module
mock({
  cpus: [{}, {}]
});

var monitor = require('./os-monitor');

function getEOL(n) {
  var lines = [];
  for(var i = 0; i < n; i++) {
    lines.push(os.EOL);
  }
  return lines.join('');
}

process.stdout.write("running tests..." + getEOL(2));



(function() {

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
  assert.strictEqual(monitor.config().test, 123, "config() : same config expected");
  monitor.start({test: 456});
  assert.strictEqual(monitor.config().test, 456, "start() : same config expected");
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
  
  assert.strictEqual(trace.monitorEvent, "monitor", "'monitor' event expected");
  assert.strictEqual(trace.loadavg1Event, "loadavg1", "'loadavg1' event expected");
  assert.strictEqual(trace.loadavg5Event, "loadavg5", "'loadavg5' event expected");
  assert.strictEqual(trace.loadavg15Event, "loadavg15", "'loadavg15' event expected");
  assert.strictEqual(trace.freememEvent, "freemem", "'freemem' event expected");
  assert.strictEqual(trace.uptimeEvent, "uptime", "'uptime' event expected");
  
  process.stdout.write("events OK" + getEOL(1));

  monitor.removeAllListeners();
  

  // readable stream interface
  monitor.config({stream: true});
  monitor.sendEvent('monitor', {type: 'monitor'});
  assert.ok(monitor.read(), "output expected from readable stream interface");

  process.stdout.write("readable stream interface OK" + getEOL(1));


  // isRunning() test
  assert.strictEqual(monitor.isRunning(), false, "isRunning() === false expected");
  monitor.start();
  assert.strictEqual(monitor.isRunning(), true, "isRunning() === true expected");
  monitor.stop();
  assert.strictEqual(monitor.isRunning(), false, "isRunning() === false expected");

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

  assert.strictEqual(monitor.config().delay, 3000, "config should be reset");
  assert.strictEqual(monitor.config().critical1, os.cpus().length, "config should be reset");
  assert.strictEqual(monitor.config().critical5, os.cpus().length, "config should be reset");
  assert.strictEqual(monitor.config().critical15, os.cpus().length, "config should be reset");
  assert.strictEqual(monitor.config().freemem, 0, "config should be reset");
  assert.strictEqual(monitor.config().uptime, 0, "config should be reset");
  assert.strictEqual(monitor.config().silent, false, "config should be reset");
  assert.strictEqual(monitor.config().stream, false, "config should be reset");
  assert.strictEqual(monitor.config().immediate, false, "config should be reset");

  process.stdout.write("reset() test OK" + getEOL(1));
    
    
  // destroy() test
  monitor.on('close', function() {
    trace.closeEvent = 'close';
  });

  monitor.destroy();

  assert.strictEqual(monitor.isRunning(), false, "isRunning() === false expected");
  assert.strictEqual(trace.closeEvent, "close", "'close' event expected");
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

})();


// mock tests with 2 fake cpus
mock({
  cpus: [{}, {}],
  loadavg: [3, 3, 3],
  freemem: 1000,
  totalmem: 5000,
  uptime: 10000
});

var monitor2 = new monitor.Monitor();
var monitor3 = new monitor.Monitor();
var trace2 = {};
var trace3 = {};

monitor2.on('freemem', function(event) {
  trace2.freememAbsolute = event;
})
.on('uptime', function(event) {
  trace2.uptime = event;
})
.on('loadavg1', function(event) {
  trace2.loadavg1 = event;
})
.on('loadavg5', function(event) {
  trace2.loadavg5 = event;
})
.on('loadavg15', function(event) {
  trace2.loadavg15 = event;
});

monitor3.on('freemem', function(event) {
  trace3.freememAbsolute = event;
})
.on('uptime', function(event) {
  trace3.uptime = event;
})
.on('loadavg1', function(event) {
  trace3.loadavg1 = event;
})
.on('loadavg5', function(event) {
  trace3.loadavg5 = event;
})
.on('loadavg15', function(event) {
  trace3.loadavg15 = event;
});

monitor2.start({
  freemem: 20000,
  uptime: 1000,
  immediate: true
});

monitor3.start({
  freemem: 200,
  uptime: 1000000,
  critical1: 4,
  critical5: 4,
  critical15: 4,
  immediate: true
});

process.nextTick(function() {
  monitor2.removeAllListeners();
  monitor3.removeAllListeners();
  
  monitor2.on('freemem', function(event) {
    trace2.freememPct = event;
  });
  monitor3.on('freemem', function() {
    trace3.freememPct = event;
  });
});

monitor2.start({
  freemem: 0.7,
  immediate: true
}).stop();

monitor3.start({
  freemem: 0.1,
  immediate: true
}).stop();

setImmediate(function() {
  assert.ok(trace2.freememAbsolute, "freememAbsolute expected");
  assert.ok(trace2.freememPct, "freememPct expected");
  assert.ok(trace2.uptime, "uptime expected");
  assert.ok(trace2.loadavg1, "loadavg1 expected");
  assert.ok(trace2.loadavg5, "loadavg5 expected");
  assert.ok(trace2.loadavg15, "loadavg15 expected");
  
  assert.ok(trace2.freememAbsolute.timestamp, "event.timestamp expected");
  assert.ok(trace2.freememPct.timestamp, "event.timestamp expected");
  assert.ok(trace2.uptime.timestamp, "event.timestamp expected");
  assert.ok(trace2.loadavg1.timestamp, "event.timestamp expected");
  assert.ok(trace2.loadavg5.timestamp, "event.timestamp expected");
  assert.ok(trace2.loadavg15.timestamp, "event.timestamp expected");
  
  assert.ok(trace2.freememAbsolute.loadavg, "event.loadavg expected");
  assert.ok(trace2.freememPct.loadavg, "event.loadavg expected");
  assert.ok(trace2.uptime.loadavg, "event.loadavg expected");
  assert.ok(trace2.loadavg1.loadavg, "event.loadavg expected");
  assert.ok(trace2.loadavg5.loadavg, "event.loadavg expected");
  assert.ok(trace2.loadavg15.loadavg, "event.loadavg expected");
  
  assert.ok(trace2.freememAbsolute.freemem, "event.freemem expected");
  assert.ok(trace2.freememPct.freemem, "event.freemem expected");
  assert.ok(trace2.uptime.freemem, "event.freemem expected");
  assert.ok(trace2.loadavg1.freemem, "event.freemem expected");
  assert.ok(trace2.loadavg5.freemem, "event.freemem expected");
  assert.ok(trace2.loadavg15.freemem, "event.freemem expected");
  
  assert.ok(trace2.freememAbsolute.totalmem, "event.totalmem expected");
  assert.ok(trace2.freememPct.totalmem, "event.totalmem expected");
  assert.ok(trace2.uptime.totalmem, "event.totalmem expected");
  assert.ok(trace2.loadavg1.totalmem, "event.totalmem expected");
  assert.ok(trace2.loadavg5.totalmem, "event.totalmem expected");
  assert.ok(trace2.loadavg15.totalmem, "event.totalmem expected");
  
  assert.ok(trace2.freememAbsolute.uptime, "event.uptime expected");
  assert.ok(trace2.freememPct.uptime, "event.uptime expected");
  assert.ok(trace2.uptime.uptime, "event.uptime expected");
  assert.ok(trace2.loadavg1.uptime, "event.uptime expected");
  assert.ok(trace2.loadavg5.uptime, "event.uptime expected");
  assert.ok(trace2.loadavg15.uptime, "event.uptime expected");
  
  assert.strictEqual(trace2.freememAbsolute.type, "freemem", "event.type === 'freemem' expected");
  assert.strictEqual(trace2.freememPct.type, "freemem", "event.type === 'freemem' expected");
  assert.strictEqual(trace2.uptime.type, "uptime", "event.type === 'uptime' expected");
  assert.strictEqual(trace2.loadavg1.type, "loadavg1", "event.type === 'loadavg1' expected");
  assert.strictEqual(trace2.loadavg5.type, "loadavg5", "event.type === 'loadavg5' expected");
  assert.strictEqual(trace2.loadavg15.type, "loadavg15", "event.type === 'loadavg15' expected");
  
  assert.ok(!trace3.freememAbsolute, "freememAbsolute not expected");
  assert.ok(!trace3.freememPct, "freememPct not expected");
  assert.ok(!trace3.uptime, "uptime not expected");
  assert.ok(!trace3.loadavg1, "loadavg1 not expected");
  assert.ok(!trace3.loadavg5, "loadavg5 not expected");
  assert.ok(!trace3.loadavg15, "loadavg15 not expected");
  
  process.stdout.write("mock tests OK" + getEOL(1));
});

// throttle
var eventCount = 0;
var monitor4 = new monitor.Monitor();

monitor4.start();
monitor4.throttle('loadavg1', function(event) {
  eventCount++;
}, 100);

monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
setTimeout(function() {
  monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
}, 10);
setTimeout(function() {
  monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
  monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
  monitor4.sendEvent('loadavg1', {type: 'loadavg1'});
  setImmediate(function() {
    assert.strictEqual(eventCount, 3, "throttle: eventCount === 3 expected");
    process.stdout.write("throttle() test OK" + getEOL(1));
    monitor4.stop();
  });
}, 200);
  