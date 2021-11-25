import * as zmq from "https://raw.githubusercontent.com/apowers313/deno-zeromq/master/mod.ts";

export interface CommCfg {
  name: string;
  hostname: string;
  port: number;
  // kernel: Kernel;
  type?: "pub" | "router";
}

export type RecvFnType = (msg: Message, ctx: CommContext) => Promise<void>;

export interface CommContext {
  // kernel: Kernel;
  // send: RespondFnInterface
}

export interface Message {
  header: object;
  parentHeader: object;
  metadata: object;
  content: object;
}

export class Comm {
  public readonly name: string;
  public readonly type: string;
  public readonly hostname: string;
  public readonly port: number;
  private handlers: Map<string, RecvFnType> = new Map();

  constructor(cfg: CommCfg) {
    this.name = cfg.name;
    this.type = cfg.type ?? "router";
    this.hostname = cfg.hostname;
    this.port = cfg.port;
  }

  public async init() {
    const hbSock = zmq.Reply();
    const connStr = `tcp://${this.hostname}:${this.port}`;
    console.log(this.name, "connStr", connStr);
    await hbSock.bind(connStr);
    for await (const messages of hbSock) {
      console.log(
        `'${this.name}' received: [${
          messages.map((it) => new TextDecoder().decode(it as Uint8Array)).join(
            ",",
          )
        }]`,
      );

      await this.recv(messages);
    }
  }

  public setHandler(name: string, cb: RecvFnType) {
    console.log("setting handler", name, cb);
    this.handlers.set(name, cb);
  }

  public async send() {}

  public async recv(msgs: Array<Uint8Array | string>) {
    // const delimiter = abToString(msgs[0]);
    const hmacSig = abToString(msgs[1]);
    console.error("HMAC signature not validated:", hmacSig);
    const header = JSON.parse(abToString(msgs[2]));
    const parentHeader = JSON.parse(abToString(msgs[3]));
    const metadata = JSON.parse(abToString(msgs[4]));
    const content = JSON.parse(abToString(msgs[5]));

    console.log("received message type", header.msg_type);
    console.log("handlers", this.handlers);
    const cb = this.handlers.get(header.msg_type);

    if (!cb) {
      throw new Error(`handler not found for type: ${header.msg_type}`);
    }

    const msg = {
      header,
      parentHeader,
      metadata,
      content,
    };
    const ctx = {};
    await cb(msg, ctx);
  }

  public async shutdown() {}
}

export class ControlComm extends Comm {
  constructor(ip: string, port: number) {
    super({
      name: "control",
      type: "router",
      hostname: ip,
      port: port,
    });

    this.setHandler("shutdown_request", this.shutdownHandler);
  }

  async shutdownHandler(msg: Message, ctx: CommContext) {
    await console.log("shutdownHandler");
    console.log(msg.header);
  }
}

export class ShellComm extends Comm {
  constructor(ip: string, port: number) {
    super({
      name: "shell",
      type: "router",
      hostname: ip,
      port: port,
    });

    this.setHandler("kernel_info_request", this.kernelInfoHandler);
  }

  async kernelInfoHandler(msg: Message, ctx: CommContext) {
    await console.log("kernelInfoHandler");
  }
}

function abToString(buf: Uint8Array | string): string {
  if (typeof buf === "string") return buf;

  return new TextDecoder().decode(buf);
}
