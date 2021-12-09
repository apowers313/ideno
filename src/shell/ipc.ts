import { readLines } from "../../deps.ts";

// deno-lint-ignore no-explicit-any
function log(..._args: Array<any>) { }

export type RawIpcMessageInterface = string;
export type IpcMessageInterface = ExecMsg | ExecResultMsg | ExecErrorMsg | ExecContextReadyMsg;
export type IpcHandlerType = (msg: IpcMessage) => Promise<void>;

export class IpcMessage {
    data: IpcMessageInterface;
    type: string;

    constructor (value: IpcMessageInterface | RawIpcMessageInterface) {
        let data: IpcMessageInterface;
        if (typeof value === "string") {
            data = this.parse(value);
        } else {
            data = value;
        }

        this.data = data;
        if (!data.type) {
            throw new Error("IpcMessage type not specified");
        }
        this.type = data.type;
    }

    serialize(): string {
        return JSON.stringify(this.data) + "\n";
    }

    parse(str: string): IpcMessageInterface {
        const data = JSON.parse(str);
        this.validate(data);
        return data;
    }

    validate(_data: unknown): _data is IpcMessageInterface {
        return true;
    }
}

export interface ExecMsg {
    type?: "exec",
    code: string,
    history: boolean,
}

export class IpcExecMessage extends IpcMessage {
    data: ExecMsg;

    constructor (data: ExecMsg | RawIpcMessageInterface) {
        if (typeof data === "object") data.type = "exec";
        super(data);
        this.data = (data as ExecMsg);
    }

    validate(data: ExecMsg): data is ExecMsg {
        if (data.type !== "exec" ||
            typeof data.code !== "string" ||
            typeof data.history !== "boolean") {
            throw new Error("malformed exec request");
        }

        return true;
    }
}

export interface ExecResultMsg {
    type?: "exec_result",
    status: "ok",
    // deno-lint-ignore no-explicit-any
    result: any;
}

export class IpcExecResultMessage extends IpcMessage {
    constructor (data: ExecResultMsg | RawIpcMessageInterface) {
        if (typeof data === "object") data.type = "exec_result";
        super(data);
    }
}

export interface ExecErrorMsg {
    type?: "exec_error",
    status: "error",
    error: Error,
}

export class IpcExecErrorMessage extends IpcMessage {
    constructor (data: ExecErrorMsg | RawIpcMessageInterface) {
        if (typeof data === "object") data.type = "exec_error";
        super(data);
    }
}

export interface ExecContextReadyMsg {
    type: string,
    ready: boolean;
}

export class IpcExecContextReadyMessage extends IpcMessage {
    constructor (msg?: string) {
        let data;
        if (!msg) {
            data = { type: "ready", ready: true };
        } else {
            data = msg;
        }

        super(data);
    }
}

export interface IpcCommConfig {
    recvHandler: IpcHandlerType;
    port?: number;
    ipAddr?: string;
}

export class IpcComm {
    recvHandler: IpcHandlerType;
    listeningSocket: Deno.Listener | undefined;
    socket: Deno.Conn | undefined;
    port = 0;
    ipAddr = "127.0.0.1";
    isServer = false;

    constructor (cfg: IpcCommConfig) {
        this.recvHandler = cfg.recvHandler;
        this.port = cfg.port ?? this.port;
        this.ipAddr = cfg.ipAddr ?? this.ipAddr;
    }

    async init() {
        if (!this.port) {
            log("creating server socket...");
            this.isServer = true;
            this.listeningSocket = Deno.listen({
                transport: "tcp",
                hostname: this.ipAddr,
                port: this.port
            });
            this.port = (this.listeningSocket.addr as Deno.NetAddr).port;
        } else {
            this.isServer = false;
            this.socket = await Deno.connect({
                transport: "tcp",
                hostname: this.ipAddr,
                port: this.port
            });
        }
    }

    shutdown() {
        if (!this.socket) {
            throw new Error("call init() before shutdown()");
        }

        this.socket.close();
    }

    async run() {
        if (this.isServer) {
            if (!this.listeningSocket) throw new Error("call init() before run() for server");
            if (this.socket) throw new Error("run() called multiple times");
            // accept just one connection
            log("waiting for client to connect..");
            this.socket = await this.listeningSocket.accept();
        }

        if (!this.socket) {
            throw new Error("call init() before run()");
        }

        for await (const msg of readLines(this.socket)) {
            // const msg = new TextDecoder().decode(pkt);
            log("IPC RECV:", msg);
            const ret = new IpcMessage(msg);
            await this.recvHandler(ret);
        }
        throw new Error("IPC run done");
    }

    async send(msg: IpcMessage) {
        if (!this.socket) {
            throw new Error("call init() before send()");
        }

        const data = msg.serialize();
        log("IPC SEND:", data);
        await this.socket.write(new TextEncoder().encode(data));
    }
}