import {resolve, dirname} from "https://deno.land/std@0.116.0/path/mod.ts";

export async function installKernel(scriptPath:string) {
    let baseDir:string = dirname(scriptPath);
    let tmpDir:string = await Deno.makeTempDir();
    let kernelJsonPath:string = resolve(tmpDir, "kernel.json");
    console.log("tmpDir", tmpDir);
    console.log("kernelJsonPath", kernelJsonPath);

    // write kernel spec JSON
    let jsonData = JSON.stringify({
        // specification: https://jupyter-client.readthedocs.io/en/stable/kernels.html#kernel-specs
        argv: `deno run --allow-all --unstable ${scriptPath} kernel -c {connection_file}`.split(" "),
        display_name: "Deno",
        language: "typescript",
        // interrupt_mode: "signal" | "message"
        // env: {}
        // metadata: {}
    }, null, 4);
    console.log("kernel JSON", jsonData);

    Deno.writeTextFileSync(kernelJsonPath, jsonData);

    // write logo PNG files
    Deno.copyFileSync(resolve("assets/logo-32x32.png"), resolve(tmpDir, "logo-32x32.png"));
    Deno.copyFileSync(resolve("assets/logo-64x64.png"), resolve(tmpDir, "logo-64x64.png"));

    // install kernel via jupyter
    let p = Deno.run({
        cmd: `jupyter kernelspec install --name deno ${tmpDir}`.split(" ")
    });
    await p.status();

    // delete directory
    Deno.removeSync(tmpDir, {recursive: true});

    console.log("done.");
}



