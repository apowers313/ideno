import { Comm, CommContext } from "./comm.ts";
import { Kernel } from "../kernel.ts";
// const connFile = await Kernel.parseConnectionFile("./src/testdata/connfile.json");
// import { msg as kernelInfoMsg } from "./testdata/kernel_info_request.packet.ts";

// const connFile = await Kernel.parseConnectionFile("./src/comm/testdata/bartlomiejuConn.json");
// const bartlomiejuMsg: Array<Uint8Array> = [
//     Uint8Array.from([60, 73, 68, 83, 124, 77, 83, 71, 62]),
//     Uint8Array.from([56, 54, 99, 102, 57, 101, 50, 97, 52, 51, 101, 50, 98, 53, 100, 53, 53, 99, 102, 57, 98, 101, 52, 97, 54, 101, 48, 55, 50, 97, 101, 56, 53, 48, 49, 97, 99, 51, 54, 101, 102, 99, 97, 50, 51, 98, 52, 52, 54, 54, 57, 49, 98, 49, 49, 55, 54, 100, 53, 53, 102, 100, 53, 101]),
//     Uint8Array.from([123, 34, 109, 115, 103, 95, 105, 100, 34, 58, 32, 34, 98, 101, 56, 100, 97, 101, 98, 101, 100, 55, 55, 48, 52, 55, 49, 99, 56, 54, 97, 56, 102, 52, 51, 50, 54, 48, 55, 98, 99, 57, 49, 100, 95, 52, 52, 49, 53, 51, 95, 48, 34, 44, 32, 34, 109, 115, 103, 95, 116, 121, 112, 101, 34, 58, 32, 34, 107, 101, 114, 110, 101, 108, 95, 105, 110, 102, 111, 95, 114, 101, 113, 117, 101, 115, 116, 34, 44, 32, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 58, 32, 34, 98, 105, 119, 97, 110, 99, 122, 117, 107, 34, 44, 32, 34, 115, 101, 115, 115, 105, 111, 110, 34, 58, 32, 34, 98, 101, 56, 100, 97, 101, 98, 101, 100, 55, 55, 48, 52, 55, 49, 99, 56, 54, 97, 56, 102, 52, 51, 50, 54, 48, 55, 98, 99, 57, 49, 100, 34, 44, 32, 34, 100, 97, 116, 101, 34, 58, 32, 34, 50, 48, 50, 49, 45, 49, 50, 45, 48, 57, 84, 49, 54, 58, 50, 48, 58, 52, 48, 46, 51, 50, 55, 56, 48, 53, 90, 34, 44, 32, 34, 118, 101, 114, 115, 105, 111, 110, 34, 58, 32, 34, 53, 46, 51, 34, 125]),
//     Uint8Array.from([123, 125]),
//     Uint8Array.from([123, 125]),
//     Uint8Array.from([123, 125]),
// ];

// const connFile = await Kernel.parseConnectionFile("./src/comm/testdata/ampowerConn.json");
// const ampowerMsg: Array<Uint8Array> = [
//     Uint8Array.from([60, 73, 68, 83, 124, 77, 83, 71, 62]),
//     Uint8Array.from([54, 54, 48, 102, 54, 100, 101, 51, 51, 100, 102, 55, 99, 97, 102, 49, 97, 98, 98, 53, 101, 57, 97, 50, 56, 55, 57, 102, 101, 101, 100, 102, 98, 54, 48, 52, 56, 55, 101, 54, 51, 56, 51, 49, 51, 53, 52, 48, 101, 98, 48, 48, 48, 48, 56, 102, 50, 48, 57, 101, 98, 98, 54, 55]),
//     Uint8Array.from([123, 34, 109, 115, 103, 95, 105, 100, 34, 58, 32, 34, 98, 56, 98, 101, 56, 56, 52, 101, 57, 100, 55, 50, 52, 100, 50, 99, 56, 101, 55, 56, 53, 100, 97, 49, 52, 54, 53, 50, 48, 99, 51, 99, 95, 57, 48, 52, 56, 49, 95, 48, 34, 44, 32, 34, 109, 115, 103, 95, 116, 121, 112, 101, 34, 58, 32, 34, 107, 101, 114, 110, 101, 108, 95, 105, 110, 102, 111, 95, 114, 101, 113, 117, 101, 115, 116, 34, 44, 32, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 58, 32, 34, 97, 109, 112, 111, 119, 101, 114, 34, 44, 32, 34, 115, 101, 115, 115, 105, 111, 110, 34, 58, 32, 34, 98, 56, 98, 101, 56, 56, 52, 101, 57, 100, 55, 50, 52, 100, 50, 99, 56, 101, 55, 56, 53, 100, 97, 49, 52, 54, 53, 50, 48, 99, 51, 99, 34, 44, 32, 34, 100, 97, 116, 101, 34, 58, 32, 34, 50, 48, 50, 49, 45, 49, 50, 45, 49, 48, 84, 49, 57, 58, 52, 53, 58, 52, 50, 46, 48, 51, 54, 55, 55, 51, 90, 34, 44, 32, 34, 118, 101, 114, 115, 105, 111, 110, 34, 58, 32, 34, 53, 46, 51, 34, 125]),
//     Uint8Array.from([123, 125]),
//     Uint8Array.from([123, 125]),
//     Uint8Array.from([123, 125]),
// ];
// 'shell' received: [<IDS | MSG>, 2d73797cc162da12e7858aebd38663727a7394262c8ec1e26d3a6df2924dd40f, { "msg_id": "af3c7607d440450888a3dcb5725ed014_87873_0", "msg_type": "kernel_info_request", "username": "ampower", "session": "af3c7607d440450888a3dcb5725ed014", "date": "2021-12-10T19:20:55.922213Z", "version": "5.3" }, {}, {}, {}]

const connFile = await Kernel.parseConnectionFile("./src/comm/testdata/ijavascriptConn.json");
const ijavascriptMsg: Array<Uint8Array> = [
    Uint8Array.from([0x3c, 0x49, 0x44, 0x53, 0x7c, 0x4d, 0x53, 0x47, 0x3e]),
    Uint8Array.from([0x61, 0x65, 0x30, 0x30, 0x38, 0x32, 0x66, 0x63, 0x36, 0x30, 0x61, 0x66, 0x31, 0x61, 0x31, 0x63, 0x65, 0x38, 0x65, 0x35, 0x37, 0x33, 0x38, 0x66, 0x62, 0x62, 0x36, 0x32, 0x39, 0x33, 0x35, 0x35, 0x61, 0x37, 0x39, 0x30, 0x63, 0x32, 0x34, 0x39, 0x63, 0x38, 0x35, 0x32, 0x32, 0x32, 0x36, 0x30, 0x33, 0x38, 0x33, 0x65, 0x66, 0x37, 0x38, 0x34, 0x31, 0x61, 0x30, 0x37, 0x33, 0x37, 0x39, 0x65]),
    Uint8Array.from([0x7b, 0x22, 0x6d, 0x73, 0x67, 0x5f, 0x69, 0x64, 0x22, 0x3a, 0x20, 0x22, 0x65, 0x33, 0x34, 0x61, 0x38, 0x63, 0x66, 0x38, 0x33, 0x31, 0x36, 0x64, 0x34, 0x66, 0x33, 0x34, 0x38, 0x66, 0x61, 0x36, 0x35, 0x64, 0x31, 0x38, 0x61, 0x39, 0x33, 0x65, 0x64, 0x38, 0x62, 0x30, 0x5f, 0x39, 0x31, 0x39, 0x32, 0x30, 0x5f, 0x30, 0x22, 0x2c, 0x20, 0x22, 0x6d, 0x73, 0x67, 0x5f, 0x74, 0x79, 0x70, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x6b, 0x65, 0x72, 0x6e, 0x65, 0x6c, 0x5f, 0x69, 0x6e, 0x66, 0x6f, 0x5f, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x22, 0x2c, 0x20, 0x22, 0x75, 0x73, 0x65, 0x72, 0x6e, 0x61, 0x6d, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x61, 0x6d, 0x70, 0x6f, 0x77, 0x65, 0x72, 0x22, 0x2c, 0x20, 0x22, 0x73, 0x65, 0x73, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x3a, 0x20, 0x22, 0x65, 0x33, 0x34, 0x61, 0x38, 0x63, 0x66, 0x38, 0x33, 0x31, 0x36, 0x64, 0x34, 0x66, 0x33, 0x34, 0x38, 0x66, 0x61, 0x36, 0x35, 0x64, 0x31, 0x38, 0x61, 0x39, 0x33, 0x65, 0x64, 0x38, 0x62, 0x30, 0x22, 0x2c, 0x20, 0x22, 0x64, 0x61, 0x74, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x32, 0x30, 0x32, 0x31, 0x2d, 0x31, 0x32, 0x2d, 0x31, 0x30, 0x54, 0x32, 0x30, 0x3a, 0x30, 0x30, 0x3a, 0x35, 0x35, 0x2e, 0x33, 0x32, 0x37, 0x33, 0x39, 0x36, 0x5a, 0x22, 0x2c, 0x20, 0x22, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x3a, 0x20, 0x22, 0x35, 0x2e, 0x33, 0x22, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
];
// JMP: expectedSignature ae0082fc60af1a1ce8e5738fbb629355a790c249c8522260383ef7841a07379e;
// JMP: obtainedSignature ae0082fc60af1a1ce8e5738fbb629355a790c249c8522260383ef7841a07379e

Deno.test("message parsing", async () => {
    // const connFile = await Kernel.parseConnectionFile("./src/testdata/connfile.json");
    const hmacKey = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(connFile.key),
        { name: "HMAC", hash: { name: "SHA-256" } },
        true,
        ["sign", "verify"]
    );

    const c = new Comm({
        name: "test",
        hostname: "127.0.0.1",
        port: 0,
        sessionId: "bob",
        hmacKey,
        handler: recvCb,
        type: "router"
    });

    await c.recv(ijavascriptMsg);

    // deno-lint-ignore require-await
    async function recvCb(ctx: CommContext) {
        console.log("received msg", ctx.msg);
    }
});
