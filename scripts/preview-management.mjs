import { spawn } from "node:child_process";
const port = process.env.EV_PREVIEW_PORT || "3215";
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) throw new Error("Invalid local preview port");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development", EV_MANAGEMENT_MODE: "preview", ASSISTANT_SERVICE_URL: "", ASSISTANT_SERVICE_SECRET: "" },
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
