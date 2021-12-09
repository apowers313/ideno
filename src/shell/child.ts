import { IpcComm, IpcMessage, IpcExecContextReadyMessage, IpcExecMessage, IpcExecErrorMessage, IpcExecResultMessage } from "./ipc.ts";

// deno-lint-ignore no-explicit-any
function log(..._args: Array<any>) { }

interface ExecContextConfig {
    parentPort: number,
}

class ExecContext {
    ipc: IpcComm;

    constructor (cfg: ExecContextConfig) {

        this.ipc = new IpcComm({
            recvHandler: this.recvHandler.bind(this),
            port: cfg.parentPort
        });
    }

    async init() {
        await this.ipc.init();
    }

    async run() {
        log("exec context running...");
        await Promise.all([
            this.ipc.run(),
            this.ipc.send(new IpcExecContextReadyMessage()),
        ]);
        log("exec context done running.");
    }

    async recvHandler(msg: IpcMessage) {
        log("exec context got msg", msg);
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
        log("res", res);
        log("err", err);
        if (err) {
            await this.ipc.send(new IpcExecErrorMessage({ status: "error", error: err }));
            return;
        }

        // if 'res' is a Promise, resolve it
        res = await res;

        await this.ipc.send(new IpcExecResultMessage({ status: "ok", result: res }));
    }
}

const parentIpcPort = Deno.env.get("PARENT_IPC_PORT");
if (!parentIpcPort) {
    throw new Error("IPC comm environment variable 'PARENT_IPC_PORT' not defined");
}
log("exec context will connect to port", parentIpcPort);
const c = new ExecContext({
    parentPort: parseInt(parentIpcPort),
});
await c.init();
await c.run();