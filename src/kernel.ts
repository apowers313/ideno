import { ShellComm, ControlComm, StdinComm, HbComm, IOPubComm, Comm, CommClass, CommContext } from "./comm/comm.ts";
import { StatusMessage } from "./comm/message.ts";
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

export interface HmacKey {
    alg: "sha256",
    key: string;
}

export type KernelState = "idle" | "busy";

export class Kernel {
    public metadata: KernelMetadata;
    public hmacKey: HmacKey | null = null;
    public state: KernelState = "idle";
    private connectionFile: string;
    private connectionSpec: ConnectionSpec | null = null;
    private commMap: Map<string, Comm> = new Map();

    constructor (cfg: KernelCfg) {
        console.log("constructing IDeno kernel...");
        // this.connMap = new Map();
        this.connectionFile = cfg.connectionFile;
        this.metadata = {
            protocolVersion: desc.protocolVersion,
            kernelVersion: desc.kernelVersion,
            languageVersion: desc.languageVersion,
            implementationName: desc.implementationName,
            language: desc.language,
            mime: desc.mime,
            fileExt: desc.fileExt,
            helpText: desc.helpText,
            helpUrl: desc.helpUrl,
            banner: desc.banner,
            sessionId: crypto.randomUUID(),
        };
    }

    public async init() {
        console.info("initializing IDeno kernel...");

        this.connectionSpec = await Kernel.parseConnectionFile(this.connectionFile);
        this.hmacKey = {
            key: this.connectionSpec.key,
            alg: "sha256"
        };

        // // create control (router)
        this.addComm(ControlComm, this.connectionSpec.control_port);
        // const controlComm = new ControlComm(this.connectionSpec.ip, this.connectionSpec.control_port, this);
        // promiseList.push(controlComm.init());

        // // create shell (router)
        this.addComm(ShellComm, this.connectionSpec.shell_port);
        // const shellComm = new ShellComm(this.connectionSpec.ip, this.connectionSpec.shell_port, this);
        // promiseList.push(shellComm.init());

        // // create stdin (router)
        this.addComm(StdinComm, this.connectionSpec.stdin_port);
        // const stdinComm = new StdinComm(this.connectionSpec.ip, this.connectionSpec.stdin_port, this);
        // promiseList.push(stdinComm.init());

        // create heartbeat (dealer)
        this.addComm(HbComm, this.connectionSpec.stdin_port);
        // const hbComm = new HbComm(this.connectionSpec.ip, this.connectionSpec.hb_port, this);
        // promiseList.push(hbComm.init());

        // create iopub (pub)
        this.addComm(IOPubComm, this.connectionSpec.iopub_port);
        // const ioPubComm = new IOPubComm(this.connectionSpec.ip, this.connectionSpec.iopub_port, this);
        // promiseList.push(ioPubComm.init());

        await this.commInit();
        // await Promise.all(promiseList);
    }

    private addComm(commClass: CommClass, port: number) {
        if (!this.connectionSpec) throw new Error("internal error");

        const comm: Comm = new commClass(this.connectionSpec.ip, port, this);
        this.commMap.set(comm.name, comm);
    }

    private commInit(): Promise<void[]> {
        return Promise.all([...this.commMap.values()].map((c) => c.init()));
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

    public shutdown() { }

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
}