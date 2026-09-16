import type { Request, Response } from "express";
import {
  getArduinoBoards,
  compileSketch,
  ArduinoCompilationError,
} from "../services/arduino.service.js";

type CompileRequest = {
  code: string;
  fqbn?: string;
};

type CompileResponse = {
  success: boolean;
  hex?: string;
  fqbn?: string;
  logs?: string;
  error?: string;
};

// =====================================================
// GET BOARDS CONTROLLER
// =====================================================

export async function detectBoards(_req: Request, res: Response) {
  try {
    const result = await getArduinoBoards();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Arduino Controller] Detect boards error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to detect Arduino boards",
    });
  }
}

// =====================================================
// COMPILE CONTROLLER
// =====================================================

export async function compileArduinoRoute(req: Request, res: Response) {
  try {
    const body = req.body as CompileRequest;

    const code = typeof body.code === "string" ? body.code : "";
    const fqbn =
      typeof body.fqbn === "string" && body.fqbn.trim().length > 0
        ? body.fqbn
        : "arduino:avr:uno";

    // Service သို့ ခေါ်ယူအသုံးပြုခြင်း
    const result = await compileSketch({ code, fqbn });

    const response: CompileResponse = {
      success: true,
      hex: result.hex,
      fqbn: result.fqbn,
      logs: result.logs,
    };

    return res.json(response);
  } catch (error: any) {
    console.error("[Arduino CLI] Server error:", error);

    // Service မှ သီးသန့် Throw လုပ်ထားသော Custom Error ဖြစ်ပါက
    if (error instanceof ArduinoCompilationError) {
      const response: CompileResponse = {
        success: false,
        error: error.message,
        logs: error.logs,
      };

      return res.status(error.statusCode).json(response);
    }

    // Unhandled / Unexpected server error များအတွက်
    const response: CompileResponse = {
      success: false,
      error: error?.message || "Unexpected compiler server error.",
    };

    return res.status(500).json(response);
  }
}