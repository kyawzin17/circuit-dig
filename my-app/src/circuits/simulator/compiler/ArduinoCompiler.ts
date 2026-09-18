export type ArduinoCompileRequest = {
  code: string;
  fqbn?: string;
};

export type ArduinoCompileResult = {
  success: boolean;
  hex?: string;
  fqbn?: string;
  logs?: string;
  error?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:7000";

/**
 * Compile Arduino C++ through the local Express/arduino-cli backend.
 *
 * The browser never interprets Arduino C++ itself. The backend produces
 * the real AVR HEX firmware that is later executed by AVR8JS.
 */
export async function compileArduinoSketch(
  request: ArduinoCompileRequest
): Promise<ArduinoCompileResult> {
  if (!request.code.trim()) {
    return {
      success: false,
      error: "Arduino code is empty.",
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/arduino/compile`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: request.code,
        fqbn:
          request.fqbn ??
          "arduino:avr:uno",
      }),
    }
  );

  let result: ArduinoCompileResult;

  try {
    result =
      (await response.json()) as ArduinoCompileResult;
  } catch {
    return {
      success: false,
      error: `Compiler server returned HTTP ${response.status}.`,
    };
  }

  if (!response.ok || !result.success) {
    return {
      ...result,
      success: false,
      error:
        result.error ??
        `Arduino compilation failed (HTTP ${response.status}).`,
    };
  }

  if (!result.hex) {
    return {
      ...result,
      success: false,
      error:
        "Compilation succeeded, but the compiler returned no HEX firmware.",
    };
  }

  return result;
}
