import { zmq } from "../../deps.ts";
import { Message } from "./message.ts";

export type RecvFnType = (ctx: CommContext) => Promise<void>;
export type RespFnType = (msg: Message) => Promise<void>;
export type HandlerFn = RecvFnType;

export interface CommContext {
    msg: Message;
    send: RespFnType;
    hmacKey: HmacKey;
    sessionId: string;
}

export interface HmacKey {
    alg: "sha256",
    key: string;
}

export interface CommCfg {
    name: string;
    hostname: string;
    port: number;
    sessionId: string;
    hmacKey: HmacKey;
    handler: HandlerFn;
    type?: "pub" | "router" | "reply" | "test";
}

export class Comm {
    public readonly name: string;
    public readonly type: string;
    public readonly hostname: string;
    public readonly port: number;
    public readonly sessionId: string;
    protected socket: zmq.Publisher | zmq.Replier;
    protected handler: HandlerFn;
    protected hmacKey: HmacKey;

    constructor (cfg: CommCfg) {
        this.name = cfg.name;
        this.type = cfg.type ?? "router";
        this.hostname = cfg.hostname;
        this.port = cfg.port;
        this.sessionId = cfg.sessionId;
        this.hmacKey = cfg.hmacKey;
        this.handler = cfg.handler;

        switch (this.type) {
            case "reply":
            case "router":
                this.socket = zmq.Reply();
                break;
            case "pub":
                this.socket = zmq.Publish();
                break;
            default:
                throw new Error(`unknown zmq socket type: ${this.type}`);
        }

    }

    protected createConnStr(): string {
        return `tcp://${this.hostname}:${this.port}`;
    }

    public async init() {
        const connStr = `tcp://${this.hostname}:${this.port}`;

        switch (this.type) {
            case "router":
                await this.routerInit(connStr);
                break;
            case "pub":
                await this.pubInit(connStr);
                break;
        }
    }

    private async pubInit(connStr: string) {
        const socket = (this.socket as zmq.Publisher);
        await socket.bind(connStr);
    }

    protected async routerInit(connStr: string) {
        const socket = (this.socket as zmq.Replier);
        await socket.bind(connStr);

        for await (const messages of socket) {
            console.log(
                `'${this.name}' received: [${messages.map((it) => new TextDecoder().decode(it as Uint8Array)).join(
                    ",",
                )
                }]`,
            );

            messages.forEach((m) => {
                if (!(m instanceof Uint8Array)) {
                    throw new Error("expected to receive an array of Uint8Array");
                }

                console.debug(`ZMQ router '${this.name}' received data: ${m.toString()}`);
            });

            await this.recv((messages as Uint8Array[]));
        }
    }

    public async send(msg: Message): Promise<void> {
        const data: Array<zmq.MessageLike> = await msg.serialize(this.hmacKey);

        Comm.printMessages(`==> SENDING DATA: ${msg.type}`, (data as Array<Uint8Array>), msg);

        return this.socket.send(...data);
    }

    public async recv(data: Array<Uint8Array>) {
        const msg = await Message.from(data, this.hmacKey);
        Comm.printMessages(`<== RECEIVED DATA: ${msg.type}`, data, msg);

        const ctx: CommContext = {
            msg,
            hmacKey: this.hmacKey,
            send: this.send.bind(this),
            sessionId: this.sessionId,
        };

        await this.handler(ctx);
    }

    public async shutdown() { }

    static printMessages(header: string, data: Array<Uint8Array>, msg: Message) {
        // encoded
        console.log("//", header);
        console.log("export const msg:Array<Uint8Array> = [");
        data.forEach((d) => {
            console.log(`    Uint8Array.from([${d.toString()}]),`);
        });
        console.log("];");

        // plain text
        console.log("// DECODED DATA:");
        console.log("header:", msg.header);
        console.log("parent_header:", msg.parentHeader);
        console.log("metadata:", msg.metadata);
        console.log("content:", msg.content);
        console.log("buffers:", msg.buffers);
    }
}

interface CommSubclassConfig {
    ip: string;
    port: number;
    sessionId: string;
    hmacKey: HmacKey;
    handler: HandlerFn;
}

export class ControlComm extends Comm {
    constructor (cfg: CommSubclassConfig) {
        super({
            name: "control",
            type: "router",
            hostname: cfg.ip,
            hmacKey: cfg.hmacKey,
            port: cfg.port,
            sessionId: cfg.sessionId,
            handler: cfg.handler,
        });
    }
}

export class ShellComm extends Comm {
    constructor (cfg: CommSubclassConfig) {
        super({
            name: "shell",
            type: "router",
            hostname: cfg.ip,
            hmacKey: cfg.hmacKey,
            port: cfg.port,
            sessionId: cfg.sessionId,
            handler: cfg.handler,
        });
    }
}

export class StdinComm extends Comm {
    constructor (cfg: CommSubclassConfig) {
        super({
            name: "stdin",
            type: "reply",
            hostname: cfg.ip,
            hmacKey: cfg.hmacKey,
            port: cfg.port,
            sessionId: cfg.sessionId,
            handler: cfg.handler,
        });
    }
}

export class IOPubComm extends Comm {
    constructor (cfg: CommSubclassConfig) {
        super({
            name: "iopub",
            type: "pub",
            hostname: cfg.ip,
            hmacKey: cfg.hmacKey,
            port: cfg.port,
            sessionId: cfg.sessionId,
            handler: cfg.handler,
        });
    }

    public async send(msg: Message): Promise<void> {
        const data: Array<zmq.MessageLike> = await msg.serialize(this.hmacKey);

        // XXX: first data frame is a empty string, representing our topic
        // our zeromq library automatically filters frames that don't match a known topic
        // but no topic is requested and Jupyter automatically passes through ALL topics
        // (see: https://jupyter-client.readthedocs.io/en/latest/messaging.html#the-wire-protocol)
        // 
        // in the event that we change zeromq libraries, we might change our topic to something like this:
        // const topic = `kernel.${this.kernel.metadata.sessionId}.${msg.type}`;
        const res = await this.socket.send("", ...data);
        return res;
    }
}

export class HbComm extends Comm {
    constructor (cfg: CommSubclassConfig) {
        super({
            name: "hb",
            type: "router",
            hostname: cfg.ip,
            hmacKey: cfg.hmacKey,
            port: cfg.port,
            sessionId: cfg.sessionId,
            handler: cfg.handler,
        });
    }

    protected async routerInit(connStr: string) {
        const socket = (this.socket as zmq.Replier);
        await socket.bind(connStr);

        for await (const message of socket) {
            console.log(">>> heartbeat received message", message);
        }
    }
}

export interface CommClass {
    new(cfg: CommSubclassConfig): Comm;
}