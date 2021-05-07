
const assert = require('assert'),
          os = require('os'),
        mock = require('mock-os'),
           _ = require('underscore');

const monitor = require('../os-monitor');
let tester;

beforeEach(() => {
  mock({
    cpus: [{}, {}],
    loadavg: [2, 2, 2],
    freemem: 1000000,
    totalmem: 100000000,
    uptime: 1000000,
  });
  tester = new monitor.Monitor();
});
afterEach(() => {
  tester.destroy();
  mock.restore();
});

describe('Monitor class', function() {
  it('should have default instance', async () => {
    assert.ok(monitor instanceof monitor.Monitor);
  });
  it('should create new instances', async () => {
    assert.ok(tester instanceof monitor.Monitor);
  });
});
describe('API signature', function() {
  it('should have valid API signature', async () => {
    // API signature
    assert.ok(tester._read, "internal ._read() method expected");
    assert.ok(tester.version, "version property expected");
    assert.ok(tester.sendEvent, ".sendEvent() method expected");
    assert.ok(tester.start, ".start() method expected");
    assert.ok(tester.stop, ".stop() method expected");
    assert.ok(tester.reset, ".reset() method expected");
    assert.ok(tester.destroy, ".destroy() method expected");
    assert.ok(tester.config, ".config() method expected");
    assert.ok(tester.isRunning, ".isRunning() method expected");
    assert.ok(tester.throttle, ".throttle() method expected");
    assert.ok(tester.unthrottle, ".unthrottle() method expected");
    assert.ok(tester.when, ".when() method expected");
    assert.ok(tester.seconds, ".seconds() method expected");
    assert.ok(tester.minutes, ".minutes() method expected");
    assert.ok(tester.hours, ".hours() method expected");
    assert.ok(tester.days, ".days() method expected");
    assert.ok(tester.Monitor, "Monitor class expected");
    assert.ok(tester.Thenable, "Thenable class expected");
    assert.ok(tester.os, "os object reference expected");
    assert.ok(tester._, "_ object reference expected");
    assert.ok(tester.constants, "constants object expected");
    //assert.ok(monitor.whetever, "whatever expected");
  });
  it('should have readonly version', async () => {
    let version = tester.version;
    tester.version = '0.0.0';
    assert.strictEqual(tester.version, version);
  });
});
describe('event emitter', function() {
  it('should emit start event', (done) => {
    tester.on('start', event => {
      assert.strictEqual(event.type, tester.constants.events.START);
      done();
    });
    tester.start();
  });
  it('should emit stop event', (done) => {
    tester.start({
      immediate: true,
    });
    tester.on('stop', event => {
      assert.strictEqual(event.type, tester.constants.events.STOP);
      done();
    });
    tester.stop();
  });
  it('should emit config event', (done) => {
    tester.on('config', event => {
      assert.strictEqual(event.type, tester.constants.events.CONFIG);
      assert.strictEqual(event.options.stream, true);
      done();
    });
    tester.config({stream: true});
  });
  it('should emit reset event', (done) => {
    tester.on('reset', event => {
      assert.strictEqual(event.type, tester.constants.events.RESET);
      done();
    });
    tester.reset();
  });
  it('should emit destroy event', (done) => {
    tester.on('destroy', event => {
      assert.strictEqual(event.type, tester.constants.events.DESTROY);
      done();
    });
    tester.destroy();
  });
  it('should emit monitor event', (done) => {
    tester.on('monitor', event => {
      assert.strictEqual(event.type, tester.constants.events.MONITOR);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
    tester.start({
      immediate: true,
    });
  });
  it('should not emit monitor event', async () => {
    tester.on('monitor', event => {
      assert.fail('should not emit monitor event');
    });
    tester.start({
      immediate: true,
      silent: true,
    });
  });
  it('should emit loadavg1 event', (done) => {
    tester.start({
      critical1: 1,
      immediate: true,
    });
    tester.on('loadavg1', event => {
      assert.strictEqual(event.type, tester.constants.events.LOADAVG1);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
  });
  it('should emit loadavg5 event', (done) => {
    tester.start({
      critical5: 1,
      immediate: true,
    });
    tester.on('loadavg5', event => {
      assert.strictEqual(event.type, tester.constants.events.LOADAVG5);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
  });
  it('should emit loadavg15 event', (done) => {
    tester.start({
      critical15: 1,
      immediate: true,
    });
    tester.on('loadavg15', event => {
      assert.strictEqual(event.type, tester.constants.events.LOADAVG15);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
  });
  it('should emit freemem event', (done) => {
    tester.start({
      freemem: 10000000,
      immediate: true,
    });
    tester.on('freemem', event => {
      assert.strictEqual(event.type, tester.constants.events.FREEMEM);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
  });
  it('should emit uptime event', (done) => {
    tester.start({
      uptime: 10000,
      immediate: true,
    });
    tester.on('uptime', event => {
      assert.strictEqual(event.type, tester.constants.events.UPTIME);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      done();
    });
  });
});
describe('readable stream', function() {
  it('should read data', async () => {
    tester.pause();
    tester.start({
      stream: true,
      immediate: true,
    });
    assert.ok(tester.read());
  });
  it('should stop buffering if full', async () => {
    tester.pause();
    tester.push(Buffer.alloc(200000));
    tester.start({
      stream: true,
      immediate: true,
    });
    assert.strictEqual(tester.push('hello'), false);
  });
});
describe('cycles', function() {
  it('should execute multiple cycles', (done) => {
    let cycles = 0;
    tester.start({delay: 25});
    tester.on('monitor', () => {
      cycles++;
    });
    tester.on('stop', () => {
      assert.ok(cycles > 2);
      done();
    });
    setTimeout(() => tester.stop(), 100);
  });
});
describe('.throttle()', function() {
  it('should register throttled handler', (done) => {
    let cycles = 0;
    tester.throttle('monitor', event => {
      cycles++;
    }, 50);
    tester.on('stop', event => {
      assert.ok(cycles < 3);
      done();
    });
    tester.start({delay: 10});
    setTimeout(() => {
      tester.stop();
    }, 100);
  });
});
describe('.unthrottle()', function() {
  it('should remove throttled handler', (done) => {
    let cycles = 0;
    let handler = (event) => {
      cycles++;
    }
    tester.throttle('monitor', handler, 50);
    tester.unthrottle('monitor', handler);
    tester.on('stop', event => {
      assert.strictEqual(cycles, 0);
      done();
    });
    tester.start({delay: 10});
    setTimeout(() => {
      tester.stop();
    }, 100);
  });
});
describe('.when()', function() {
  it('should return a promise that resolves', async () => {
    tester.start({delay: 10});
    let event = await tester.when('monitor');
    assert.strictEqual(event.type, 'monitor');
    assert.ok(tester.when('monitor') instanceof Promise);
  });
  it('should return a thenable that resolves', async () => {
    let resolve = Promise.resolve;
    delete Promise.resolve;
    tester.start({delay: 10});
    let event = await tester.when('monitor');
    assert.strictEqual(event.type, 'monitor');
    assert.ok(tester.when('monitor') instanceof tester.Thenable);
    Promise.resolve = resolve;
  });
});
describe('Thenable class', function() {
  it('should create a thenable that resolves', (done) => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.then(result => {
      assert.strictEqual(result, value);
      done();
    });
    deferred.resolve(value);
  });
  it('should create a thenable that rejects', (done) => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.catch(reason => {
      assert.strictEqual(reason, value);
      done();
    });
    deferred.reject(value);
  });
  it('should handle multiple resolutions', (done) => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.then(result => {
      assert.strictEqual(result, value);
      done();
    });
    deferred.resolve(value);
    deferred.resolve();
    deferred.reject(12345);
  });
  it('should handle multiple rejections', (done) => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.catch(reason => {
      assert.strictEqual(reason, value);
      done();
    });
    deferred.reject(value);
    deferred.reject();
    deferred.resolve(12345);
  });
  it('should handle early resolution', async () => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.resolve(value);
    deferred.resolve(123);
    deferred.reject(12345);
    let result = await deferred;
    assert.strictEqual(result, value);
  });
  it('should handle early rejection', async () => {
    let deferred = new tester.Thenable();
    let value = {};
    deferred.reject(value);
    deferred.resolve(123);
    deferred.reject(12345);
    assert.rejects(async () => {
      await deferred;
    });
  });
});
describe('.destroy()', function() {
  it('should permanently stop', async () => {
    tester.destroy();
    assert.throws(() => {
      tester.start();
    });
  });
});
describe('convenience methods', function() {
  describe('.seconds(), .minutes(), .hours(), .days()', function() {
    it('should convert seconds into ms', async () => {
      assert.strictEqual(tester.seconds(1), 1000);
      assert.strictEqual(tester.seconds(5), 5000);
    });
    it('should convert minutes into ms', async () => {
      assert.strictEqual(tester.minutes(1), 60000);
      assert.strictEqual(tester.minutes(5), 300000);
    });
    it('should convert hours into ms', async () => {
      assert.strictEqual(tester.hours(1), 3600000);
      assert.strictEqual(tester.hours(10), 36000000);
    });
    it('should convert days into ms', async () => {
      assert.strictEqual(tester.days(1), 86400000);
      assert.strictEqual(tester.days(2), 172800000);
    });
    it('should fail if not a number', async () => {
      assert.throws(() => {
        tester._sanitizeNumber('not a number');
      });
      assert.throws(() => {
        tester.seconds('not a number');
      });
      assert.throws(() => {
        tester.minutes('not a number');
      });
      assert.throws(() => {
        tester.hours('not a number');
      });
      assert.throws(() => {
        tester.days('not a number');
      });
    });
    it('should fail if < 0', async () => {
      assert.throws(() => {
        tester._sanitizeNumber(-1);
      });
      assert.throws(() => {
        tester.seconds(-1);
      });
      assert.throws(() => {
        tester.minutes(-1);
      });
      assert.throws(() => {
        tester.hours(-1);
      });
      assert.throws(() => {
        tester.days(-1);
      });
    });
    it('should fail if > 2147483648', async () => {
      assert.throws(() => {
        tester._sanitizeNumber(2147483649);
      });
      assert.throws(() => {
        tester.seconds(2147483649);
      });
      assert.throws(() => {
        tester.minutes(2147483649);
      });
      assert.throws(() => {
        tester.hours(2147483649);
      });
      assert.throws(() => {
        tester.days(2147483649);
      });
    });
  });
});
describe('chainable methods', function() {
  it('should support chainable methods', async () => {
    tester.start()
          .reset()
          .stop()
          .throttle('start', _.noop)
          .unthrottle('start', _.noop)
          .sendEvent('start')
          .destroy();
  });
});
describe('.isRunning()', function() {
  it('should check if monitor is running', async () => {
    assert.strictEqual(tester.isRunning(), false);
    tester.start();
    assert.strictEqual(tester.isRunning(), true);
    tester.stop();
    assert.strictEqual(tester.isRunning(), false);
  });
});
