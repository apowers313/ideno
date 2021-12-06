import { readLines } from "../../deps.ts";

export type IpcHandlerType = (msg: Record<string, unknown>) => Promise<void>;

export interface IpcCommConfig {
    recvHandler: IpcHandlerType;
    port?: number;
    ipAddr?: string;
}

export type IpcMessageType = IpcExecRequestMessageType | IpcExecReplyMessageType | IpcHandshakeMessageType;
export type IpcExecRequestMessageType = {
    type: "exec_request";
    code: string;
};

export type IpcExecReplyMessageType = {
    type: "exec_reply";
    // deno-lint-ignore no-explicit-any
    result: any;
};

export type IpcHandshakeMessageType = {
    type: "handshake";
};

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
            console.log("creating server socket...");
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
            console.log("waiting for client to connect..");
            this.socket = await this.listeningSocket.accept();
        }

        if (!this.socket) {
            throw new Error("call init() before run()");
        }

        for await (const msg of readLines(this.socket)) {
            // const msg = new TextDecoder().decode(pkt);
            console.log("IPC RECV:", msg);
            const ret: Record<string, unknown> = JSON.parse(msg);
            await this.recvHandler(ret);
        }
        throw new Error("IPC run done");
    }

    async send(data: Record<string, unknown>) {
        if (!this.socket) {
            throw new Error("call init() before send()");
        }

        const msg = JSON.stringify(data) + "\n";
        console.log("IPC SEND:", data);
        await this.socket.write(new TextEncoder().encode(msg));
    }
}