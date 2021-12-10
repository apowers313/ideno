import { hmac } from "../../deps.ts";

import { Comm, CommContext, HmacKey } from "./comm.ts";
import { desc } from "../types.ts";

export interface MessageHeader {
    // deno-lint-ignore camelcase
    msg_id: string;
    session: string;
    username: string;
    date: string;
    // deno-lint-ignore camelcase
    msg_type: MessageType;
    version: string;
}

// export interface MessageReplyHeader extends MessageHeader {
//     status: "ok" | "error" | "abort";
// }

// all message types
export type MessageType = ShellMessageType | ControlMessageType | IOPubMessageType | StdinMessageType;
export type MessageRequestType = ShellMessageRequestType | ControlMessageRequestType | IOPubMessageRequestType | StdinMessageRequestType;
export type MessageReplyType = ShellMessageReplyType | ControlMessageReplyType | IOPubMessageReplyType | StdinMessageReplyType;

// shell messages
export type ShellMessageType = ShellMessageRequestType | ShellMessageReplyType;
export type ShellMessageRequestType = "kernel_info_request" | "comm_info_request" | "execute_request" | "inspect_request" | "complete_request" | "history_request" | "is_complete_request";
export type ShellMessageReplyType = "kernel_info_reply" | "comm_info_reply" | "execute_reply" | "execute_input" | "execute_result" | "stream" | "inspect_reply" | "complete_reply" | "history_reply" | "is_complete_reply";

// comm messages
export type ControlMessageType = ControlMessageRequestType | ControlMessageReplyType;
export type ControlMessageRequestType = "shutdown_request" | "interrupt_request" | "debug_request";
export type ControlMessageReplyType = "shutdown_reply" | "interrupt_reply" | "debug_reply";

// IOPub messages
export type IOPubMessageType = IOPubMessageRequestType | IOPubMessageReplyType;
export type IOPubMessageRequestType = "stream" | "display_data" | "update_display_data" | "execute_input" | "error" | "status" | "clear_output" | "debug_event";
export type IOPubMessageReplyType = "execute_result" | "status";

// stdin messages
export type StdinMessageType = StdinMessageRequestType | StdinMessageReplyType;
export type StdinMessageRequestType = "input_request";
export type StdinMessageReplyType = "input_reply";

// content
export type MessageContent = KernelInfoContent | StatusContent | CommInfoContent | ExecuteReplyContent | ExecuteInputContent | ExecuteResultContent | StreamContent | ShutdownContent;

export interface KernelInfoContent {
    status: "ok",
    // deno-lint-ignore camelcase
    protocol_version: string,
    // deno-lint-ignore camelcase
    implementation_version: string,
    implementation: string,
    // deno-lint-ignore camelcase
    language_info: {
        name: string,
        version: string,
        mime: string,
        // deno-lint-ignore camelcase
        file_extension: string,
    },
    // deno-lint-ignore camelcase
    help_links: Array<{
        text: string,
        url: string,
    }>,
    banner: string,
    debugger: boolean,
}

export interface CommInfoContent {
    status: "ok",
    comms: CommInfo | Record<never, never>;
}

export interface ExecuteRequestContent {
    code: string,
    // deno-lint-ignore camelcase
    allow_stdin: boolean,
    silent: boolean,
    // deno-lint-ignore camelcase
    stop_on_error: boolean,
    // deno-lint-ignore camelcase
    store_history: boolean,
    // deno-lint-ignore camelcase
    user_expressions: Record<never, never>,
}

export interface ExecuteReplyContent {
    status: "ok" | "error",
    // deno-lint-ignore camelcase
    execution_count: number,
    payload: [],
    // deno-lint-ignore camelcase
    user_expressions: [],
}

export interface ExecuteInputContent {
    status: "ok",
    // deno-lint-ignore camelcase
    execution_count: number,
}

export interface ExecuteResultContent {
    // deno-lint-ignore camelcase
    execution_count: number,
    data: TextDisplayData,
    metadata: Record<never, never>,
}

export interface StreamContent {
    name: "stdout" | "stderr",
    text: string;
}

export interface ShutdownContent {
    status: "ok",
    restart: boolean;
}

export type CommInfo = {
    [key: string]: {
        comm_id: {
            target_name: string;
        };
    };
};

export type StatusContent = {
    // deno-lint-ignore camelcase
    execution_state: "idle" | "busy" | "starting";
};

export interface MessageConfigInterface {
    type: MessageType;
    reply: boolean;
    content: MessageContent;
    sessionId: string;
}

export class Message {
    public delimiter = "<IDS|MSG>";
    public header: MessageHeader;
    public parentHeader: MessageHeader | Record<never, never>;
    // deno-lint-ignore ban-types
    public metadata: object;
    public content: MessageContent | Record<never, never>;
    // deno-lint-ignore no-explicit-any
    public buffers?: Array<any>;
    public readonly sessionId: string;
    public readonly type: MessageType;
    public readonly isReply: boolean;

    constructor (cfg: MessageConfigInterface) {
        this.isReply = cfg.reply;
        this.type = cfg.type;
        this.header = this.buildHeader();
        this.parentHeader = {};
        this.metadata = {};
        this.content = cfg.content;
        this.sessionId = cfg.sessionId;
    }

    protected buildHeader(): MessageHeader {
        const session = this.sessionId;

        const ret: MessageHeader = {
            // deno-lint-ignore camelcase
            msg_id: crypto.randomUUID(),
            session,
            username: "ampower", // TODO: get username
            date: new Date().toISOString(),
            // deno-lint-ignore camelcase
            msg_type: this.type,
            version: desc.protocolVersion,
        };

        return ret;
    }

    public async serialize(hmacKey: HmacKey): Promise<Uint8Array[]> {
        // format data
        const messages: Array<Uint8Array> = [];
        messages.push(stringToAb("<IDS|MSG>"));
        const hmac = await this.calcHmac(hmacKey);
        // console.log("calculated HMAC:", hmac);
        // console.log("calculated HMAC buf:", stringToAb(hmac).toString());
        messages.push(stringToAb(hmac));
        messages.push(stringToAb(JSON.stringify(this.header)));
        messages.push(stringToAb(JSON.stringify(this.parentHeader)));
        messages.push(stringToAb(JSON.stringify(this.metadata)));
        messages.push(stringToAb(JSON.stringify(this.content)));
        if (this.buffers) {
            console.error("Jupyter message buffers not currently supported");
        }

        Comm.printMessages("==> SENDING DATA", messages, this);

        return (messages as Uint8Array[]);
    }

    public async calcHmac(hmacKey: HmacKey): Promise<string> {
        const headerStr = JSON.stringify(this.header);
        const parentHeaderStr = JSON.stringify(this.parentHeader);
        const metadataStr = JSON.stringify(this.metadata);
        const contentStr = JSON.stringify(this.content);

        const hmacData = `${headerStr}${parentHeaderStr}${metadataStr}${contentStr}`;
        console.log(`HMAC data: '${hmacData}'`);
        const ret1 = (hmac(hmacKey.alg, hmacKey.key, hmacData, "utf8", "hex") as string);
        const keyBuf = new TextEncoder().encode(hmacKey.key);
        const hmacBuf = new TextEncoder().encode(hmacData);
        console.log("hmacBuf", hmacBuf.toString());
        console.log("hmacData size", hmacData.length);
        console.log("hmacBuf size", hmacBuf.buffer.byteLength);
        console.log("++++ LIB HMAC", ret1);

        // TODO: replace hmacKey with this key
        const key = await window.crypto.subtle.importKey(
            "raw",
            keyBuf,
            { name: "HMAC", hash: { name: "SHA-256" } },
            true,
            ["sign", "verify"]
        );
        const sig = await window.crypto.subtle.sign(
            "HMAC",
            key,
            hmacBuf
        );
        const b = new Uint8Array(sig);
        const ret2 = Array.prototype.map.call(b, x => ('00' + x.toString(16)).slice(-2)).join("");
        console.log("++++ WEBCRYPTO HMAC", ret2);

        return ret2;
    }

    public static async from(data: Array<Uint8Array>, hmacKey: HmacKey): Promise<Message> {
        const delimiter = abToString(data[0]);
        const hmacSig = abToString(data[1]);
        const header = JSON.parse(abToString(data[2]));
        const parentHeader = JSON.parse(abToString(data[3]));
        const metadata = JSON.parse(abToString(data[4]));
        const content = JSON.parse(abToString(data[5]));

        console.warn("*** MSG DATA NOT VALIDATED ***");

        const m = new Message({
            type: header.msg_type,
            reply: false,
            content,
            sessionId: "" // XXX: gets overriden below anyway...
        });

        m.delimiter = delimiter;
        m.header = header;
        m.parentHeader = parentHeader;
        m.metadata = metadata;
        m.content = content;
        // TODO: buffers

        const hmac = await m.calcHmac(hmacKey);
        console.debug("Calculated HMAC", hmac);
        if (hmac !== hmacSig) {
            console.debug("Received HMAC", hmacSig);
            throw new Error("HMAC was invalid on received packet");
        }

        return m;
    }
}

export class ReplyMessage extends Message {
    // public header: MessageHeader;
    public parentHeader: MessageHeader;

    constructor (ctx: CommContext, type: MessageReplyType, content: MessageContent) {
        super({
            type,
            content,
            reply: true,
            sessionId: ctx.sessionId
        });

        this.parentHeader = ctx.msg.header;
    }
}

export class KernelInfoReplyMessage extends ReplyMessage {
    constructor (ctx: CommContext, content: KernelInfoContent) {
        super(ctx, "kernel_info_reply", content);
    }
}

export class CommInfoReplyMessage extends ReplyMessage {
    constructor (ctx: CommContext, content: CommInfoContent) {
        super(ctx, "comm_info_reply", content);
    }
}

export class ExecuteInputMessage extends ReplyMessage {
    constructor (ctx: CommContext, execCnt: number) {
        const content: ExecuteInputContent = {
            status: "ok",
            // deno-lint-ignore camelcase
            execution_count: execCnt,
        };

        super(ctx, "execute_input", content);
    }
}

export class ExecuteReplyMessage extends ReplyMessage {
    constructor (ctx: CommContext, content: ExecuteReplyContent) {
        super(ctx, "execute_reply", content);
    }
}

export interface TextDisplayData {
    "text/plain": string;
}

export class ExecuteResultMessage extends ReplyMessage {
    // deno-lint-ignore no-explicit-any
    constructor (ctx: CommContext, execCnt: number, result: any) {
        const content: ExecuteResultContent = {
            // deno-lint-ignore camelcase
            execution_count: execCnt,
            data: {
                "text/plain": Deno.inspect(result)
            },
            metadata: {},
        };
        super(ctx, "execute_result", content);
    }
}

export class StreamMessage extends ReplyMessage {
    constructor (ctx: CommContext, name: "stdout" | "stderr", text: string) {
        const content: StreamContent = { name, text };
        super(ctx, "stream", content);
    }
}

export class ShutdownReplyMessage extends ReplyMessage {
    constructor (ctx: CommContext) {
        super(ctx, "shutdown_reply", {
            status: "ok",
            restart: (ctx.msg.content as ShutdownContent).restart,
        });
    }
}

export class StatusMessage extends ReplyMessage {
    constructor (ctx: CommContext, content: StatusContent) {
        super(ctx, "status", content);
    }
}

function abToString(buf: Uint8Array | string): string {
    if (typeof buf === "string") return buf;

    return new TextDecoder().decode(buf);
}

function stringToAb(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}
