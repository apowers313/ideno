import { StdioPump, StdioPumpHandler } from "./stdio.ts";
import { IpcComm, IpcMessageType } from "./ipc.ts";

export type StderrHandler = StdioPumpHandler;
export type StdoutHandler = StdioPumpHandler;

export type HandshakeFn = (value: unknown) => void;

export interface RemoteReplConfig {
    stdoutHandler: StdioPumpHandler,
    stderrHandler: StdioPumpHandler,
}

export class RemoteRepl {
    private child: Deno.Process | null = null;
    childDone: Promise<Deno.ProcessStatus> | null = null;
    stdoutHandler: StdioPumpHandler;
    stderrHandler: StdioPumpHandler;
    ipc: IpcComm;
    handshakeCb: HandshakeFn | null = null;

    constructor (cfg: RemoteReplConfig) {
        this.stdoutHandler = cfg.stdoutHandler;
        this.stderrHandler = cfg.stderrHandler;
        this.ipc = new IpcComm({
            recvHandler: this.recvIpc.bind(this)
        });
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
            // this.taskQueue.run(),

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
        // await this.childRunning();
        console.log("sending code:", code);
        await this.ipc.send({ type: "exec", code });
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

    async recvIpc(msg: Record<string, unknown>) {
        await console.log("parent got message:", msg);
        switch (msg.type) {
            case "handshake":
                this.doHandshake();
                break;
            case "exec_reply":
                throw new Error("exec_reply not implemented yet");
            default:
                throw new Error(`unknown message: ${msg}`);
        }
    }

    doHandshake() {
        if (!this.handshakeCb) {
            throw new Error("init() before doHandshake() or multiple handshakes received");
        }

        console.log("do handshake");
        this.handshakeCb(null);
        this.handshakeCb = null;
    }

    childRunning() {
        return new Promise((resolve) => {
            this.handshakeCb = resolve;
        });
    }

    // history
    // autocomplete
}

function delay(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}