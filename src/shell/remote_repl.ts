import { StdioPump, StdioPumpHandler } from "./stdio.ts";
import { IpcComm, IpcExecMessage, IpcMessage } from "./ipc.ts";
import { Task, TaskQueue } from "./queue.ts";

export type StdioHandler = StdioPumpHandler;
export type HandshakeFn = (value: void | PromiseLike<void>) => void;
export interface RemoteReplConfig {
    stdoutHandler: StdioPumpHandler,
    stderrHandler: StdioPumpHandler,
}

export type TaskArgs = [repl: RemoteRepl, code: string];
export interface ExecTaskOpts {
    repl: RemoteRepl;
    code: string;
}

type ExecDoneFn = (value: unknown) => void;

// deno-lint-ignore no-explicit-any
export class ExecTask extends Task<TaskArgs, Promise<any>> {
    private code: string;

    constructor (opts: ExecTaskOpts) {
        super(_sendCodeForExec, opts.repl, opts.code);
        this.code = opts.code;
    }
}

async function _sendCodeForExec(repl: RemoteRepl, code: string) {
    await repl.ipc.send(new IpcExecMessage(code));
    return new Promise((done) => {
        repl.execDone = done;
    });
}

export class RemoteRepl {
    private child: Deno.Process | null = null;
    childDone: Promise<Deno.ProcessStatus> | null = null;
    execDone: ExecDoneFn | null = null;
    stdoutHandler: StdioPumpHandler;
    stderrHandler: StdioPumpHandler;
    ipc: IpcComm;
    handshakeCb: HandshakeFn | null = null;
    childRunningPromise: Promise<void> | null = null;
    private taskQueue: TaskQueue<ExecTask>;

    constructor (cfg: RemoteReplConfig) {
        this.stdoutHandler = cfg.stdoutHandler;
        this.stderrHandler = cfg.stderrHandler;
        this.ipc = new IpcComm({
            recvHandler: this.recvIpc.bind(this)
        });
        this.taskQueue = new TaskQueue();
    }

    async init() {
        await this.ipc.init();
        console.log("PARENT IPC init done.");

        await this.#forkChild();
        if (!this.child //||
            // !this.child.stdout ||
            // !this.child.stderr
        ) {
            throw new Error("error spawning child process");
        }

        await Promise.all([
            // spawn
            this.childDone,

            // run queue: async iterator
            this.taskQueue.run(),

            // stdout, stderr
            // this.startStdioPump(this.child.stdout, this.stdoutHandler),
            // this.startStdioPump(this.child.stderr, this.stderrHandler),

            // ipc
            this.ipc.run(),
        ]);

    }

    async startStdioPump(stdio: Deno.Reader, handler: StdioPumpHandler) {
        await this.childRunning();

        const pump = new StdioPump({ stdio, handler });
        await pump.run();
    }

    shutdown() {
        // ipc shutdown
        // kill child
    }

    interrupt() {
        // ???
    }

    async exec(code: string) {
        console.log("waiting for child");
        await this.childRunning();
        console.log("sending code:", code);
        await this.ipc.send(new IpcExecMessage({ code, history: true }));
    }

    #forkChild() {
        const childPath = import.meta.url.substring(0, import.meta.url.lastIndexOf('/')) + "/child.ts";
        console.log("childPath", childPath);
        this.child = Deno.run({
            cmd: `deno run --allow-all --unstable ${childPath}`.split(" "),
            env: {
                PARENT_IPC_PORT: this.ipc.port.toString(),
            },
            // stdout: "piped",
            // stderr: "piped",
        });
        console.log("running...");
        this.childDone = this.child.status();

        return this.child;
    }

    async recvIpc(msg: IpcMessage) {
        await console.log("parent got message:", msg);
        switch (msg.type) {
            case "ready":
                this.doHandshake();
                break;
            case "execute_reply":
                throw new Error("execute_reply not implemented yet");
            default:
                throw new Error(`unknown message: ${msg}`);
        }
    }

    doHandshake() {
        if (!this.handshakeCb) {
            throw new Error("init() before doHandshake() or multiple handshakes received");
        }

        console.log("do handshake");
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

    // history
    // autocomplete
}