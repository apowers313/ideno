import {parseOptions, IDenoOptionsInterface} from "./src/cli.ts";
import {Kernel} from "./src/kernel.ts";
import {installKernel} from "./src/install.ts";

const options:IDenoOptionsInterface = parseOptions();
console.log("options", options);

if(options.cmd === "install") {
    await installKernel(import.meta.url)
} else if (options.cmd === "kernel") {
    const k = new Kernel({connectionFile: options.connfile});
    await k.init();
}

