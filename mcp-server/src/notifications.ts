import { spawn } from "node:child_process";
import { join } from "node:path";
import os from "node:os";

export function showNotification(title: string, message: string): void {
  console.error(`⟦§MUNCH NOTIFICATION⟧ ${title}: ${message}`);
  if (process.env.MUNCH_DESKTOP_NOTIFICATIONS === "false") return;

  if (process.platform === "win32") {
    const logoPath = join(os.homedir(), ".munchmemory", "munch_plugin_logo.png").replace(/\\/g, "/");
    const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
    const script = `
      Add-Type -AssemblyName System.Windows.Forms, System.Drawing
      $title = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encode(title)}'))
      $message = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encode(message)}'))
      $logoPath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encode(logoPath)}'))
      $icon = New-Object System.Windows.Forms.NotifyIcon
      $icon.Icon = [System.Drawing.SystemIcons]::Information
      if (Test-Path -LiteralPath $logoPath) {
        try {
          $image = [System.Drawing.Image]::FromFile($logoPath)
          $bitmap = New-Object System.Drawing.Bitmap $image
          $icon.Icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
        } catch {
          Write-Warning "Munch notification logo could not be loaded"
        }
      }
      $icon.BalloonTipTitle = $title
      $icon.BalloonTipText = $message
      $icon.Visible = $true
      $icon.ShowBalloonTip(5000)
      Start-Sleep -Seconds 1
      $icon.Dispose()
    `.trim();
    launch("powershell.exe", [
      "-NoProfile",
      "-EncodedCommand",
      Buffer.from(script, "utf16le").toString("base64"),
    ]);
    return;
  }

  if (process.platform === "darwin") {
    const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    launch("osascript", ["-e", `display notification "${escape(message)}" with title "${escape(title)}"`]);
    return;
  }

  if (process.platform === "linux") launch("notify-send", [title, message]);
}

function launch(command: string, args: string[]): void {
  const child = spawn(command, args, { windowsHide: true, stdio: "ignore" });
  child.on("error", (error) => {
    console.error(`⟦§MUNCH⟧ Notification command failed: ${error.message}`);
  });
}
