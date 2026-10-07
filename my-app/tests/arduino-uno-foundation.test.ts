import assert from "node:assert/strict";
import { ArduinoUnoRuntime } from "../src/circuits/simulator/boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "../src/circuits/simulator/core/Avr8jsRunner";
import { ARDUINO_UNO_PIN_MAP } from "../src/circuits/simulator/mapping/ArduinoUnoPinMap";

function approx(actual: number | undefined, expected: number, tolerance = 1e-9) {
  assert.notEqual(actual, undefined);
  assert.ok(
    Math.abs(actual! - expected) <= tolerance,
    `expected ${expected}, got ${actual}`,
  );
}

function testPinMapping() {
  const expected: Record<string, [string, number]> = {
    D0: ["D", 0], D1: ["D", 1], D2: ["D", 2], D3: ["D", 3],
    D4: ["D", 4], D5: ["D", 5], D6: ["D", 6], D7: ["D", 7],
    D8: ["B", 0], D9: ["B", 1], D10: ["B", 2], D11: ["B", 3],
    D12: ["B", 4], D13: ["B", 5],
    A0: ["C", 0], A1: ["C", 1], A2: ["C", 2],
    A3: ["C", 3], A4: ["C", 4], A5: ["C", 5],
  };

  for (const [pin, [port, bit]] of Object.entries(expected)) {
    assert.equal(ARDUINO_UNO_PIN_MAP[pin]?.port, port, pin);
    assert.equal(ARDUINO_UNO_PIN_MAP[pin]?.bit, bit, pin);
  }
}

function testGpioAndPullup() {
  const uno = new ArduinoUnoRuntime();

  uno.applyPortRegister("B", 1 << 5, 1 << 5);
  assert.equal(uno.getDigitalInputModes().get("D13"), "output");
  assert.equal(uno.digitalRead(13), 1);
  approx(uno.getDigitalPinVoltage("D13"), 5);

  uno.applyPortRegister("D", 0, 1 << 2);
  assert.equal(uno.getDigitalInputModes().get("D2"), "input_pullup");

  uno.setInputLevel(2, 1);
  assert.equal(uno.digitalRead(2), 1);

  uno.setInputLevel(2, 0);
  assert.equal(uno.digitalRead(2), 0);

  uno.applyPortRegister("D", 0, 0);
  assert.equal(uno.getDigitalInputModes().get("D2"), "input");
}

function testAnalogGpio() {
  const uno = new ArduinoUnoRuntime();

  uno.applyPortRegister("C", 1 << 0, 1 << 0);
  assert.equal(uno.getDigitalInputModes().get("A0"), "output");
  assert.equal(uno.digitalRead(14), 1);

  uno.applyPortRegister("C", 0, 0);
  assert.equal(uno.getDigitalInputModes().get("A0"), "input");
}

function testAvrGpioBridge() {
  const uno = new ArduinoUnoRuntime();
  const avr = new Avr8jsRunner();

  /*
   * Minimal real AVR machine code:
   *   LDI r16, 0x20
   *   OUT DDRB, r16
   *   OUT PORTB, r16
   *
   * DDRB bit 5 + PORTB bit 5 = Arduino D13 HIGH.
   */
  avr.loadProgram(
    new Uint16Array([
      0xe220, // ldi r16, 0x20
      0xb904, // out DDRB, r16
      0xb905, // out PORTB, r16
      0x0000, // nop
    ]),
    uno,
  );

  avr.runCycles(20);

  assert.equal(uno.getDigitalInputModes().get("D13"), "output");
  assert.equal(uno.digitalRead(13), 1);
  assert.equal(avr.getGpioLevel("D13"), 1);

  /*
   * D2 is PORTD bit 2. With DDRD=0 and PORTD=1 the real AVR GPIO
   * is INPUT_PULLUP. The external circuit can then pull the PIN low.
   */
  const avrInput = new Avr8jsRunner();
  const unoInput = new ArduinoUnoRuntime();

  /* DDRD remains 0; PORTD bit 2 enables the real AVR pull-up. */
  avrInput.loadProgram(
    new Uint16Array([
      0xe004, // ldi r16, 0x04
      0xb90b, // out PORTD, r16
      0x0000,
    ]),
    unoInput,
  );

  avrInput.setExternalDigitalInputs({ D2: 1 });
  avrInput.runCycles(10);

  assert.equal(
    unoInput.getDigitalInputModes().get("D2"),
    "input_pullup",
  );
  assert.equal(avrInput.getGpioLevel("D2"), 1);

  avrInput.setExternalDigitalInput("D2", 0);
  assert.equal(avrInput.getGpioLevel("D2"), 0);
}

function testPwm() {
  const uno = new ArduinoUnoRuntime();
  assert.deepEqual(uno.getPwmPins(), ["D3", "D5", "D6", "D9", "D10", "D11"]);

  approx(uno.getPwmFrequencyHz("D3"), 16_000_000 / (64 * 510));
  approx(uno.getPwmFrequencyHz("D11"), 16_000_000 / (64 * 510));
  approx(uno.getPwmFrequencyHz("D5"), 16_000_000 / (64 * 256));
  approx(uno.getPwmFrequencyHz("D6"), 16_000_000 / (64 * 256));
  approx(uno.getPwmFrequencyHz("D9"), 16_000_000 / (64 * 510));
  approx(uno.getPwmFrequencyHz("D10"), 16_000_000 / (64 * 510));
  assert.equal(uno.getPwmFrequencyHz("D13"), undefined);

  uno.setPwmDuty(9, 0);
  assert.equal(uno.getPwmDuty(9), 0);
  assert.equal(uno.digitalRead(9), 0);

  uno.setPwmDuty(9, 0.5);
  approx(uno.getPwmDuty(9), 0.5);
  assert.equal(uno.getDigitalInputModes().get("D9"), "output");

  /*
   * PWM duty is configuration; the electrical voltage must follow the
   * instantaneous timer output, not 5V * duty as a fake DC level.
   */
  uno.setPwmOutputLevel(9, 0);
  assert.equal(uno.digitalRead(9), 0);
  approx(uno.getDigitalPinVoltage("D9"), 0);

  uno.setPwmOutputLevel(9, 1);
  assert.equal(uno.digitalRead(9), 1);
  approx(uno.getDigitalPinVoltage("D9"), 5);

  uno.setPwmDuty(9, 1);
  assert.equal(uno.digitalRead(9), 1);
  approx(uno.getDigitalPinVoltage("D9"), 5);
}

function testPowerModel() {
  const uno = new ArduinoUnoRuntime();
  assert.equal(uno.getClockFrequencyHz(), 16_000_000);
  assert.equal(uno.getLogicHighVoltage(), 5);

  const drivers = uno.getPowerDrivers();
  assert.ok(drivers.some((d) => d.pin === "5V" && d.voltage === 5 && d.kind === "source"));
  assert.ok(drivers.some((d) => d.pin === "3.3V" && d.voltage === 3.3 && d.kind === "source"));
  assert.ok(!drivers.some((d) => d.pin === "IOREF" && d.kind === "source"));
  assert.equal(uno.getPowerPinVoltage("AREF"), 0);
  assert.equal(uno.getPowerPinVoltage("5V"), 5);
  assert.equal(uno.getPowerPinVoltage("GND1"), 0);
}

function testReset() {
  const uno = new ArduinoUnoRuntime();

  uno.setPinMode(13, "output");
  uno.digitalWrite(13, 1);
  uno.setPwmDuty(9, 0.5);
  uno.setAnalogInput("A0", 2.5, 512);
  uno.markTxActivity();
  uno.markRxActivity();
  uno.appendSerialOutput(65);

  uno.reset();

  assert.equal(uno.getDigitalInputModes().get("D13"), "input");
  assert.equal(uno.digitalRead(13), 0);
  assert.equal(uno.getPwmDuty(9), undefined);
  assert.equal(uno.getAnalogInput("A0"), undefined);
  assert.equal(uno.getState().arduinoBoard.ledTX, false);
  assert.equal(uno.getState().arduinoBoard.ledRX, false);
  assert.equal(uno.getState().serialOutput, "");
  assert.equal(uno.getState().arduinoBoard.ledPower, false);
}

function run() {
  const tests = [
    ["pin mapping", testPinMapping],
    ["GPIO + INPUT_PULLUP", testGpioAndPullup],
    ["analog pins as GPIO", testAnalogGpio],
    ["AVR8JS GPIO bridge", testAvrGpioBridge],
    ["PWM timers + duty", testPwm],
    ["power + AREF semantics", testPowerModel],
    ["runtime reset", testReset],
  ] as const;

  for (const [name, test] of tests) {
    test();
    console.log(`PASS  ${name}`);
  }

  console.log(`UNO FOUNDATION: PASS (${tests.length}/${tests.length})`);
}

run();
