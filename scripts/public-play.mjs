import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const isWindows = process.platform === "win32";
const npmCommand = "npm";
const defaultPort = Number(process.env.PORT ?? 3001);
const args = new Set(process.argv.slice(2));
const port = readOptionNumber("--port", defaultPort);
const skipBuild = args.has("--skip-build") || args.has("--no-build");
const tunnelOnly = args.has("--tunnel-only");
const allowCloudflaredDownload = !args.has("--no-download");

if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}

let serverProcess;
let tunnelProcess;
let reusedServer = false;
const processOutput = {
  server: [],
  tunnel: []
};

try {
  if (!skipBuild && !tunnelOnly) {
    await runForeground(npmCommand, ["run", "build"], {
      env: process.env
    });
  }

  const serverUrl = `http://localhost:${port}`;
  if (await isServerHealthy(serverUrl)) {
    if (await isFrontendAvailable(serverUrl)) {
      reusedServer = true;
      log(`Reusing existing server at ${serverUrl}`);
    } else if (tunnelOnly) {
      throw new Error(
        [
          `A server is running at ${serverUrl}, but it is not serving the game page.`,
          "Stop the old dev/server process with Ctrl+C, then run:",
          "  npm run public:no-build"
        ].join(os.EOL)
      );
    } else {
      throw new Error(
        [
          `A server is already running at ${serverUrl}, but / is not the built game page.`,
          "It is probably an old npm run dev or stale server process.",
          "Stop it with Ctrl+C, then run:",
          "  npm run public:no-build"
        ].join(os.EOL)
      );
    }
  } else if (!tunnelOnly) {
    serverProcess = spawnBackground(npmCommand, ["run", "serve"], {
      env: {
        ...process.env,
        PORT: String(port)
      },
      name: "server"
    });
    await waitForServer(serverUrl);
    if (!(await isFrontendAvailable(serverUrl))) {
      throw new Error(
        [
          `Server started at ${serverUrl}, but / is not serving the built game page.`,
          "Run npm run build again, then retry npm run public:no-build."
        ].join(os.EOL)
      );
    }
  } else {
    throw new Error(
      `No server is responding at ${serverUrl}. Start it first or remove --tunnel-only.`
    );
  }

  const cloudflared = await ensureCloudflared();
  if (!cloudflared) {
    throw new Error(
      [
        "cloudflared was not found.",
        "Install Cloudflare Tunnel, place cloudflared in artifacts/tools/,",
        "or run without --no-download so this script can download it.",
        "Windows expected path: artifacts/tools/cloudflared.exe"
      ].join(os.EOL)
    );
  }

  log(`Starting public tunnel for ${serverUrl}`);
  tunnelProcess = spawnBackground(
    cloudflared,
    ["--no-autoupdate", "tunnel", "--url", serverUrl],
    {
      env: process.env,
      name: "tunnel",
      onOutput: printTunnelUrl
    }
  );

  printReadyHint(port, reusedServer);
} catch (error) {
  console.error("");
  console.error(error instanceof Error ? error.message : error);
  cleanup();
  process.exit(1);
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

function readOptionNumber(name, fallback) {
  const raw = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!raw) {
    return fallback;
  }

  const value = Number(raw.slice(name.length + 1));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage:
  npm run public
  npm run public:no-build
  node scripts/public-play.mjs --port=3001

Options:
  --skip-build, --no-build  Start without running npm run build first.
  --tunnel-only            Only start the public tunnel; requires an existing server.
  --no-download            Do not download cloudflared automatically.
  --port=3001              Local server port to expose.
`);
}

function runForeground(command, commandArgs, options) {
  return new Promise((resolve, reject) => {
    log(`${command} ${commandArgs.join(" ")}`);
    const spec = createSpawnSpec(command, commandArgs);
    const child = spawn(spec.command, spec.args, {
      cwd: rootDir,
      env: options.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}.`));
    });
  });
}

function spawnBackground(command, commandArgs, options) {
  const spec = createSpawnSpec(command, commandArgs);
  const child = spawn(spec.command, spec.args, {
    cwd: rootDir,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    rememberProcessOutput(options.name, text);
    process.stdout.write(prefixLines(options.name, text));
    options.onOutput?.(text);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    rememberProcessOutput(options.name, text);
    process.stderr.write(prefixLines(options.name, text));
    options.onOutput?.(text);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${options.name}] exited with code ${code}`);
    }
  });

  return child;
}

function rememberProcessOutput(name, text) {
  const bucket = processOutput[name];
  if (!bucket) {
    return;
  }

  bucket.push(text);
  while (bucket.length > 80) {
    bucket.shift();
  }
}

function createSpawnSpec(command, commandArgs) {
  if (!isWindows || !shouldRunThroughCmd(command)) {
    return {
      command,
      args: commandArgs
    };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", quoteCmdCommand([command, ...commandArgs])]
  };
}

function shouldRunThroughCmd(command) {
  const base = path.basename(command).toLowerCase();
  return base === "npm" || base === "npm.cmd" || base === "npx" || base === "npx.cmd";
}

function quoteCmdCommand(parts) {
  return parts.map(quoteCmdArg).join(" ");
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9_./:=@+-]+$/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function prefixLines(name, text) {
  return text
    .split(/\r?\n/)
    .map((line, index, lines) => {
      if (line === "" && index === lines.length - 1) {
        return "";
      }

      return `[${name}] ${line}`;
    })
    .join(os.EOL);
}

async function waitForServer(serverUrl) {
  log(`Waiting for server at ${serverUrl}`);
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (await isServerHealthy(serverUrl)) {
      log(`Server is ready at ${serverUrl}`);
      return;
    }

    await sleep(250);
  }

  throw new Error(
    [
      `Server did not become ready at ${serverUrl}.`,
      "",
      "Recent server output:",
      processOutput.server.join("").trim() || "(no output captured)"
    ].join(os.EOL)
  );
}

function isServerHealthy(serverUrl) {
  return new Promise((resolve) => {
    const request = http.get(`${serverUrl}/health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function isFrontendAvailable(serverUrl) {
  return new Promise((resolve) => {
    const request = http.get(serverUrl, (response) => {
      let body = "";
      response.setEncoding("utf-8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 2048) {
          request.destroy();
        }
      });
      response.on("end", () => {
        const contentType = String(response.headers["content-type"] ?? "");
        resolve(
          response.statusCode === 200 &&
            contentType.includes("text/html") &&
            body.includes("<!doctype html")
        );
      });
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function findCloudflared() {
  const configured = process.env.CLOUDFLARED_PATH;
  const candidates = [
    configured,
    path.join(rootDir, "artifacts", "tools", isWindows ? "cloudflared.exe" : "cloudflared"),
    ...findWingetCloudflaredPaths(),
    isWindows ? "cloudflared.exe" : "cloudflared",
    "cloudflared"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
      continue;
    }

    const result = spawnSync(candidate, ["--version"], {
      cwd: rootDir,
      stdio: "ignore",
      windowsHide: true
    });
    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  return undefined;
}

function findWingetCloudflaredPaths() {
  if (!isWindows || !process.env.LOCALAPPDATA) {
    return [];
  }

  const packageRoot = path.join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
  if (!fs.existsSync(packageRoot)) {
    return [];
  }

  return fs
    .readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("Cloudflare.cloudflared_"))
    .map((entry) => path.join(packageRoot, entry.name, "cloudflared.exe"))
    .filter((candidate) => fs.existsSync(candidate));
}

async function ensureCloudflared() {
  const existing = findCloudflared();
  if (existing) {
    return existing;
  }

  if (!allowCloudflaredDownload) {
    return undefined;
  }

  const download = cloudflaredDownloadTarget();
  if (!download) {
    return undefined;
  }

  fs.mkdirSync(path.dirname(download.outputPath), { recursive: true });
  const tempPath = `${download.outputPath}.download`;
  log(`Downloading cloudflared for ${process.platform}/${process.arch}`);
  try {
    await downloadFile(download.url, tempPath);
  } catch (error) {
    throw new Error(
      [
        "Could not download cloudflared automatically.",
        error instanceof Error ? error.message : String(error),
        "",
        "Your network may be blocking GitHub release downloads.",
        "Install cloudflared manually, then run npm run public:no-build.",
        "",
        "Recommended Windows install:",
        "  winget install --id Cloudflare.cloudflared --source winget",
        "",
        "Or download it in a browser from the official Cloudflare docs:",
        "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
        "",
        "After installing, make sure this works:",
        "  cloudflared --version"
      ].join(os.EOL)
    );
  }

  if (!isWindows) {
    fs.chmodSync(tempPath, 0o755);
  }

  if (fs.existsSync(download.outputPath)) {
    const backupPath = `${download.outputPath}.old-${Date.now()}`;
    fs.renameSync(download.outputPath, backupPath);
  }
  fs.renameSync(tempPath, download.outputPath);

  const result = spawnSync(download.outputPath, ["--version"], {
    cwd: rootDir,
    stdio: "ignore",
    windowsHide: true
  });

  if (result.error || result.status !== 0) {
    return undefined;
  }

  return download.outputPath;
}

function cloudflaredDownloadTarget() {
  const outputPath = path.join(
    rootDir,
    "artifacts",
    "tools",
    isWindows ? "cloudflared.exe" : "cloudflared"
  );
  const base =
    "https://github.com/cloudflare/cloudflared/releases/latest/download";

  if (process.platform === "win32" && process.arch === "x64") {
    return {
      outputPath,
      url: `${base}/cloudflared-windows-amd64.exe`
    };
  }

  if (process.platform === "win32" && process.arch === "arm64") {
    return {
      outputPath,
      url: `${base}/cloudflared-windows-arm64.exe`
    };
  }

  if (process.platform === "linux" && process.arch === "x64") {
    return {
      outputPath,
      url: `${base}/cloudflared-linux-amd64`
    };
  }

  if (process.platform === "linux" && process.arch === "arm64") {
    return {
      outputPath,
      url: `${base}/cloudflared-linux-arm64`
    };
  }

  return undefined;
}

function downloadFile(url, outputPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects while downloading ${url}.`));
          return;
        }

        const nextUrl = new URL(response.headers.location, url).toString();
        downloadFile(nextUrl, outputPath, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const file = fs.createWriteStream(outputPath);
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
      file.on("error", reject);
    });

    request.on("error", reject);
  });
}

function printTunnelUrl(text) {
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (!match) {
    return;
  }

  console.log("");
  console.log("============================================================");
  console.log("Public game URL:");
  console.log(match[0]);
  console.log("Send this URL to players on any network.");
  console.log("Keep this terminal open while playing.");
  console.log("============================================================");
  console.log("");
}

function printReadyHint(activePort, wasReused) {
  console.log("");
  console.log("Starting public play mode...");
  console.log(`Local game: http://localhost:${activePort}`);
  if (wasReused) {
    console.log("Existing local server is being reused.");
  }
  console.log("Waiting for Cloudflare to print the public URL.");
  console.log("Press Ctrl+C to stop the tunnel.");
  console.log("");
}

function log(message) {
  console.log(`[public] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanup() {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill();
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}
