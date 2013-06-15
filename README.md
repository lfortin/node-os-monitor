# os-monitor

A very simple monitor for the built-in `os` module in Node.js.

Allows you to observe some OS parameters, such as free memory available or load average.


## Installation

    npm install os-monitor


# Synopsis

```javascript
var osm = require("os-monitor");


// basic usage
osm.start();

// more advanced usage with configs.
osm.start({ delay: 3000 // interval in ms between monitor cycles
          , freemem: 1000000000 // amount of memory in bytes under which event 'freemem' is triggered (can also be a percentage of total mem)
          , uptime: 1000000 // number of seconds over which event 'uptime' is triggered
          , critical1: 0.7 // value of 1 minute load average over which event 'loadavg1' is triggered
          , critical5: 0.7 // value of 5 minutes load average over which event 'loadavg5' is triggered
          , critical15: 0.7 // value of 15 minutes load average over which event 'loadavg15' is triggered
          , silent: false // set true to mute event 'monitor'
          , stream: false // set true to enable the monitor as a Readable Stream
          });


// define handler that will always fire every cycle
osm.on('monitor', function(event) {
  console.log(event.type, ' This event always happens on each monitor cycle!');
});

// define handler for a too high 1-minute load average
osm.on('loadavg1', function(event) {
  console.log(event.type, ' Load average is exceptionally high!');
});

// define handler for a too low free memory
osm.on('freemem', function(event) {
  console.log(event.type, 'Free memory is very low!');
});

// define a throttled handler, using Underscore.js's throttle function (http://underscorejs.org/#throttle)
osm.throttle('loadavg5', function(event) {

  // whatever is done here will not happen
  // more than once every 5 minutes(300000 ms)

}, 300000);

// change config while monitor is running
osm.config({
  freemem: 0.3 // alarm when 30% or less free memory available
});

// stop monitor
osm.stop();

// check either monitor is running or not
osm.isRunning(); // -> true / false


```

## Event object

There is some useful information in the provided event object:

```
{
  type: 'monitor', // event type
  loadavg: [ 0.4599609375, 0.53076171875, 0.4990234375 ], // load average values for 1, 5, 15 minutes
  uptime: 1614056, // os uptime in seconds
  freemem: 241262592, // free memory available in bytes
  totalmem: 2147483648 // total memory available in bytes
}
```
All supported events are: 'monitor', 'uptime', 'freemem', 'loadavg1', 'loadavg5', 'loadavg15', 'start', 'stop', 'config'.
<em>Note that `os-monitor` is an instance of `EventEmitter`</em>.

Events API docs: [nodejs.org/api/events](http://nodejs.org/api/events.html "Events")


## Using the monitor as a Readable Stream

`os-monitor` can also be used as a [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable "Readable Stream").

```
osm.start({ stream: true });


// write to STDOUT
osm.pipe(process.stdout);


// write to a file
var fs = require('fs'),
    logFile = fs.createWriteStream('/tmp/log.txt', {flags: 'a'});

osm.pipe(logFile);
```

## Node.js os module

The node `os` built-in module is also available from the os-monitor object:

```
var osm = require('os-monitor');

var type = osm.os.type();
var cpus = osm.os.cpus();
```

Documentation for the `os` module is available [here](http://nodejs.org/api/os.html).
