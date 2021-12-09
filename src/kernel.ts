import {
    ShellComm,
    ControlComm,
    StdinComm,
    HbComm,
    IOPubComm,
    Comm,
    CommClass,
    CommContext,
    HmacKey,
    HandlerFn
} from "./comm/comm.ts";

import {
    StatusMessage,
    KernelInfoReplyMessage,
    KernelInfoContent,
    CommInfoContent,
    ExecuteRequestContent,
    ExecuteReplyMessage,
    ExecuteInputMessage,
    // ExecuteResultMessage,
    StreamMessage,
    CommInfoReplyMessage,
    ShutdownReplyMessage
} from "./comm/message.ts";

import { RemoteRepl, StdioEvent, ExecResultEvent } from "./shell/remote_repl.ts";
import { desc } from "./types.ts";

export interface KernelCfg {
    connectionFile: string;
}

export interface ConnectionSpec {
    ip: string;
    transport: string;
    // deno-lint-ignore camelcase
    control_port: number;
    // deno-lint-ignore camelcase
    shell_port: number;
    // deno-lint-ignore camelcase
    stdin_port: number;
    // deno-lint-ignore camelcase
    hb_port: number;
    // deno-lint-ignore camelcase
    iopub_port: number;
    // deno-lint-ignore camelcase
    signature_scheme: string;
    key: string;
}

export interface KernelMetadata {
    protocolVersion: string;
    kernelVersion: string;
    languageVersion: string;
    language: string;
    implementationName: string;
    mime: string;
    fileExt: string;
    helpText: string;
    helpUrl: string;
    banner: string;
    sessionId: string;
}

export type KernelState = "idle" | "busy" | "starting";

export class Kernel {
    public metadata: KernelMetadata;
    public hmacKey: HmacKey | null = null;
    public state: KernelState = "idle";
    public execCounter = 0;
    private connectionFile: string;
    private connectionSpec: ConnectionSpec | null = null;
    private commMap: Map<string, Comm> = new Map();
    private repl: RemoteRepl;

    constructor (cfg: KernelCfg) {
        console.log("constructing IDeno kernel...");
        // this.connMap = new Map();
        this.connectionFile = cfg.connectionFile;
        this.metadata = {
            protocolVersion: desc.protocolVersion,
            kernelVersion: desc.kernelVersion,
            languageVersion: Deno.version.deno,
            implementationName: desc.implementationName,
            language: desc.language,
            mime: desc.mime,
            fileExt: desc.fileExt,
            helpText: desc.helpText,
            helpUrl: desc.helpUrl,
            banner: desc.banner,
            sessionId: crypto.randomUUID(),
        };
        this.repl = new RemoteRepl();
        this.repl.addEventListener("exec_result", (this.finishExec.bind(this) as EventListener));
        this.repl.addEventListener("stderr", (this.replStdioHandler.bind(this) as EventListener));
        this.repl.addEventListener("stdout", (this.replStdioHandler.bind(this) as EventListener));
    }

    public async init() {
        console.info("initializing IDeno kernel...");

        this.connectionSpec = await Kernel.parseConnectionFile(this.connectionFile);
        this.hmacKey = {
            key: this.connectionSpec.key,
            alg: "sha256"
        };

        this.addComm(ShellComm, this.connectionSpec.shell_port, this.shellHandler.bind(this));
        this.addComm(ControlComm, this.connectionSpec.control_port, this.controlHandler.bind(this));
        this.addComm(StdinComm, this.connectionSpec.stdin_port, this.stdinHandler.bind(this));
        this.addComm(HbComm, this.connectionSpec.hb_port, this.heartbeatHandler.bind(this));
        this.addComm(IOPubComm, this.connectionSpec.iopub_port, this.iopubHandler.bind(this));

        await Promise.all([
            this.commInit(),
            this.repl.init(),
        ]);
    }

    private addComm(commClass: CommClass, port: number, handler: HandlerFn) {
        if (!this.connectionSpec) throw new Error("internal error");
        if (!this.hmacKey) throw new Error("initialize kernal before addComm");

        const comm: Comm = new commClass({
            ip: this.connectionSpec.ip,
            hmacKey: this.hmacKey,
            sessionId: this.metadata.sessionId,
            port,
            handler
        });
        this.commMap.set(comm.name, comm);
    }

    private commInit(): Promise<void[]> {
        return Promise.all([...this.commMap.values()].map((c) => c.init()));
    }

    public async shellHandler(ctx: CommContext) {
        await this.setState("busy", ctx);

        let m;
        switch (ctx.msg.type) {
            case "kernel_info_request":
                m = new KernelInfoReplyMessage(ctx, this.getKernelInfo());
                break;
            case "comm_info_request":
                m = new CommInfoReplyMessage(ctx, this.getCommInfo());
                break;
            case "execute_request":
                await this.startExec(ctx);
                return;
            default:
                throw new Error("unknown message type: " + ctx.msg.type);
        }

        await ctx.send(m);
        await this.setState("idle", ctx);
    }

    public async controlHandler(ctx: CommContext) {
        await this.setState("busy", ctx);

        // deno-lint-ignore no-unused-vars
        let m;
        switch (ctx.msg.type) {
            case "shutdown_request":
                await ctx.send(new ShutdownReplyMessage(ctx));
                this.shutdown(0);
                break;
            default:
                throw new Error("unknown message type: " + ctx.msg.type);
        }

        // await ctx.send(m);

        await this.setState("idle", ctx);
    }

    // deno-lint-ignore no-unused-vars require-await
    public async stdinHandler(ctx: CommContext) {
        console.log("stdin msg received");
    }

    // deno-lint-ignore no-unused-vars require-await
    public async heartbeatHandler(ctx: CommContext) {
        console.log("heartbeat msg received");
    }

    // deno-lint-ignore no-unused-vars require-await
    public async iopubHandler(ctx: CommContext) {
        console.log("iopub msg received");
    }

    public async setState(state: KernelState, ctx: CommContext) {
        if (this.state === state) return;

        console.log("SETTING KERNEL STATE:", state);
        this.state = state;

        // broadcast state change
        const iopub = this.commMap.get("iopub");
        if (!iopub) throw new Error("can't change state, iopub channel not initialized");

        const m = new StatusMessage(ctx, { execution_state: state });
        await iopub.send(m);
    }

    public restart() { }

    public shutdown(status: number) {
        Deno.exit(status);
    }

    public static async parseConnectionFile(filename: string): Promise<ConnectionSpec> {
        // parse connection file
        const connectionFile = await Deno.readTextFile(filename);
        console.log("connectionFile", connectionFile);
        const connectionSpec = JSON.parse(connectionFile);
        console.log("connectionSpec", connectionSpec);

        if (typeof connectionSpec.ip !== "string" ||
            typeof connectionSpec.control_port !== "number" ||
            typeof connectionSpec.shell_port !== "number" ||
            typeof connectionSpec.stdin_port !== "number" ||
            typeof connectionSpec.hb_port !== "number" ||
            typeof connectionSpec.iopub_port !== "number" ||
            typeof connectionSpec.transport !== "string" ||
            typeof connectionSpec.key !== "string" ||
            typeof connectionSpec.signature_scheme !== "string" ||
            connectionSpec.signature_scheme !== "hmac-sha256"
        ) {
            throw new Error("malformed connection file: " + connectionSpec);
        }

        return connectionSpec;
    }

    public getKernelInfo(): KernelInfoContent {
        return {
            status: "ok",
            protocol_version: this.metadata.protocolVersion,
            implementation_version: this.metadata.kernelVersion,
            implementation: this.metadata.implementationName,
            language_info: {
                name: this.metadata.language,
                version: this.metadata.languageVersion,
                mime: this.metadata.mime,
                file_extension: this.metadata.fileExt,
            },
            help_links: [{
                text: this.metadata.helpText,
                url: this.metadata.helpUrl,
            }],
            banner: this.metadata.banner,
            debugger: false,
        };
    }

    public getCommInfo(): CommInfoContent {
        return {
            status: "ok",
            comms: {}
        };
    }

    async startExec(ctx: CommContext) {
        const execContent = (ctx.msg.content as ExecuteRequestContent);
        if (execContent.store_history) {
            this.execCounter++;
        }

        await this.repl.queueExec(execContent.code, ctx);

        const m = new ExecuteInputMessage(ctx, this.execCounter);
        const ioPubComm = this.commMap.get("iopub");
        if (!ioPubComm) {
            throw new Error("call init() before startExec()");
        }

        await ioPubComm.send(m);
    }

    async finishExec(evt: ExecResultEvent) {
        const ctx = (evt.ctx as CommContext);

        const m = new ExecuteReplyMessage(ctx, {
            status: "ok",
            execution_count: this.execCounter,
            payload: [],
            user_expressions: []
        });
        await ctx.send(m);

        console.error("*** done with exec: execute_result and errors not handled");

        // TODO:
        // if (evt.result) {
        //     iopub.send execute_result;
        // }

        await this.setState("idle", ctx);
    }

    replStdioHandler(evt: StdioEvent): void {
        const ctx = (evt.ctx as CommContext);

        const ioPubComm = this.commMap.get("iopub");
        if (!ioPubComm) {
            throw new Error("call init() before replStdioHandler()");
        }
        ioPubComm.send(new StreamMessage(ctx, evt.type, evt.data));
    }
}