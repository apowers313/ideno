import { RemoteRepl, ExecResultEvent } from "./remote_repl.ts";

Deno.test("shell does exec", async () => {
    const rr = new RemoteRepl();

    rr.addEventListener("exec_result", (execCb as EventListener));
    function execCb(evt: ExecResultEvent) {
        console.log("kernel got exec result", evt.status);
        console.log("kernel got exec ctx", evt.ctx);
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
    await rr.queueExec(`let x = 3;\nx;`, "two");
    await rr.queueExec(`console.log("x is", x);`, "three");
}