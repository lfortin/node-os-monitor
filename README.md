# os-monitor

[![NPM](https://nodei.co/npm/os-monitor.png)](https://nodei.co/npm/os-monitor/)

[![Node.js (install, build and test)](https://github.com/lfortin/node-os-monitor/actions/workflows/node.js.yml/badge.svg?branch=master&event=push)](https://github.com/lfortin/node-os-monitor/actions/workflows/node.js.yml)

A very simple monitor for the built-in `os`, `fs` modules in Node.js.

Allows you to observe some OS parameters, such as free memory available, load average or free disk space.

Released under the [MIT License](https://opensource.org/license/mit).

## Installation

To install the latest stable version of `os-monitor`:

    npm install os-monitor

If you are using an old version of Node.js (older than v18.15.x), you might need the legacy version(1.x) of `os-monitor`; it supports Node.js back to v0.10.x:

    npm install os-monitor@legacy


# Synopsis

```javascript
const { Monitor } = require("os-monitor");

const monitor = new Monitor();


// basic usage
monitor.start();

// more advanced usage with configs.
monitor.start({ delay: 3000 // interval in ms between monitor cycles
              , freemem: 1000000000 // freemem under which event 'freemem' is triggered
              , uptime: 1000000 // number of secs over which event 'uptime' is triggered
              , diskfree: {
                  '/': 100000, // number of free blocks under which event 'diskfree' is triggered
                  '/home': 100000
                }
              , critical1: 0.7 // loadavg1 over which event 'loadavg1' is triggered
              , critical5: 0.7 // loadavg5 over which event 'loadavg5' is triggered
              , critical15: 0.7 // loadavg15 over which event 'loadavg15' is triggered
              , silent: false // set true to mute event 'monitor'
              , stream: false // set true to enable the monitor as a Readable Stream
              , immediate: false // set true to execute a monitor cycle at start()
              });


// define handler that will always fire every cycle
monitor.on('monitor', (event) => {
  console.log(event.type, 'This event always happens on each monitor cycle!');
});

// define handler for a too high 1-minute load average
monitor.on('loadavg1', (event) => {
  console.log(event.type, 'Load average is exceptionally high!');
});

// define handler for a too low free memory
monitor.on('freemem', (event) => {
  console.log(event.type, 'Free memory is very low!');
});

// define a throttled handler
monitor.throttle('loadavg5', (event) => {

  // whatever is done here will not happen
  // more than once every 5 minutes(300000 ms)

}, monitor.minutes(5));


// change config while monitor is running
monitor.config({
  freemem: 0.3 // alarm when 30% or less free memory available
});


// stop monitor
monitor.stop();


// check whether monitor is running or not
monitor.isRunning(); // -> true / false


// use as readable stream
monitor.start({stream: true}).pipe(process.stdout);

```

# config options

###  delay

Delay in milliseconds between each monitor cycle. Default: 3000

###  freemem

Amount of memory in bytes under which event 'freemem' is triggered. Can also be a percentage of total memory. Default: 0

###  uptime

Number of seconds over which event 'uptime' is triggered. Default: undefined

###  diskfree

Object containing free blocks values, for given file system paths, under which event 'diskfree' is triggered. *Supported from Node.js v18.15.x and later. ([ref.](https://nodejs.org/api/fs.html#fsstatfspath-options-callback "statfs"))* Default: {}

###  critical1

Value of 1 minute load average over which event 'loadavg1' is triggered. Default: os.cpus().length

(A Unix-specific concept, the load average is a measure of system activity, calculated by the operating system and expressed as a fractional number. As a rule of thumb, the load average should ideally be less than the number of logical CPUs in the system. ref.: [http://nodejs.org/api/os.html#os_os_loadavg](http://nodejs.org/api/os.html#os_os_loadavg "load average"))

###  critical5

Value of 5 minutes load average over which event 'loadavg5' is triggered. Default: os.cpus().length

###  critical15

Value of 15 minutes load average over which event 'loadavg15' is triggered. Default: os.cpus().length

###  silent

Set true to mute event 'monitor'. Default: false

###  stream

Set true to enable the monitor as a [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable "Readable Stream"). Default: false

###  immediate

Set true to execute a monitor cycle at start(). Default: false


# API

### .version

The `monitor.version` property contains the `os-monitor` version string.

### .start( [options] )

Starts the monitor. Accepts an optional options object.

### .stop( )

Stops the monitor.

### .isRunning( )

Checks whether the monitor is running or not; returns a boolean.

### .config( [options] )

Accepts an optional options object and updates monitor config. Always returns monitor config options.

### .reset( )

Resets monitor config to its default values.

### .on( eventType, handler ), .addListener( eventType, handler )

Adds a listener for the specified event type. Supported events are: 'monitor', 'uptime', 'freemem', 'diskfree', 'loadavg1', 'loadavg5', 'loadavg15', 'start', 'stop', 'config', 'reset', 'destroy'.

### .once( eventType, handler )

Adds a one-time listener for the specified event type. This listener is invoked only the next time the event is fired, after which it is removed.

### .throttle( eventType, handler, delay )

Adds a throttled listener. The throttled listener will not be executed more than once every delay milliseconds.

### .unthrottle( eventType, handler )

Removes a throttled listener previously added using `.throttle()`. `handler` must be the original function.

### .when( eventType )

Returns a Promise that resolves with an event object when `eventType` is triggered.

### .destroy( )

Permanently stops and disables the monitor.

### .seconds( n ), .minutes( n ), .hours( n ), .days( n )

Convenience methods to get the right amount of milliseconds.
```javascript
monitor.seconds(10); // -> 10000 ms

monitor.minutes(5); // -> 300000 ms

monitor.hours(1); // -> 3600000 ms

monitor.days(1); // -> 86400000 ms

// start with a delay of 5000 ms
monitor.start({ delay: monitor.seconds(5) });

```

### .blocks( bytes, blockSize )

Convenience method to get the right amount of file system blocks.
```javascript
monitor.blocks(100000000, 4096); // -> 24415 blocks

// start by observing file system path `/filesystem`
monitor.start({
  diskfree: {
    '/filesystem': monitor.blocks(100000000, 4096)
  }
});

```


## Event object

There is some useful information in the provided event object:

```
{
  "type": "monitor", // event type
  "loadavg": [
    0.4599609375,
    0.53076171875,
    0.4990234375
  ], // load average values for 1, 5, 15 minutes
  "uptime": 1614056, // os uptime in seconds
  "freemem": 241262592, // free memory available in bytes
  "totalmem": 2147483648, // total memory available in bytes
  "diskfree": {
    "/": 25786328,
    "/home": 12786329
  }, // available blocks per file system path, if any config was passed for 'diskfree' event
  "timestamp": 1394766898 // UNIX Timestamp
}
```
All supported events are: 'monitor', 'uptime', 'freemem', 'diskfree', 'loadavg1', 'loadavg5', 'loadavg15', 'start', 'stop', 'config', 'reset', 'destroy'.
<em>Note that `os-monitor` is an instance of `EventEmitter`</em>.

Events API docs: [nodejs.org/api/events](http://nodejs.org/api/events.html "Events")


## Using the monitor as a Readable Stream

`os-monitor` can also be used as a [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable "Readable Stream").

```
monitor.start({ stream: true });


// write to STDOUT
monitor.pipe(process.stdout);


// write to a file
let fs = require('fs'),
    logFile = fs.createWriteStream('/tmp/log.txt', {flags: 'a'});

monitor.pipe(logFile);
```


## Promise

`os-monitor` supports Promise, async/await: using `.when(eventType)` returns a Promise.

```
monitor.when('freemem').then(event => {
    // ...
});

async function callback() {
    let event = await monitor.when('uptime');
    // ...
}
```


## Monitor class

Need concurrent monitor instances? Multiple instances can be created using the `Monitor` class:

```
const { Monitor } = require('os-monitor');

let monitor1 = new Monitor();
let monitor2 = new Monitor();
let monitor3 = new Monitor();
```


## License

`os-monitor` is released under the [MIT License](https://github.com/lfortin/node-os-monitor/blob/master/LICENSE).

**100% Free:** `os-monitor` can be used freely in both proprietary and open-source projects.

**Attribution is required:** You must retain the author's name and the license information in any distributed code. These items do not need to be user-facing and can remain within the codebase.