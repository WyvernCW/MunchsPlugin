import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const currentDir = dirname(fileURLToPath(import.meta.url));
export function runSelfConfigure() {
    const installer = join(currentDir, "..", "..", "install.js");
    const child = spawn(process.execPath, [installer, "repair", "--skip-build", "--no-ifeo"], { windowsHide: true, stdio: "inherit" });
    child.on("error", (error) => {
        console.error(`⟦§MUNCH⟧ Self-configuration failed to start: ${error.message}`);
    });
    child.on("exit", (code) => {
        if (code !== 0)
            console.error(`⟦§MUNCH⟧ Self-configuration exited with code ${code}`);
    });
}
