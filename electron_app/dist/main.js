"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron_app/src/main/main.ts
var import_electron2 = require("electron");
var import_path2 = __toESM(require("path"));
var import_fs = __toESM(require("fs"));

// electron_app/src/main/py_manager.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_child_process = require("child_process");
var PythonBackendManager = class {
  constructor() {
    this.backendProcess = null;
    this.port = 8e3;
  }
  /**
   * Inicia el proceso de Python.
   * Diferencia entre entorno de desarrollo (script) y producción (binario PyInstaller).
   */
  startBackend() {
    const isPackaged = import_electron.app.isPackaged;
    let command = "";
    let args = [];
    if (isPackaged) {
      command = import_path.default.join(process.resourcesPath, "local_backend", "pos_engine.exe");
    } else {
      command = import_path.default.join(__dirname, "../../..", "local_backend", "venv", "Scripts", "python.exe");
      const scriptPath = import_path.default.join(__dirname, "../../..", "local_backend", "app", "main.py");
      args = [scriptPath];
    }
    console.log(`[PyManager] Starting Local Engine: ${command} ${args.join(" ")}`);
    try {
      this.backendProcess = (0, import_child_process.spawn)(command, args, {
        cwd: isPackaged ? process.resourcesPath : import_path.default.join(__dirname, "../../..", "local_backend"),
        detached: false
        // El hijo DEBE morir si el padre muere
      });
      this.backendProcess.stdout?.on("data", (data) => {
        console.log(`[FastAPI stdout]: ${data.toString().trim()}`);
      });
      this.backendProcess.stderr?.on("data", (data) => {
        console.error(`[FastAPI stderr]: ${data.toString().trim()}`);
      });
      this.backendProcess.on("close", (code) => {
        console.warn(`[PyManager] Backend process exited with code ${code}`);
        this.backendProcess = null;
      });
    } catch (error) {
      console.error(`[PyManager] Critical Error starting backend:`, error);
      import_electron.app.quit();
    }
  }
  /**
   * Garantiza la terminación limpia de las transacciones locales antes de cerrar.
   */
  killBackend() {
    if (this.backendProcess) {
      console.log("[PyManager] Terminating Local Backend Gracefully...");
      try {
        this.backendProcess.kill("SIGTERM");
      } catch (e) {
        console.warn("[PyManager] Error sending SIGTERM, forcing kill.", e);
        try {
          this.backendProcess.kill();
        } catch (_) {
        }
      }
      this.backendProcess = null;
    }
  }
};
var pyManager = new PythonBackendManager();

// electron_app/src/main/main.ts
function createWindow() {
  const win = new import_electron2.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const isPackaged = import_electron2.app.isPackaged;
  const packagedIndex = isPackaged ? import_path2.default.join(process.resourcesPath, "out", "index.html") : import_path2.default.join(__dirname, "../../out/index.html");
  if (import_fs.default.existsSync(packagedIndex)) {
    win.loadFile(packagedIndex).catch((e) => console.error("Failed to load file:", e));
  } else {
    win.loadURL("http://localhost:3000").catch((e) => console.error("Failed to load URL:", e));
  }
}
import_electron2.app.whenReady().then(() => {
  pyManager.startBackend();
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
import_electron2.app.on("before-quit", () => {
  pyManager.killBackend();
});
