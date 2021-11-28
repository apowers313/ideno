import { zmq } from "../../deps.ts";
import type { Kernel } from "../kernel.ts";
import { Message, KernelInfoReplyMessage, KernelInfoContent } from "./message.ts";

export interface CommContext {
    msg: Message;
    kernel: Kernel;
    send: RespFnType;
}

export interface CommCfg {
    name: string;
    hostname: string;
    port: number;
    kernel: Kernel;
    type?: "pub" | "router" | "reply";
}

export type RecvFnType = (ctx: CommContext) => Promise<void>;
export type RespFnType = (msg: Message) => Promise<void>;

export class Comm {
    public readonly name: string;
    public readonly type: string;
    public readonly hostname: string;
    public readonly port: number;
    protected kernel: Kernel;
    protected socket: zmq.Publisher | zmq.Replier;
    private handlers: Map<string, RecvFnType> = new Map();

    constructor (cfg: CommCfg) {
        this.name = cfg.name;
        this.type = cfg.type ?? "router";
        this.hostname = cfg.hostname;
        this.port = cfg.port;
        this.kernel = cfg.kernel;
        switch (this.type) {
            case "reply":
            case "router":
                this.socket = zmq.Reply();
                break;
            case "pub":
                this.socket = zmq.Publish();
                break;
            // case "reply":
            //     this.socket = zmq.Reply();
            //     break;
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
            // case "reply":
            //     await this.replyInit(connStr);
            //     break;
        }
    }

    private async pubInit(connStr: string) {
        const socket = (this.socket as zmq.Publisher);
        await socket.bind(connStr);
    }

    private async routerInit(connStr: string) {
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
            });

            await this.recv((messages as Uint8Array[]));
        }
    }

    // private async replyInit(connStr: string) {
    //     const socket = (this.socket as zmq.Replier);
    //     await socket.connect(connStr);
    // }

    public setHandler(name: string, cb: RecvFnType): void {
        this.handlers.set(name, cb);
    }

    public send(msg: Message): Promise<void> {
        if (!this.kernel.hmacKey) throw new Error("initialize kernel first");

        const data: Array<zmq.MessageLike> = msg.serialize(this.kernel.hmacKey);

        return this.socket.send(...data);
    }

    public async recv(data: Array<Uint8Array>) {
        if (!this.kernel.hmacKey) {
            throw new Error("kernel not initialized");
        }


        const msg = Message.from(data, this.kernel.hmacKey);
        const ctx: CommContext = {
            msg,
            kernel: this.kernel,
            send: this.send.bind(this),
        };
        await this.kernel.setState("busy", ctx);

        console.log("received message type", msg.type);
        const cb = this.handlers.get(msg.type);

        if (!cb) {
            throw new Error(`handler not found for type: ${msg.type}`);
        }

        await cb(ctx);

        await this.kernel.setState("idle", ctx);
    }

    public async shutdown() { }
}

export class ControlComm extends Comm {
    constructor (ip: string, port: number, kernel: Kernel) {
        super({
            name: "control",
            type: "router",
            hostname: ip,
            port: port,
            kernel: kernel
        });

        this.setHandler("shutdown_request", this.shutdownHandler);
    }

    // deno-lint-ignore no-unused-vars
    async shutdownHandler(ctx: CommContext) {
        await console.log("shutdownHandler");
    }
}

export class ShellComm extends Comm {
    constructor (ip: string, port: number, kernel: Kernel) {
        super({
            name: "shell",
            type: "router",
            hostname: ip,
            port: port,
            kernel,
        });

        this.setHandler("kernel_info_request", this.kernelInfoHandler.bind(this));
    }

    async kernelInfoHandler(ctx: CommContext) {
        console.log("kernelInfoHandler");

        const response: KernelInfoContent = {
            status: "ok",
            // deno-lint-ignore camelcase
            protocol_version: this.kernel.metadata.protocolVersion,
            // deno-lint-ignore camelcase
            implementation_version: this.kernel.metadata.kernelVersion,
            implementation: this.kernel.metadata.implementationName,
            // deno-lint-ignore camelcase
            language_info: {
                name: this.kernel.metadata.language,
                version: this.kernel.metadata.languageVersion,
                mime: this.kernel.metadata.mime,
                file_extension: this.kernel.metadata.fileExt,
            },
            // deno-lint-ignore camelcase
            help_links: [{
                text: this.kernel.metadata.helpText,
                url: this.kernel.metadata.helpUrl,
            }],
            banner: this.kernel.metadata.banner,
            debugger: false,
        };

        return await ctx.send(new KernelInfoReplyMessage(ctx, response));
    }
}

export class StdinComm extends Comm {
    constructor (ip: string, port: number, kernel: Kernel) {
        super({
            name: "stdin",
            type: "reply",
            hostname: ip,
            port: port,
            kernel: kernel
        });
    }
}

export class IOPubComm extends Comm {
    constructor (ip: string, port: number, kernel: Kernel) {
        super({
            name: "iopub",
            type: "pub",
            hostname: ip,
            port: port,
            kernel: kernel
        });
    }

    public async send(msg: Message): Promise<void> {
        if (!this.kernel.hmacKey) {
            throw new Error("initialize kernel first");
        }

        const data: Array<zmq.MessageLike> = msg.serialize(this.kernel.hmacKey);

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
    constructor (ip: string, port: number, kernel: Kernel) {
        super({
            name: "hb",
            type: "router",
            hostname: ip,
            port: port,
            kernel: kernel
        });
    }
}

export interface CommClass {
    new(ip: string, port: number, kernel: Kernel): Comm;
}