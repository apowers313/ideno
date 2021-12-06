import { IpcComm, IpcHandshakeMessageType } from "./ipc.ts";
import { Task, TaskQueue } from "./queue.ts";

console.log("hello from child");

interface ChildConfig {
    parentPort: number,
}

class Child {
    ipc: IpcComm;
    private taskQueue: TaskQueue<ExecTask>;

    constructor (cfg: ChildConfig) {
        this.taskQueue = new TaskQueue();

        this.ipc = new IpcComm({
            recvHandler: this.recvHandler.bind(this),
            port: cfg.parentPort
        });
    }

    async init() {
        console.log("child init");
        await this.ipc.init();
        console.log("CHILD IPC init done");
    }

    async run() {
        const handshakeMsg: IpcHandshakeMessageType = { type: "handshake" };

        console.log("child running...");
        await Promise.all([
            this.ipc.run(),
            this.ipc.send(handshakeMsg),
            this.taskQueue.run(),
        ]);
        console.log("child done running.");
    }

    // deno-lint-ignore require-await
    async recvHandler(msg: Record<string, unknown>) {
        console.log("child got msg", msg);
        switch (msg.type) {
            case "exec":
                this.taskQueue.addTask(new ExecTask({ code: (msg.code as string) }));
                break;
            default:
                throw new Error(`unknown msg type ${msg}`);
        }
    }
}

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

const parentIpcPort = Deno.env.get("PARENT_IPC_PORT");
if (!parentIpcPort) {
    throw new Error("IPC comm environment variable 'PARENT_IPC_PORT' not defined");
}
console.log("child will connect to port", parentIpcPort);

console.log("new child");
const c = new Child({
    parentPort: parseInt(parentIpcPort),
});
console.log("await init");
await c.init();
console.log("await run");
await c.run();