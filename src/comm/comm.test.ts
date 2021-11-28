import { ControlComm, ShellComm } from "./comm.ts";
import { Kernel } from "../kernel.ts";
import { msg as shutdownMsg } from "./testdata/shutdown.packet.ts";
import { msg as kernelInfoMsg } from "./testdata/kernel_info.packet.ts";

Deno.test("shell kernel info", () => {
    const k = new Kernel({ connectionFile: "../testdata/connfile.json" });
    const cc = new ShellComm("127.0.0.1", 1234, k);
    cc.recv(kernelInfoMsg);
});

Deno.test("comm shutdown", () => {
    const k = new Kernel({ connectionFile: "../testdata/connfile.json" });
    const cc = new ControlComm("127.0.0.1", 1234, k);
    cc.recv(shutdownMsg);
});
