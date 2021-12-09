import { StdioPump, StdioPumpHandler } from "./stdio.ts";
import { IpcComm, IpcExecMessage, IpcMessage } from "./ipc.ts";
import { Task, TaskQueue } from "./queue.ts";

export type HandshakeFn = (value: void | PromiseLike<void>) => void;
export type ExecTaskArgs = [execCfg: ExecTaskCfg];
export interface ExecTaskCfg {
    repl: RemoteRepl;
    code: string;
    ctx: unknown;
}

type ExecDoneFn = (value: unknown) => void;

// deno-lint-ignore no-explicit-any
export class ExecTask extends Task<ExecTaskArgs, Promise<any>> {
    repl: RemoteRepl;
    code: string;
    ctx: unknown;

    constructor (cfg: ExecTaskCfg) {
        super(_sendCodeForExec, cfg);
        console.log("new ExecTask, ctx is:", cfg.ctx);
        this.repl = cfg.repl;
        this.code = cfg.code;
        this.ctx = cfg.ctx;
    }
}

async function _sendCodeForExec(cfg: ExecTaskCfg) {
    await cfg.repl.ipc.send(new IpcExecMessage({
        code: cfg.code,
        history: true
    }));

    return new Promise((done) => {
        if (cfg.repl.execDone) {
            throw new Error("attempting to execute two tasks at the same time, shouldn't be possible");
        }

        cfg.repl.execDone = (arg) => {
            console.log("code done", cfg.code);
            return done(arg);
        };
    });
}

export interface ReplEventInterface {
    type: "exec_result" | "stdout" | "stderr";
}

export class ReplEvent extends Event {
    constructor (cfg: ReplEventInterface) {
        super(cfg.type);
    }
}

export class StdioEvent extends ReplEvent {
    public data: string;

    constructor (type: "stdout" | "stderr", data: string) {
        super({ type });
        this.data = data;
    }
}

export interface ExecResultInterface {
    status: "ok" | "error";
    ctx: unknown;
}

export class ExecResultEvent extends ReplEvent {
    status: string;
    ctx: unknown;

    constructor (cfg: ExecResultInterface) {
        super({ type: "exec_result" });
        this.status = cfg.status;
        this.ctx = cfg.ctx;
    }
}

export class RemoteRepl extends EventTarget {
    private child: Deno.Process | null = null;
    childDone: Promise<Deno.ProcessStatus> | null = null;
    execDone: ExecDoneFn | null = null;
    ipc: IpcComm;
    handshakeCb: HandshakeFn | null = null;
    childRunningPromise: Promise<void> | null = null;
    private taskQueue: TaskQueue<ExecTask>;

    constructor () {
        super();

        this.ipc = new IpcComm({
            recvHandler: this.recvIpc.bind(this)
        });
        this.taskQueue = new TaskQueue();
    }

    async init() {
        await this.ipc.init();
        this.#forkChild();

        if (!this.child ||
            !this.child.stdout ||
            !this.child.stderr
        ) {
            throw new Error("error spawning child process");
        }

        await Promise.all([
            // spawn
            this.childDone,
            this.childRunning(),

            // run queue: async iterator
            this.taskQueue.run(),

            // stdout, stderr
            this.startStdioPump(this.child.stdout, this.stdioHandler.bind(this, "stdout")),
            this.startStdioPump(this.child.stderr, this.stdioHandler.bind(this, "stderr")),

            // ipc
            this.ipc.run(),
        ]);
    }

    async startStdioPump(stdio: Deno.Reader, handler: StdioPumpHandler) {
        await this.childRunning();

        const pump = new StdioPump({ stdio, handler });
        await pump.run();
    }

    #forkChild() {
        const childPath = import.meta.url.substring(0, import.meta.url.lastIndexOf('/')) + "/child.ts";
        console.debug("Starting script at:", childPath);
        this.child = Deno.run({
            cmd: `deno run --allow-all --unstable ${childPath}`.split(" "),
            env: {
                PARENT_IPC_PORT: this.ipc.port.toString(),
            },
            stdout: "piped",
            stderr: "piped",
        });
        this.childDone = this.child.status();

        return this.child;
    }

    async recvIpc(msg: IpcMessage) {
        await console.debug("REPL got message:", msg);
        switch (msg.type) {
            case "ready":
                this.doHandshake();
                break;
            case "exec_result":
                this.execResult(msg);
                break;
            default:
                throw new Error(`unknown message: ${msg.type}`);
        }
    }

    doHandshake() {
        if (!this.handshakeCb) {
            throw new Error("call init() before doHandshake() or multiple handshakes received");
        }

        this.handshakeCb();
        this.handshakeCb = null;
    }

    childRunning(): Promise<void> {
        if (this.childRunningPromise) return this.childRunningPromise;
        this.childRunningPromise = new Promise((resolve) => {
            this.handshakeCb = resolve;
        });
        return this.childRunningPromise;
    }

    // deno-lint-ignore require-await
    async stdioHandler(io: "stdout" | "stderr", text: string) {
        const e = new StdioEvent(io, text);
        console.debug(`STDIO ${io} text:\n==============================\n${text}\n==============================\n\n`);
        console.log("emitting", e);
        this.addEventListener("stdout", (evt: Event) => {
            console.log("WTF");
        });
        this.dispatchEvent(e);
    }

    /**
     * Requests that code be executed in the ExecutionContext. If code is already running it will be queued for future execution.
     * This function resolves after the code is queued, not after it is done running. After the code is done an "exec_result"
     * event will be fired.
     * @param code The JavaScript to be executed in the ExecutionContext
     * @param ctx An opaque parameter that is passed back as part of the "exec_result" event, used to keep state across execution requests
     */
    async queueExec(code: string, ctx?: unknown) {
        console.log("waiting for child");
        await this.childRunning();
        // console.log("sending code:", code);
        // await this.ipc.send(new IpcExecMessage({ code, history: true }));
        this.taskQueue.addTask(new ExecTask({
            repl: this,
            code,
            ctx
        }));
    }

    execResult(_evt: IpcMessage) {
        if (!this.taskQueue.currentTask) {
            throw new Error("received exec result but no current task found");
        }

        const e = new ExecResultEvent({ status: "ok", ctx: this.taskQueue.currentTask.ctx });
        this.dispatchEvent(e);

        if (!this.execDone) {
            throw new Error("exec completed, but no execDone callback");
        }
        this.execDone(null);
        this.execDone = null;
    }

    async shutdown() {
        await this.ipc.shutdown();
        console.error("shutting down, killing child process not implemented");
    }

    interrupt() {
        // ???
    }

    // history
    // autocomplete
}