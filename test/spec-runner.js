
const assert = require('node:assert'),
          fs = require('node:fs'),
      stream = require('node:stream'),
        mock = require('mock-os'),
       sinon = require('sinon'),
           _ = require('underscore'),
      semver = require('semver');

const monitor     = require('../os-monitor'),
      { version } = require('../package.json');

function delay(n) {
  return new Promise((resolve, reject) => setTimeout(resolve, n));
}

let tester;

if(semver.lt(process.version, '18.15.0')) {
  throw 'Node.js v18.15.0 or later is required to run tests';
}

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
describe('factory method', function() {
  it('should create new instances without options', async () => {
    assert.ok(tester.createMonitor() instanceof monitor.Monitor);
  });
  it('should create new instances with options', async () => {
    const monitorWithOptions = tester.createMonitor({delay: 10000});
    assert.ok(monitorWithOptions instanceof monitor.Monitor);
    assert.strictEqual(monitorWithOptions.config().delay, 10000);
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
    assert.ok(tester.blocks, ".blocks() method expected");
    assert.ok(tester.Monitor, "Monitor class expected");
    assert.ok(tester.os, "os object reference expected");
    assert.ok(tester.constants, "constants object expected");
    assert.ok(tester.createMonitor, "factory method expected");
  });
  it('should have readonly version', async () => {
    let version = tester.version;
    tester.version = '0.0.0';
    assert.strictEqual(tester.version, version);
  });
  it('should have version from package.json', async () => {
    assert.strictEqual(tester.version, version);
  });
});
describe('constants', function() {
  it('should have readonly constants', async () => {
    tester.constants.events.INVALID = 'invalid';
    assert.notStrictEqual(tester.constants.events.INVALID, 'invalid');
  });
  it('should have constants with unique object references', async () => {
    assert.ok(tester.constants !== tester.constants, "unique object references expected");
    assert.ok(tester.constants.events !== tester.constants.events, "unique object references expected");
    assert.ok(tester.constants.defaults !== tester.constants.defaults, "unique object references expected");
  });
});
describe('event emitter', function() {
  it('should emit start event', (done) => {
    let config = Object.assign({}, tester.constants.defaults, {uptime: 1234567, immediate: true});
    tester.on('start', event => {
      assert.strictEqual(event.type, tester.constants.events.START);
      assert.strictEqual(tester.isRunning(), true);
      assert.deepStrictEqual(tester.config(), config);
      done();
    });
    tester.start(config);
  });
  it('should emit stop event', (done) => {
    tester.start({
      immediate: true,
    });
    tester.on('stop', event => {
      assert.strictEqual(event.type, tester.constants.events.STOP);
      assert.strictEqual(tester.isRunning(), false);
      done();
    });
    tester.stop();
  });
  it('should emit config event', (done) => {
    tester.on('config', event => {
      assert.strictEqual(event.type, tester.constants.events.CONFIG);
      assert.deepStrictEqual(event.options, {stream: true, immediate: true});
      let config = Object.assign({}, tester.constants.defaults, {stream: true, immediate: true});
      assert.deepStrictEqual(tester.config(), config);
      done();
    });
    tester.config({stream: true, immediate: true});
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
      assert.ok(!event.diskfree);
      done();
    });
    tester.start({
      immediate: true
    });
  });

  it('should emit monitor event(with diskfree config)', (done) => {
    const stub = sinon.stub(fs.promises, 'statfs').callsFake(async (path) => {
      return {
        type: 1397114950,
        bsize: 4096,
        blocks: 121938943,
        bfree: 61058895,
        bavail: 61058895,
        files: 999,
        ffree: 1000000,
      };
    });
    tester.on('monitor', event => {
      assert.strictEqual(event.type, tester.constants.events.MONITOR);
      assert.ok(event.loadavg);
      assert.ok(event.freemem);
      assert.ok(event.totalmem);
      assert.ok(event.uptime);
      assert.ok(event.timestamp);
      assert.ok(event.diskfree);
      assert.strictEqual(event.diskfree['/'], 61058895);
      stub.restore();
      done();
    });
    tester.start({
      immediate: true,
      diskfree: {
        '/': 123
      }
    });
  });
  it('should not emit monitor event', (done) => {
    tester.on('monitor', event => {
      done('should not emit monitor event');
    });
    tester.start({
      immediate: true,
      silent: true,
    });
    setImmediate(done);
  });
  describe('loadavg', function() {
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
    it('should not emit loadavg1 event', (done) => {
      tester.on('loadavg1', event => {
        done('should not emit loadavg1 event');
      });
      tester.start({
        critical1: 3,
        immediate: true,
      });
      setImmediate(done);
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
    it('should not emit loadavg5 event', (done) => {
      tester.on('loadavg5', event => {
        done('should not emit loadavg5 event');
      });
      tester.start({
        critical5: 3,
        immediate: true,
      });
      setImmediate(done);
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
    it('should not emit loadavg15 event', (done) => {
      tester.on('loadavg15', event => {
        done('should not emit loadavg15 event');
      });
      tester.start({
        critical15: 3,
        immediate: true,
      });
      setImmediate(done);
    });
  });
  describe('freemem', function() {
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
    it('should not emit freemem event', (done) => {
      tester.on('freemem', event => {
        done('should not emit freemem event');
      });
      tester.start({
        freemem: 99999,
        immediate: true,
      });
      setImmediate(done);
    });
    it('should emit freemem event(% config)', (done) => {
      tester.start({
        freemem: 0.99,
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
    it('should not emit freemem event(% config)', (done) => {
      tester.on('freemem', event => {
        done('should not emit freemem event(% config)');
      });
      tester.start({
        freemem: 0.01,
        immediate: true,
      });
      setImmediate(done);
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
  it('should not emit uptime event', (done) => {
    tester.on('uptime', event => {
      done('should not emit uptime event');
    });
    tester.start({
      uptime: 9999999999,
      immediate: true,
    });
    setImmediate(done);
  });
  describe('diskfree', function() {
    it('should emit diskfree event', (done) => {
      const stub = sinon.stub(fs.promises, 'statfs').callsFake(async (path) => {
        if(path === '/path1') {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 61058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        } else if(path === '/path2') {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 41058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        } else {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 61058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        }
      });
      tester.start({
        diskfree: {'/path1': 71058895, '/path2': 1000},
        immediate: true,
      });
      tester.on('diskfree', event => {
        assert.strictEqual(event.type, tester.constants.events.DISKFREE);
        assert.ok(event.loadavg);
        assert.ok(event.freemem);
        assert.ok(event.totalmem);
        assert.ok(event.uptime);
        assert.ok(event.diskfree);
        assert.strictEqual(event.diskfree['/path1'], 61058895);
        assert.strictEqual(event.diskfree['/path2'], 41058895);
        assert.ok(event.timestamp);
        assert.ok(fs.promises.statfs.calledTwice);
        stub.restore();
        done();
      });
    });
    it('should not emit diskfree event', (done) => {
      const stub = sinon.stub(fs.promises, 'statfs').callsFake(async (path) => {
        if(path === '/path1') {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 61058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        } else if(path === '/path2') {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 61058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        } else {
          return {
            type: 1397114950,
            bsize: 4096,
            blocks: 121938943,
            bfree: 61058895,
            bavail: 61058895,
            files: 999,
            ffree: 1000000,
          };
        }
      });
      tester.on('diskfree', event => {
        done('should not emit diskfree event');
      });
      tester.start({
        diskfree: {'/path2': 1000},
        immediate: true,
      });
      setImmediate(() => {
        assert.ok(fs.promises.statfs.calledOnce);
        stub.restore();
        done();
      });
    });
    it('should emit error event when fs.promises.statfs() throws', (done) => {
      const stub = sinon.stub(fs.promises, 'statfs').callsFake(async () => {
        throw new Error('fs.promises.statfs() failed');
      });
      tester.on('diskfree', event => {
        done('should not emit diskfree event');
      });
      tester.start({
        diskfree: {'/path1': 1000},
        immediate: true,
      });
      tester.on('error', event => {
        assert.ok(fs.promises.statfs.calledOnce);
        stub.restore();
        done();
      });
    });
    it('should throw if fs.statfs does not exist', async () => {
      const statfs = fs.statfs;
      fs.statfs = undefined;
      try {
        assert.throws(() => {
          tester.start({
            diskfree: {'/path1': 1000},
          });
        });
      } catch(err) {
        fs.statfs = statfs;
        throw err;
      }
      fs.statfs = statfs;
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
  it('should emit data event', (done) => {
    tester.config({stream: true});
    tester.setEncoding('utf8');
    tester.resume();

    process.nextTick(() => {
      tester.once('data', event => {
        let eventObj = JSON.parse(event);
        assert.strictEqual(eventObj.type, tester.constants.events.START);
        assert.ok(eventObj.timestamp);
        done();
      });
      tester.start();
    });
  });
  it('should pipe on writable stream', (done) => {
    let writable = new stream.PassThrough();
    writable.once('data', () => done());
    tester.start({
      stream: true,
      immediate: true,
    }).pipe(writable);
  });
  it('should stop buffering if full and not flowing', async () => {
    tester.config({
      stream: true,
      immediate: true,
      silent: false,
    });
    tester.push(Buffer.alloc(200000));
    tester.start();
    await delay(1);
    assert.strictEqual(tester.push('hello'), false);
    assert.strictEqual(tester._monitorState.streamBuffering, false);
    tester.read();
    await delay(1);
    assert.strictEqual(tester.push('hello'), true);
    assert.strictEqual(tester._monitorState.streamBuffering, true);
    tester.pause();
    tester.push(Buffer.alloc(200000));
    tester.start();
    await delay(1);
    assert.strictEqual(tester.push('hello'), false);
    assert.strictEqual(tester._monitorState.streamBuffering, false);
    tester.resume();
    tester.push(Buffer.alloc(200000));
    tester.start();
    await delay(1);
    assert.strictEqual(tester.push('hello'), true);
    assert.strictEqual(tester._monitorState.streamBuffering, true);
  });
  it('should emit close event when destroyed', (done) => {
    tester.on('close', event => {
      done();
    });
    tester.destroy();
  });
});
describe('cycles', function() {
  it('should execute multiple cycles', (done) => {
    let cycles = 0;
    tester.start({delay: 3});
    tester.on('monitor', () => {
      cycles++;
    });
    tester.on('stop', () => {
      assert.ok(cycles > 2);
      done();
    });
    setTimeout(() => tester.stop(), 50);
  });
});
describe('.throttle()', function() {
  it('should register throttled handler', (done) => {
    let cycles = 0;
    tester.throttle('monitor', event => {
      if(event.type !== tester.constants.events.MONITOR) {
        done(`event.type should be === '${tester.constants.events.MONITOR}'`);
      }
      cycles++;
    }, 30);
    tester.on('stop', event => {
      assert.ok(cycles < 3);
      done();
    });
    tester.start({delay: 5});
    setTimeout(() => {
      tester.stop();
    }, 50);
  });
  it('should fail if handler is not a function', async () => {
    assert.throws(() => {
      tester.throttle('monitor', 123);
    });
  });
});
describe('.unthrottle()', function() {
  it('should remove throttled handler', (done) => {
    let cycles = 0;
    let handler = (event) => {
      cycles++;
    }
    tester.throttle('monitor', _.noop, 50);
    tester.throttle('freemem', _.noop, 50);
    tester.throttle('monitor', handler, 50);
    tester.throttle('freemem', handler, 50);
    tester.unthrottle('monitor', handler);

    assert.strictEqual(tester.listenerCount(tester.constants.events.MONITOR), 1);
    assert.strictEqual(tester.listenerCount(tester.constants.events.FREEMEM), 2);

    tester.on('stop', event => {
      assert.strictEqual(cycles, 0);
      done();
    });
    tester.start({delay: 2});
    setTimeout(() => {
      tester.stop();
    }, 15);
  });
});
describe('.when()', function() {
  it('should return a promise that resolves', async () => {
    tester.start({delay: 10});
    let event = await tester.when('monitor');
    assert.strictEqual(event.type, 'monitor');
    assert.ok(tester.when('monitor') instanceof Promise);
  });
});
describe('.reset()', function() {
  it('should reset config to defaults', async () => {
    tester.config({
      delay: 1,
      freemem: 0,
      uptime: 0,
      critical1: 0,
      critical5: 0,
      critical15: 0,
      immediate: true,
      silent: true,
      stream: true,
    });
    tester.reset();
    assert.deepStrictEqual(tester.config(), tester.constants.defaults);
  });
});
describe('.destroy()', function() {
  it('should permanently stop and throw error', async () => {
    tester.destroy();
    assert.throws(() => {
      tester.start();
    });
  });
  it('should permanently stop and emit error event', (done) => {
    tester.on('error', err => {
      done();
    });
    tester.destroy();
    tester.start();
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
  describe('.blocks()', function() {
    it('should convert bytes into blocks', async () => {
      assert.strictEqual(tester.blocks(2048, 2048), 1);
    });
    it('should convert bytes into blocks using default blockSize', async () => {
      assert.strictEqual(tester.blocks(2048), 2048);
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
