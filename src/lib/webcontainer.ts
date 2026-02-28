/**
 * WebContainer Manager — Singleton that boots and manages a WebContainer instance.
 * Used by VibeCodingMode to run generated code in the browser.
 */

import type { WebContainer, FileSystemTree, WebContainerProcess } from "@webcontainer/api";

export type ContainerStatus =
  | "idle"
  | "booting"
  | "ready"
  | "installing"
  | "starting"
  | "running"
  | "error";

export interface ContainerEvent {
  type: "status" | "log" | "error" | "server-ready" | "port";
  status?: ContainerStatus;
  message?: string;
  url?: string;
  port?: number;
}

type EventCallback = (event: ContainerEvent) => void;

let _instance: WebContainer | null = null;
let _booting = false;
let _status: ContainerStatus = "idle";
let _listeners: EventCallback[] = [];
let _devProcess: WebContainerProcess | null = null;
let _installProcess: WebContainerProcess | null = null;

function emit(event: ContainerEvent) {
  if (event.status) _status = event.status;
  for (const cb of _listeners) {
    try { cb(event); } catch { /* ignore listener errors */ }
  }
}

/**
 * Subscribe to container events.
 * Returns an unsubscribe function.
 */
export function onContainerEvent(cb: EventCallback): () => void {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
  };
}

export function getContainerStatus(): ContainerStatus {
  return _status;
}

/**
 * Boot the WebContainer (singleton — only boots once).
 */
export async function bootContainer(): Promise<WebContainer> {
  if (_instance) return _instance;
  if (_booting) {
    // Wait for existing boot
    return new Promise((resolve, reject) => {
      const unsub = onContainerEvent((e) => {
        if (e.status === "ready" && _instance) {
          unsub();
          resolve(_instance);
        } else if (e.status === "error") {
          unsub();
          reject(new Error(e.message || "Boot failed"));
        }
      });
    });
  }

  _booting = true;
  emit({ type: "status", status: "booting", message: "Mini-Computer startet..." });

  try {
    // Dynamic import to avoid SSR issues
    const { WebContainer: WC } = await import("@webcontainer/api");
    _instance = await WC.boot();

    // Listen for server-ready events
    _instance.on("server-ready", (port: number, url: string) => {
      emit({ type: "server-ready", url, port, status: "running", message: `Server bereit auf Port ${port}` });
    });

    // Listen for port events
    _instance.on("port", (port: number, type: string, url: string) => {
      if (type === "open") {
        emit({ type: "port", port, url, message: `Port ${port} geoeffnet` });
      }
    });

    emit({ type: "status", status: "ready", message: "Mini-Computer bereit" });
    _booting = false;
    return _instance;
  } catch (err) {
    _booting = false;
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler beim Starten";
    emit({ type: "status", status: "error", message: msg });
    emit({ type: "error", message: msg });
    throw err;
  }
}

/**
 * Mount a FileSystemTree into the container.
 */
export async function mountFiles(tree: FileSystemTree): Promise<void> {
  const instance = await bootContainer();
  await instance.mount(tree);
  emit({ type: "log", message: "Dateien geladen" });
}

/**
 * Write a single file (e.g. when user edits in Monaco).
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const instance = await bootContainer();
  // Ensure parent directories exist
  const parts = path.split("/");
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join("/");
    try {
      await instance.fs.mkdir(dir, { recursive: true });
    } catch { /* dir might already exist */ }
  }
  await instance.fs.writeFile(path, content);
}

/**
 * Delete a file from the container.
 */
export async function deleteFile(path: string): Promise<void> {
  const instance = await bootContainer();
  try {
    await instance.fs.rm(path);
  } catch { /* file might not exist */ }
}

/**
 * Run `npm install` in the container.
 * Streams output via events.
 */
export async function runInstall(): Promise<number> {
  const instance = await bootContainer();

  // Kill previous install if running
  if (_installProcess) {
    try { _installProcess.kill(); } catch { /* ignore */ }
    _installProcess = null;
  }

  emit({ type: "status", status: "installing", message: "Pakete werden installiert..." });

  _installProcess = await instance.spawn("npm", ["install"]);

  // Stream stdout
  _installProcess.output.pipeTo(
    new WritableStream({
      write(chunk) {
        emit({ type: "log", message: chunk });
      },
    })
  ).catch(() => {});

  const exitCode = await _installProcess.exit;
  _installProcess = null;

  if (exitCode !== 0) {
    emit({ type: "error", message: `npm install fehlgeschlagen (Exit Code: ${exitCode})` });
  } else {
    emit({ type: "log", message: "Pakete installiert" });
  }

  return exitCode;
}

/**
 * Run `npm run dev` in the container.
 * The dev server will trigger a server-ready event when ready.
 */
export async function runDevServer(): Promise<void> {
  const instance = await bootContainer();

  // Kill previous dev server if running
  await killDevServer();

  emit({ type: "status", status: "starting", message: "Server wird gestartet..." });

  _devProcess = await instance.spawn("npm", ["run", "dev"]);

  // Stream stdout
  _devProcess.output.pipeTo(
    new WritableStream({
      write(chunk) {
        emit({ type: "log", message: chunk });
      },
    })
  ).catch(() => {});

  // Handle unexpected exit
  _devProcess.exit.then((code) => {
    if (code !== 0 && _status === "starting") {
      emit({ type: "error", message: `Dev-Server beendet (Exit Code: ${code})` });
      emit({ type: "status", status: "error" });
    }
    _devProcess = null;
  });
}

/**
 * Kill the running dev server.
 */
export async function killDevServer(): Promise<void> {
  if (_devProcess) {
    try { _devProcess.kill(); } catch { /* ignore */ }
    _devProcess = null;
  }
}

/**
 * Full startup flow: mount files → npm install → npm run dev.
 * Returns the preview URL via the server-ready event.
 */
export async function startProject(tree: FileSystemTree): Promise<string> {
  await mountFiles(tree);

  const installCode = await runInstall();
  if (installCode !== 0) {
    throw new Error("npm install fehlgeschlagen");
  }

  // Start dev server and wait for server-ready
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error("Server-Start Timeout (60s)"));
    }, 60000);

    const unsub = onContainerEvent((e) => {
      if (e.type === "server-ready" && e.url) {
        clearTimeout(timeout);
        unsub();
        resolve(e.url);
      } else if (e.type === "error") {
        clearTimeout(timeout);
        unsub();
        reject(new Error(e.message || "Server-Start fehlgeschlagen"));
      }
    });

    runDevServer().catch((err) => {
      clearTimeout(timeout);
      unsub();
      reject(err);
    });
  });
}

/**
 * Teardown the WebContainer (call when leaving vibe-coding mode).
 */
export async function teardown(): Promise<void> {
  await killDevServer();
  if (_installProcess) {
    try { _installProcess.kill(); } catch { /* ignore */ }
    _installProcess = null;
  }
  if (_instance) {
    _instance.teardown();
    _instance = null;
  }
  _booting = false;
  _status = "idle";
  emit({ type: "status", status: "idle", message: "Mini-Computer heruntergefahren" });
}
