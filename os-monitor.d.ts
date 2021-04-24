declare const os: any, stream: any, _: any, critical: number, defaults: Function;
declare class Monitor extends stream.Readable {
    constructor();
    get version(): string;
    get constants(): {
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
    };
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
    private _sanitizeNumber;
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
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
interface InfoObject {
    loadavg?: Array<number>;
    uptime?: number;
    freemem?: number;
    totalmem?: number;
    options?: ConfigObject;
}
