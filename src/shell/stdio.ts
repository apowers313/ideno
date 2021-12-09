import { BufReader } from "https://deno.land/std@0.117.0/io/mod.ts";

export type StdioPumpHandler = (str: string) => Promise<void>;

export interface StdioPumpConfig {
    stdio: Deno.Reader;
    handler: StdioPumpHandler;
    bufSz?: number;
}

export class StdioPump {
    handler: StdioPumpHandler;
    stdioBuf: BufReader;
    bufSz = 4096;

    constructor (cfg: StdioPumpConfig) {
        if (cfg.bufSz !== undefined) {
            this.bufSz = cfg.bufSz;
        }
        this.stdioBuf = new BufReader(cfg.stdio, cfg.bufSz);
        this.handler = cfg.handler;
    }

    async run() {
        while (true) {
            const buf = new Uint8Array(this.bufSz);
            const n = await this.stdioBuf.read(buf);
            if (n === null) {
                console.error("StdioPump BufReader returned null");
                break;
            }
            const str = new TextDecoder().decode(buf.buffer.slice(0, n));
            await this.handler(str);
        }
    }
}