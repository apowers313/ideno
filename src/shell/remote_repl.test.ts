import { RemoteRepl, ExecDoneEvent, StdioEvent } from "./remote_repl.ts";

Deno.test("shell does exec", async () => {
    const rr = new RemoteRepl();

    rr.addEventListener("exec_result", (execCb as EventListener));
    function execCb(evt: ExecDoneEvent) {
        console.log("kernel got exec result", evt.status);
        console.log("kernel got exec ctx", evt.ctx);
    }

    rr.addEventListener("stdout", (stdioCb as EventListener));
    rr.addEventListener("stderr", (stdioCb as EventListener));
    function stdioCb(evt: StdioEvent) {
        console.log("STDIO EVENT:", evt.type);
        console.log("Data:", evt.data);
    }

    console.log("doing init..");
    await Promise.all([
        rr.init(),
        doExec(rr)
    ]);

    await rr.shutdown();
});

async function doExec(rr: RemoteRepl) {
    await rr.queueExec(`console.log("hi bob");`, "one");
    await rr.queueExec(`x = 3;\nx;`, "two");
    await rr.queueExec(`console.log("x is", x);`, "three");
    await rr.queueExec(`3`, "four");
    // await rr.queueExec("throw new Error('this is a test of the emergency broadcast system');");
}