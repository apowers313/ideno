import * as zmq from "https://raw.githubusercontent.com/apowers313/deno-zeromq/master/mod.ts";
import { ShellComm, ControlComm, Comm } from "./comm/comm.ts";

export interface KernelCfg {
    connectionFile: string;
}

export interface ConnectionSpec {
    ip: string;
    controlPort: number;
    shellPort: number;
    stdinPort: number;
    hbPort: number;
    iopubPort: number;
    transport: string;
    signatureScheme: string;
    key: string;
}

export class Kernel {
    private connectionFile: string;
    private connectionSpec: ConnectionSpec | null = null;
    connMap: Map<string, Comm> = new Map();

    constructor (cfg: KernelCfg) {
        console.log("constructing IDeno kernel...");
        // this.connMap = new Map();
        this.connectionFile = cfg.connectionFile;
    }

    public async init() {
        console.info("initializing IDeno kernel...");
        const promiseList = [];

        this.connectionSpec = await Kernel.parseConnectionFile(this.connectionFile);

        // // create control (router)
        const controlComm = new ControlComm(this.connectionSpec.ip, this.connectionSpec.controlPort);
        promiseList.push(controlComm.init());
        // promiseList.push(createReplySock("control", this.connectionSpec.ip, this.connectionSpec.control_port));

        // // create shell (router)
        // promiseList.push(createReplySock("shell", this.connectionSpec.ip, this.connectionSpec.shellPort));
        const shellComm = new ShellComm(this.connectionSpec.ip, this.connectionSpec.shellPort);
        promiseList.push(shellComm.init());

        // // create stdin (router)
        promiseList.push(createReplySock("stdin", this.connectionSpec.ip, this.connectionSpec.stdinPort));

        // create heartbeat (router)
        promiseList.push(createReplySock("hb", this.connectionSpec.ip, this.connectionSpec.hbPort));

        await Promise.all(promiseList);

        async function createReplySock(name: string, ip: string, port: number) {
            const hbSock = zmq.Reply();
            let connStr = `tcp://${ip}:${port}`;
            console.log("connStr", connStr);
            await hbSock.bind(connStr);
            for await (const messages of hbSock) {
                messages.forEach((m) => console.log("message", m.toString()));
                console.log(
                    `${name} Receive: [${messages.map((it) => new TextDecoder().decode(it as Uint8Array)).join(",")
                    }]`,
                );
            }
        }
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
            typeof connectionSpec.signature_scheme !== "string" ||
            typeof connectionSpec.key !== "string"
        ) {
            throw new Error("malformed connection file: " + connectionSpec);
        }

        return connectionSpec;
    }
}