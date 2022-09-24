/// <reference types="node" />
declare const os: any, events: any, stream: any, _: any, version: any, critical: number;
declare enum EventType {
    MONITOR = "monitor",
    UPTIME = "uptime",
    FREEMEM = "freemem",
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
    Thenable: typeof Thenable;
    Monitor: typeof Monitor;
    os: any;
    _: any;
    private _monitorState;
    private _read;
    sendEvent(event: EventType, obj?: InfoObject): Monitor;
    private _cycle;
    start(options?: ConfigObject): Monitor;
    stop(): Monitor;
    reset(): Monitor;
    destroy(err?: unknown): Monitor;
    config(options?: ConfigObject): ConfigObject;
    isRunning(): boolean;
    private _isEnded;
    throttle(event: EventType, handler: Function, wait: number): Monitor;
    unthrottle(event: EventType, handler: Function): Monitor;
    when(event: EventType): Promise<EventObjectThenable> | EventObjectThenable;
    private _sanitizeNumber;
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
    createMonitor(): Monitor;
}
declare class Thenable<Type> extends events.EventEmitter {
    constructor();
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
    then(onFulfilled?: Function, onRejected?: Function): void;
    catch(onRejected?: Function): void;
}
interface ConfigObject {
    delay?: number;
    critical1?: number;
    critical5?: number;
    critical15?: number;
    freemem?: number;
    uptime?: number;
    silent?: boolean;
    stream?: boolean;
    immediate?: boolean;
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
        originalFn: Function;
        throttledFn: Function;
    }>;
}
interface MonitorConstants {
    events: {
        [key: string]: EventType;
    };
    defaults: ConfigObject;
}
interface InfoObject {
    loadavg?: Array<number>;
    uptime?: number;
    freemem?: number;
    totalmem?: number;
    options?: ConfigObject;
}
interface EventObject extends InfoObject {
    type: EventType;
    timestamp: number;
}
interface ThenableState<Type> {
    state: string;
    result?: Type | unknown;
}
declare type EventObjectThenable = Thenable<EventObject>;
