declare const events: any, stream: any;
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
    constructor();
    get version(): string;
    get constants(): MonitorConstants;
    Thenable: typeof Thenable;
    Monitor: typeof Monitor;
    os: any;
    _: any;
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
    private _validateConfig;
    isRunning(): boolean;
    private _isEnded;
    throttle(event: EventType, handler: EventHandler, wait: number): Monitor;
    unthrottle(event: EventType, handler: EventHandler): Monitor;
    when(event: EventType): Promise<EventObjectThenable> | EventObjectThenable;
    private _sanitizeNumber;
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
    blocks(bytes: number, blockSize?: number): number;
    createMonitor(): Monitor;
}
export declare class Thenable<Type> extends events.EventEmitter {
    static constants: {
        state: {
            PENDING: string;
            FULFILLED: string;
            REJECTED: string;
        };
    };
    private _thenableState;
    resolve(result: Type): Thenable<Type>;
    reject(error: unknown): Thenable<Type>;
    then(onFulfilled?: ThenableResolvedHandler<Type>, onRejected?: ThenableRejectedHandler<Type>): void;
    catch(onRejected?: ThenableRejectedHandler<Type>): void;
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
export interface ThenableState<Type> {
    state: string;
    result?: Type | unknown;
}
export interface ThenableResolvedHandler<Type> {
    (result: Type | unknown): unknown;
}
export interface ThenableRejectedHandler<Type> {
    (error: unknown): unknown;
}
export type EventObjectThenable = Thenable<EventObject>;
export {};
