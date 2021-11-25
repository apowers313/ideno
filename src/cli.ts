import Denomander from "https://deno.land/x/denomander@0.9.0/mod.ts";

export interface IDenoKernelOptionsInterface {
    cmd: "kernel";
    connfile: string;
}

export interface IDenoInstallOptionsInterface {
    cmd: "install";
}

export type IDenoOptionsInterface = IDenoKernelOptionsInterface | IDenoInstallOptionsInterface;

export function parseOptions():IDenoOptionsInterface {
    console.log("parsing options");

    const program = new Denomander({
        app_name: "IDeno",
        app_description: "A Deno kernel for Jupyter",
        app_version: "0.0.1",
        options: {
            help: "classic",
        }
    });

    program
        .command("kernel")
        .requiredOption("-c, --connfile", "path to JSON file describing connection paramaters, provided by Jupyter")

    program
        .command("install");

    // program
    //     .command("config")

    program.parse(Deno.args);

    // console.log("program options", program);

    if(program.kernel) {
        return {
            cmd: "kernel",
            connfile: program.connfile,
        }
    } else if (program.install) {
        return {
            cmd: "install"
        }
    }

    throw new Error("not reached");
}