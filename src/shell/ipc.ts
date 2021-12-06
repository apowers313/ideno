export type IpcHandlerType = (msg: string) => Promise<void>;

export interface IpcCommConfig {
    recvHandler: IpcHandlerType;
    sendPath?: string;
    recvPath?: string;
}

export class IpcComm {
    recvHandler: IpcHandlerType;
    sendPath: string | undefined;
    recvPath: string | undefined;
    sendSock: Deno.DatagramConn | undefined;
    recvSock: Deno.DatagramConn | undefined;

    constructor (cfg: IpcCommConfig) {
        this.recvHandler = cfg.recvHandler;
        this.sendPath = cfg.sendPath;
        this.recvPath = cfg.recvPath;
    }

    async init() {
        this.sendPath = this.sendPath ?? await Deno.makeTempFile();
        this.recvPath = this.recvPath ?? await Deno.makeTempFile();

        console.log("INIT: LISTENING ON:", this.recvPath);
        this.recvSock = Deno.listenDatagram({
            transport: "unixpacket",
            path: this.recvPath
        });

        console.log("INIT: SENDING ON:", this.sendPath);
        this.sendSock = Deno.listenDatagram({
            transport: "unixpacket",
            path: this.sendPath
        });
    }

    shutdown() {
        if (!this.sendSock || !this.recvSock) {
            throw new Error("call init() before shutdown()");
        }

        this.sendSock.close();
        this.recvSock.close();
    }

    async run() {
        if (!this.recvSock) {
            throw new Error("call init() before run()");
        }

        for await (const pkt of this.recvSock) {
            const msg = new TextDecoder().decode(pkt[0]);
            console.log("IPC RECV:", msg);
            await this.recvHandler(msg);
        }
    }

    async send(data: string) {
        if (!this.sendPath || !this.sendSock) {
            throw new Error("call init() before send()");
        }

        console.log("IPC SEND:", data);
        console.log("SENDING ON:", this.sendPath);
        await this.sendSock.send(
            new TextEncoder().encode(data),
            { transport: "unixpacket", path: this.sendPath }
        );
    }
}