declare const stream: any;
export declare enum EventType {
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
export declare class Monitor extends stream.Readable {
    static [x: string]: any;
    constructor();
    get version(): string;
    get constants(): MonitorConstants;
    Monitor: typeof Monitor;
    os: any;
    private _monitorState;
    private _read;
    sendEvent(event: EventType, obj?: Partial<InfoObject>): Monitor;
    private _createInfoObject;
    private _cycle;
    private _sendEvents;
    start(options?: Partial<ConfigObject>): Monitor;
    stop(): Monitor;
    reset(): Monitor;
    destroy(err?: unknown): Monitor;
    config(options?: Partial<ConfigObject>): ConfigObject;
    private _validateConfig;
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
export interface StatFs {
    type: number;
    bsize: number;
    blocks: number;
    bfree: number;
    bavail: number;
    files: number;
    ffree: number;
}
export interface DiskfreeConfig {
    [key: string]: number;
}
export interface ConfigObject {
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
export interface MonitorConstants {
    events: {
        [key: string]: EventType;
    };
    defaults: ConfigObject;
}
export interface DiskfreeInfo {
    [key: string]: number;
}
export interface InfoObject {
    loadavg: Array<number>;
    uptime: number;
    freemem: number;
    totalmem: number;
    diskfree?: DiskfreeInfo;
    options?: Partial<ConfigObject>;
}
export interface EventObject extends Partial<InfoObject> {
    type: EventType;
    timestamp: number;
}
export interface EventHandler {
    (event: EventObject): void;
}
export {};
