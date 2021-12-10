import { Comm, CommContext } from "./comm.ts";
import { Kernel } from "../kernel.ts";
import { msg as kernelInfoMsg } from "./testdata/kernel_info_request.packet.ts";

Deno.test("message parsing", async () => {
    const connFile = await Kernel.parseConnectionFile("./src/testdata/connfile.json");

    const c = new Comm({
        name: "test",
        hostname: "127.0.0.1",
        port: 0,
        sessionId: "bob",
        hmacKey: {
            alg: "sha256",
            key: connFile.key
        },
        handler: recvCb,
        type: "router"
    });

    await c.recv(kernelInfoMsg);

    // deno-lint-ignore require-await
    async function recvCb(ctx: CommContext) {
        console.log("received msg", ctx.msg);
    }
});
