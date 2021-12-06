import { RemoteRepl } from "./remote_repl.ts";

Deno.test("shell does exec", async () => {
    // deno-lint-ignore no-unused-vars
    async function stdioCb(buf: Uint8Array, sz: number) { }

    const rr = new RemoteRepl({
        stdoutHandler: stdioCb,
        stderrHandler: stdioCb,
    });

    await Promise.all([
        rr.init(),
        doExec(rr)
    ]);

    await rr.shutdown();
});

function delay(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function doExec(rr: RemoteRepl) {
    console.log("exec");
    await delay(5000);
    console.log("exec wait done");
    rr.exec(`console.log("hi there");`);
};