import { Task, TaskQueue } from "./queue.ts";
import { StdioPump, StdioPumpHandler } from "./stdio.ts";
import { IpcComm } from "./ipc.ts";

export type StderrHandler = StdioPumpHandler;
export type StdoutHandler = StdioPumpHandler;
export type TaskArgs = Array<string>;
export interface ExecTaskOpts {
    code: string;
}

// deno-lint-ignore no-explicit-any
export class ExecTask extends Task<TaskArgs, any> {
    private code: string;

    constructor (opts: ExecTaskOpts) {
        super(_execCode, opts.code);

        this.code = opts.code;
    }

}

function _execCode(code: string) {
    // deno-lint-ignore no-explicit-any
    const [f, err] = (Deno as any).core.evalContext(code, "<ideno kernel>");
    console.log("f", f);
    console.log("err", err);
}

export interface RemoteReplConfig {
    stdoutHandler: StdioPumpHandler,
    stderrHandler: StdioPumpHandler,
}

export class RemoteRepl {
    private child: Deno.Process | null = null;
    private taskQueue: TaskQueue<ExecTask>;
    stdoutHandler: StdioPumpHandler;
    stderrHandler: StdioPumpHandler;
    ipc: IpcComm;

    constructor (cfg: RemoteReplConfig) {
        this.taskQueue = new TaskQueue();
        this.stdoutHandler = cfg.stdoutHandler;
        this.stderrHandler = cfg.stderrHandler;
        this.ipc = new IpcComm({
            recvHandler: this.recvIpc.bind(this)
        });
    }

    async init() {
        await this.ipc.init();

        await this.#forkChild();
        if (!this.child //||
            // !this.child.stdout ||
            // !this.child.stderr
        ) {
            throw new Error("error spawning child process");
        }

        await delay(3000);

        // const stderrPump = new StdioPump({
        //     stdio: this.child.stdout,
        //     handler: this.stdoutHandler
        // });

        // const stdoutPump = new StdioPump({
        //     stdio: this.child.stderr,
        //     handler: this.stderrHandler
        // });

        await Promise.all([
            // spawn
            this.child.status(),
            // run queue: async iterator
            // this.taskQueue.run(),
            // stdout, stderr
            // stdoutPump.run(),
            // stderrPump.run(),
            // ipc
            this.ipc.run(),
        ]);
    }

    shutdown() {
        // ipc shutdown
        // kill child
    }

    interrupt() {
        // ???
    }

    exec(code: string) {
        console.log("sending code:", code);
        this.ipc.send(`EXEC: ${code}`);
    }

    #forkChild() {
        if (!this.ipc.sendPath || !this.ipc.recvPath) {
            throw new Error("call ipc.init() before #forkChild()");
        }

        console.log("this.ipc.sendPath", this.ipc.sendPath);
        console.log("this.ipc.recvPath", this.ipc.recvPath);
        console.log("import.meta", import.meta);
        const childPath = import.meta.url.substring(0, import.meta.url.lastIndexOf('/')) + "/child.ts";
        console.log("childPath", childPath);
        this.child = Deno.run({
            cmd: `deno run --allow-all --unstable ${childPath}`.split(" "),
            env: {
                TO_CHILD_COMM_PATH: this.ipc.sendPath,
                TO_PARNET_COMM_PATH: this.ipc.recvPath,
            },
            // stdout: "piped",
            // stderr: "piped",
        });

        return this.child;
    }

    async recvIpc(msg: string) {
        await console.log("parent got message:", msg);
    }

    // history
    // autocomplete
}

function delay(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}