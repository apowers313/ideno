import { IpcComm } from "./ipc.ts";

const toChildCommPath = Deno.env.get("TO_CHILD_COMM_PATH");
const toParentCommPath = Deno.env.get("TO_PARNET_COMM_PATH");
if (!toChildCommPath || !toParentCommPath) {
    throw new Error("comm path environment variables not defined");
}

console.log("toChildCommPath", toChildCommPath);
console.log("toParentCommPath", toParentCommPath);

const ipc = new IpcComm({
    recvHandler,
    sendPath: toParentCommPath,
    recvPath: toChildCommPath,
});

async function recvHandler(msg: string) {
    await console.log("child got msg", msg);
}

await ipc.init();
await ipc.run();
