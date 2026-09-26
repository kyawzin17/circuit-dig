import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

export type CompileOptions = {
  code: string;
  fqbn?: string;
};

export type CompileResult = {
  success: boolean;
  hex?: string;
  fqbn?: string;
  logs?: string;
  error?: string;
};

export class ArduinoCompilationError extends Error {
  public statusCode: number;
  public logs?: string;

  constructor(message: string, statusCode: number = 500, logs?: string) {
    super(message);
    this.name = "ArduinoCompilationError";
    this.statusCode = statusCode;
    this.logs = logs;
  }
}

/**
 * Connected Arduino boards များကို ရှာဖွေပေးသည့် service (Existing Function)
 */
export async function getArduinoBoards() {
  // သင်၏ မူလ getArduinoBoards logic ကို ဒီနေရာတွင် ဆက်လက်ထားရှိပါ
  return { boards: [] };
}

/**
 * Arduino Sketch ကို Temp Folder တွင် ရေးသားပြီး Arduino CLI နှင့် Compile လုပ်ပေးသည့် service
 */
export async function compileSketch(options: CompileOptions): Promise<CompileResult> {
  const { code, fqbn = "arduino:avr:uno" } = options;

  /* ---------------------------------------------
     1. Code Validation
  --------------------------------------------- */
  if (!code || !code.trim()) {
    throw new ArduinoCompilationError("Arduino code is empty.", 400);
  }

  /* ---------------------------------------------
     2. Limit Sketch Size (200 KB)
  --------------------------------------------- */
  if (Buffer.byteLength(code, "utf8") > 200_000) {
    throw new ArduinoCompilationError("Arduino sketch is too large.", 413);
  }

  let tempRoot: string | null = null;

  try {
    /* ---------------------------------------------
       3. Create Temporary Directories
    --------------------------------------------- */
    const id = crypto.randomUUID();
    tempRoot = path.join(os.tmpdir(), "rde-circuit-simulator", id);

    const sketchDirectory = path.join(tempRoot, "Sketch");
    const outputDirectory = path.join(tempRoot, "build");
    await fs.mkdir(sketchDirectory, { recursive: true });
    await fs.mkdir(outputDirectory, { recursive: true });

    /* ---------------------------------------------
       4. Write Sketch File (Sketch/Sketch.ino)
    --------------------------------------------- */
    const sketchPath = path.join(sketchDirectory, "Sketch.ino");
    await fs.writeFile(sketchPath, code, "utf8");

    /* ---------------------------------------------
       5. Execute Arduino CLI Compile
    --------------------------------------------- */
    console.log(`[Arduino CLI] Compiling ${fqbn}`);
    // The repository ships simulator-compatible libraries in
    // backend/arduino-libraries so common Arduino sketches do not depend
    // on each developer having the same global Library Manager state.

    const args = [
      "compile",
      "--fqbn",
      fqbn,
      "--output-dir",
      outputDirectory,
      "--libraries",
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../arduino-libraries",
      ),
      sketchDirectory,
    ];

    let stdout = "";
    let stderr = "";

    try {
      const result = await execFileAsync("arduino-cli", args, {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      });

      stdout = result.stdout ?? "";
      stderr = result.stderr ?? "";
    } catch (error: any) {
      const cliStdout = error?.stdout ?? "";
      const cliStderr = error?.stderr ?? "";

      const message =
        cliStderr ||
        cliStdout ||
        error?.message ||
        "Arduino CLI compilation failed.";

      throw new ArduinoCompilationError(
        message,
        422,
        `${cliStdout}\n${cliStderr}`.trim()
      );
    }

    /* ---------------------------------------------
       6. Find Generated HEX File
    --------------------------------------------- */
    const files = await fs.readdir(outputDirectory);
    const hexFile = files.find((file) => file.toLowerCase().endsWith(".hex"));

    if (!hexFile) {
      throw new ArduinoCompilationError(
        "Compilation succeeded, but no HEX file was generated.",
        500,
        `${stdout}\n${stderr}`.trim()
      );
    }

    /* ---------------------------------------------
       7. Read HEX File Content
    --------------------------------------------- */
    const hexPath = path.join(outputDirectory, hexFile);
    const hex = await fs.readFile(hexPath, "utf8");

    return {
      success: true,
      hex,
      fqbn,
      logs: `${stdout}\n${stderr}`.trim(),
    };
  } finally {
    /* ---------------------------------------------
       8. Cleanup Temp Folder
    --------------------------------------------- */
    if (tempRoot) {
      try {
        await fs.rm(tempRoot, { recursive: true, force: true });
      } catch {
        // Cleanup error များအား ignore လုပ်ပါမည်
      }
    }
  }
}