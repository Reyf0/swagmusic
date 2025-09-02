// scripts/dev.js
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nuxiPath = resolve(__dirname, "../node_modules/nuxi/bin/nuxi.mjs");

const proc = spawn("node", [nuxiPath, "dev"], {
    stdio: "inherit",
    cwd: resolve(__dirname, ".."),
});

proc.on("exit", (code) => {
    process.exit(code ?? 0);
});
