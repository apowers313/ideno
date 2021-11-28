import type { CommContext } from "./comm.ts";
import type { HmacKey } from "../kernel.ts";
import { desc } from "../types.ts";
import { hmac } from "https://denopkg.com/chiefbiiko/hmac/mod.ts";

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
export type ShellMessageReplyType = "kernel_info_reply" | "comm_info_reply" | "execute_reply" | "inspect_reply" | "complete_reply" | "history_reply" | "is_complete_reply";

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
export type MessageContent = KernelInfoContent | StatusContent;

export type KernelInfoContent = {
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
};

export type StatusContent = {
    // deno-lint-ignore camelcase
    execution_state: "idle" | "busy";
};

export interface MessageConfigInterface {
    type: MessageType;
    reply: boolean;
    content: MessageContent;
    ctx?: CommContext;
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
    public ctx: CommContext | null;
    public readonly type: MessageType;
    public readonly isReply: boolean;

    constructor (cfg: MessageConfigInterface) {
        this.isReply = cfg.reply;
        this.type = cfg.type;
        this.ctx = cfg.ctx ?? null;
        this.header = this.buildHeader();
        this.parentHeader = {};
        this.metadata = {};
        this.content = cfg.content;
    }

    protected buildHeader(): MessageHeader {
        const session = this.ctx?.kernel.metadata.sessionId ?? crypto.randomUUID(); // TODO: new UUID

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

    public addContext(ctx: CommContext) {
        if (this.ctx) {
            throw new Error("context already set");
        }

        this.ctx = ctx;
    }

    public serialize(hmacKey: HmacKey): Array<Uint8Array> {
        // format data
        const messages: Array<Uint8Array> = [];
        messages.push(stringToAb("<IDS|MSG>"));
        const hmac = this.calcHmac(hmacKey);
        console.log("calculated HMAC:", hmac);
        console.log("calculated HMAC buf:", stringToAb(hmac).toString());
        messages.push(stringToAb(hmac));
        messages.push(stringToAb(JSON.stringify(this.header)));
        messages.push(stringToAb(JSON.stringify(this.parentHeader)));
        messages.push(stringToAb(JSON.stringify(this.metadata)));
        messages.push(stringToAb(JSON.stringify(this.content)));
        if (this.buffers) {
            console.error("Jupyter message buffers not currently supported");
        }

        console.log("sending header", this.header);
        console.log("sending parentHeader", this.parentHeader);
        console.log("sending metadata", this.metadata);
        console.log("sending content", this.content);
        console.log("sending messages:");
        messages.forEach((m) => console.log("    message:", m.toString()));

        return messages;
    }

    public calcHmac(hmacKey: HmacKey): string {
        const headerStr = JSON.stringify(this.header);
        const parentHeaderStr = JSON.stringify(this.parentHeader);
        const metadataStr = JSON.stringify(this.metadata);
        const contentStr = JSON.stringify(this.content);

        return (hmac(hmacKey.alg, hmacKey.key, `${headerStr}${parentHeaderStr}${metadataStr}${contentStr}`, "utf8", "hex") as string);
    }

    public static from(data: Array<Uint8Array>, hmacKey: HmacKey): Message {
        data.forEach((d) => console.log("received data", d.toString()));
        const delimiter = abToString(data[0]);
        const hmacSig = abToString(data[1]);
        const header = JSON.parse(abToString(data[2]));
        const parentHeader = JSON.parse(abToString(data[3]));
        const metadata = JSON.parse(abToString(data[4]));
        const content = JSON.parse(abToString(data[5]));

        const m = new Message({
            type: header.msg_type,
            reply: false,
            content: content,
        });

        m.delimiter = delimiter;
        m.header = header;
        m.parentHeader = parentHeader;
        m.metadata = metadata;
        m.content = content;
        // TODO: buffers

        if (m.calcHmac(hmacKey) !== hmacSig) throw new Error("HMAC was invalid on received packet");

        return m;
    }
}

export class ReplyMessage extends Message {
    // public header: MessageHeader;
    public parentHeader: MessageHeader;

    constructor (ctx: CommContext, type: MessageReplyType, content: MessageContent) {
        super({
            type,
            ctx,
            content,
            reply: true,
        });

        this.parentHeader = ctx.msg.header;
        // this.header = this.buildHeader();
    }

    // buildHeader(): MessageReplyHeader {
    //     const hdr = super.buildHeader();
    //     // (hdr as MessageReplyHeader).status = "ok";
    //     return (hdr as MessageReplyHeader);
    // }
}

export class KernelInfoReplyMessage extends ReplyMessage {
    constructor (ctx: CommContext, content: KernelInfoContent) {
        super(ctx, "kernel_info_reply", content);
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
