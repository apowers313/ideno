// export class RemoteRepl {
//     constructor () {
//     }

//     init() {
//         // spawn
//         // stdout, stderr, error
//         // run queue: async iterator
//     }

//     shutdown() { }

//     exec() {
//         function doExec(cmd: string) {
//             let filename = "./foo.ts";
//             console.log("running:", cmd);
//             const [f, err] = (Deno as any).core.evalContext(cmd, "<ideno>");
//             console.log("err", err);
//             console.log("f", f);
//         }

//         doExec("console.log('this is a test');");
//         doExec("x = 3");
//         doExec("console.log('x is', x);");
//         doExec("globalThis.foo = 'bar';");
//         console.log("globalThis.foo", (globalThis as any).foo);
//         doExec("await Promise.resolve(42);");
//     }

//     // history
//     // autocomplete
// }