import { IpcComm, IpcMessage, IpcChildReadyMessage, IpcExecMessage } from "./ipc.ts";

console.log("hello from child");

interface ChildConfig {
    parentPort: number,
}

class Child {
    ipc: IpcComm;

    constructor (cfg: ChildConfig) {

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
        console.log("child running...");
        await Promise.all([
            this.ipc.run(),
            this.ipc.send(new IpcChildReadyMessage()),
        ]);
        console.log("child done running.");
    }

    async recvHandler(msg: IpcMessage) {
        console.log("child got msg", msg);
        switch (msg.type) {
            case "exec":
                await this.runCode((msg as IpcExecMessage).data.code);
                break;
            default:
                throw new Error(`unknown msg type ${msg}`);
        }
    }

    async runCode(code: string): Promise<void> {
        // deno-lint-ignore no-explicit-any
        let [res, err] = (Deno as any).core.evalContext(code, "<ideno kernel>");
        console.log("res", res);
        console.log("err", err);
        if (err) {
            // send error result
            return;
        }
        res = await res;
        // send res
    }
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