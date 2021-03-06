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
        const header = JSON.stringify(this.header);
        const parentHeader = JSON.stringify(this.parentHeader);
        const metadata = JSON.stringify(this.metadata);
        const content = JSON.stringify(this.content);
        const hmac = await this.hmacSign(hmacKey, header, parentHeader, metadata, content);

        messages.push(stringToAb("<IDS|MSG>"));
        messages.push(stringToAb(hmac));
        messages.push(stringToAb(header));
        messages.push(stringToAb(parentHeader));
        messages.push(stringToAb(metadata));
        messages.push(stringToAb(content));

        if (this.buffers) {
            console.error("Jupyter message buffers not currently supported");
        }

        Comm.printMessages("==> SENDING DATA", messages, this);

        return (messages as Uint8Array[]);
    }

    public async hmacSign(hmacKey: HmacKey, header: string, parentHeader: string, metadata: string, content: string): Promise<string> {
        const hmacData = `${header}${parentHeader}${metadata}${content}`;
        const hmacBuf = new TextEncoder().encode(hmacData);

        const sig = await window.crypto.subtle.sign("HMAC", hmacKey, hmacBuf);
        const ret2 = buf2hex(sig);
        console.log("++++ WEBCRYPTO HMAC", ret2);

        return ret2;
    }

    public static async hmacVerify(expectedSig: Uint8Array, hmacKey: HmacKey, headerBuf: Uint8Array, parentHeaderBuf: Uint8Array, metadataBuf: Uint8Array, contentBuf: Uint8Array) {
        const hmacBuf = Uint8Array.from([
            ...headerBuf,
            ...parentHeaderBuf,
            ...metadataBuf,
            ...contentBuf,
        ]);

        const decodedSig = hexStringToArrayBuffer(new TextDecoder().decode(expectedSig));
        const valid = await window.crypto.subtle.verify(
            "HMAC",
            hmacKey,
            decodedSig,
            hmacBuf
        );

        if (!valid) {
            throw new Error("HMAC was invalid on received packet");
        }
    }

    public static async from(data: Array<Uint8Array>, hmacKey: HmacKey): Promise<Message> {
        await this.hmacVerify(data[1], hmacKey, data[2], data[3], data[4], data[5]);

        const delimiter = abToString(data[0]);
        // const hmacSig = abToString(data[1]);
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
        // m.hmacSig = hmacSig;
        m.header = header;
        m.parentHeader = parentHeader;
        m.metadata = metadata;
        m.content = content;

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

function buf2hex(buffer: ArrayBuffer): string { // buffer is an ArrayBuffer
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

function hexStringToArrayBuffer(hexString: string) {
    // remove the leading 0x
    hexString = hexString.replace(/^0x/, '');

    // ensure even number of characters
    if (hexString.length % 2 != 0) {
        console.log('WARNING: expecting an even number of characters in the hexString');
    }

    // check for some non-hex characters
    const bad = hexString.match(/[G-Z\s]/i);
    if (bad) {
        console.log('WARNING: found non-hex characters', bad);
    }

    // split the string into pairs of octets
    const pairs = hexString.match(/[\dA-F]{2}/gi);
    if (!pairs) {
        throw new Error("malformatted HMAC string");
    }

    // convert the octets to integers
    const integers = pairs.map(function (s) {
        return parseInt(s, 16);
    });

    const array = new Uint8Array(integers);
    console.log(array);

    return array.buffer;
}