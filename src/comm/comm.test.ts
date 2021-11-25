import { ControlComm, ShellComm } from "./comm.ts";
import { msg as shutdownMsg } from "./testdata/shutdown.packet.ts";
import { msg as kernelInfoMsg } from "./testdata/kernel_info.packet.ts";

Deno.test("shell kernel info", () => {
    const cc = new ShellComm("127.0.0.1", 1234);
    cc.recv(kernelInfoMsg);
});

Deno.test("comm shutdown", () => {
    const cc = new ControlComm("127.0.0.1", 1234);
    cc.recv(shutdownMsg);
});
