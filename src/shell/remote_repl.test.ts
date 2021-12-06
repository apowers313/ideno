import { RemoteRepl } from "./remote_repl.ts";

Deno.test("shell does exec", async () => {
    // deno-lint-ignore no-unused-vars
    async function stdioCb(buf: Uint8Array, sz: number) { }

    const rr = new RemoteRepl({
        stdoutHandler: stdioCb,
        stderrHandler: stdioCb,
    });

    console.log("doing init..");
    await Promise.all([
        rr.init(),
        doExec(rr)
    ]);

    await rr.shutdown();
});

// function delay(ms: number) {
//     return new Promise((resolve) => {
//         setTimeout(resolve, ms);
//     });
// }

async function doExec(rr: RemoteRepl) {
    console.log("exec");
    // await delay(5000);
    console.log("exec wait done");
    await rr.exec(`console.log("hi bob");`);
    console.log("first exec done");
    await rr.exec(`let x = 3;\nx;`);
    await rr.exec(`console.log("x is", x);`);
}