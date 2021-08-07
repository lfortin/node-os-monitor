declare const os: any, events: any, stream: any, _: any, version: any, critical: number;
declare class Monitor extends stream.Readable {
    constructor();
    get version(): string;
    get constants(): MonitorConstants;
    os: any;
    _: any;
    private _monitorState;
    private _read;
    sendEvent(event: string, obj?: InfoObject): Monitor;
    private _cycle;
    start(options?: ConfigObject): Monitor;
    stop(): Monitor;
    reset(): Monitor;
    destroy(err?: any): Monitor;
    config(options?: ConfigObject): ConfigObject;
    isRunning(): boolean;
    private _isEnded;
    throttle(event: string, handler: Function, wait: number): Monitor;
    unthrottle(event: string, handler: Function): Monitor;
    when(event: string): Promise<Thenable> | Thenable;
    private _sanitizeNumber;
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
}
declare class Thenable extends events.EventEmitter {
    constructor();
    static constants: {
        state: {
            PENDING: string;
            FULFILLED: string;
            REJECTED: string;
        };
    };
    private _thenableState;
    resolve(result: EventObject): Thenable;
    reject(error: any): Thenable;
    then(onFulfilled: Function | undefined, onRejected: Function | undefined): void;
    catch(onRejected: Function | undefined): void;
    private _callOnFulfilled;
    private _callOnRejected;
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
    interval: any;
    config: ConfigObject;
    throttled: Array<{
        originalFn: Function;
        throttledFn: Function;
    }>;
}
interface MonitorConstants {
    events: {
        MONITOR: string;
        UPTIME: string;
        FREEMEM: string;
        LOADAVG1: string;
        LOADAVG5: string;
        LOADAVG15: string;
        START: string;
        STOP: string;
        CONFIG: string;
        RESET: string;
        DESTROY: string;
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
    eventType: string;
    timestamp: number;
}
