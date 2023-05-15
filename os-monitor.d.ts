/// <reference types="node" />
declare const os: any, fs: any, stream: any, throttle: any, isNumber: any, version: any, critical: number;
declare enum EventType {
    MONITOR = "monitor",
    UPTIME = "uptime",
    FREEMEM = "freemem",
    DISKFREE = "diskfree",
    LOADAVG1 = "loadavg1",
    LOADAVG5 = "loadavg5",
    LOADAVG15 = "loadavg15",
    START = "start",
    STOP = "stop",
    CONFIG = "config",
    RESET = "reset",
    DESTROY = "destroy"
}
declare class Monitor extends stream.Readable {
    constructor();
    get version(): string;
    get constants(): MonitorConstants;
    Monitor: typeof Monitor;
    os: any;
    private _monitorState;
    private _read;
    sendEvent(event: EventType, obj?: Partial<InfoObject>): Monitor;
    private _cycle;
    private _sendEvents;
    start(options?: Partial<ConfigObject>): Monitor;
    stop(): Monitor;
    reset(): Monitor;
    destroy(err?: unknown): Monitor;
    config(options?: Partial<ConfigObject>): ConfigObject;
    isRunning(): boolean;
    private _isEnded;
    throttle(event: EventType, handler: EventHandler, wait: number): Monitor;
    unthrottle(event: EventType, handler: EventHandler): Monitor;
    when(event: EventType): Promise<EventObject>;
    private _sanitizeNumber;
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
    blocks(bytes: number, blockSize?: number): number;
    createMonitor(): Monitor;
}
interface StatFs {
    type: number;
    bsize: number;
    blocks: number;
    bfree: number;
    bavail: number;
    files: number;
    ffree: number;
}
interface DiskfreeConfig {
    [key: string]: number;
}
interface ConfigObject {
    delay: number;
    critical1: number;
    critical5: number;
    critical15: number;
    freemem: number;
    uptime: number;
    silent: boolean;
    stream: boolean;
    immediate: boolean;
    diskfree: DiskfreeConfig;
    throttle?: number;
}
interface MonitorState {
    running: boolean;
    ended: boolean;
    streamBuffering: boolean;
    interval?: NodeJS.Timeout;
    config: ConfigObject;
    throttled: Array<{
        event: EventType;
        originalFn: EventHandler;
        throttledFn: EventHandler;
    }>;
}
interface MonitorConstants {
    events: {
        [key: string]: EventType;
    };
    defaults: ConfigObject;
}
interface DiskfreeInfo {
    [key: string]: number;
}
interface InfoObject {
    loadavg: Array<number>;
    uptime: number;
    freemem: number;
    totalmem: number;
    diskfree?: DiskfreeInfo;
    options?: Partial<ConfigObject>;
}
interface EventObject extends Partial<InfoObject> {
    type: EventType;
    timestamp: number;
}
interface EventHandler {
    (event: EventObject): void;
}
