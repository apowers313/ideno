import { IpcComm, IpcMessage, IpcChildReadyMessage, IpcExecMessage, IpcExecResultMessage } from "./ipc.ts";

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
        await this.ipc.init();
    }

    async run() {
        console.debug("child running...");
        await Promise.all([
            this.ipc.run(),
            this.ipc.send(new IpcChildReadyMessage()),
        ]);
        console.debug("child done running.");
    }

    async recvHandler(msg: IpcMessage) {
        console.debug("child got msg", msg);
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
            await this.ipc.send(new IpcExecResultMessage({ status: "error" }));
            return;
        }

        // if 'res' is a Promise, resolve it
        res = await res;

        await this.ipc.send(new IpcExecResultMessage({ status: "ok" }));
    }
}

const parentIpcPort = Deno.env.get("PARENT_IPC_PORT");
if (!parentIpcPort) {
    throw new Error("IPC comm environment variable 'PARENT_IPC_PORT' not defined");
}
console.debug("child will connect to port", parentIpcPort);
const c = new Child({
    parentPort: parseInt(parentIpcPort),
});
await c.init();
await c.run();