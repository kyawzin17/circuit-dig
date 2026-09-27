#include "Servo.h"

#if defined(ARDUINO_ARCH_AVR)

#include <avr/interrupt.h>
#include <avr/io.h>

namespace {

struct ServoChannel {
  uint8_t pin;
  uint16_t pulseTicks;
  bool active;
};

ServoChannel channels[MAX_SERVOS] = {};

volatile int8_t currentChannel = -1;
volatile uint8_t servoCount = 0;
volatile bool pulseHigh = false;
bool timerInitialized = false;

constexpr uint16_t ticksFromMicroseconds(uint16_t microseconds) {
  // Timer1 runs at 16 MHz / 8 = 2 MHz, so one tick = 0.5 us.
  return static_cast<uint16_t>(microseconds * 2U);
}

constexpr uint16_t microsecondsFromTicks(uint16_t ticks) {
  return static_cast<uint16_t>(ticks / 2U);
}

uint16_t clampPulse(int value, int minPulse, int maxPulse) {
  if (value < minPulse) return static_cast<uint16_t>(minPulse);
  if (value > maxPulse) return static_cast<uint16_t>(maxPulse);
  return static_cast<uint16_t>(value);
}

/*
 * Drive the servo signal pin directly through the ATmega328P GPIO
 * registers.
 *
 * Using Arduino digitalWrite() here is subtly wrong for Servo:
 * digitalWrite() first disables the hardware PWM channel associated
 * with pins such as D9/D10. Servo itself owns Timer1, so repeatedly
 * touching the PWM-control bits from inside the Timer1 ISR can disturb
 * the timer configuration that is generating the servo schedule.
 *
 * Direct PORT writes change exactly the same GPIO register that the
 * simulator observes, while leaving Timer1's CTC configuration alone.
 */
void writeServoPin(uint8_t pin, bool high) {
  volatile uint8_t* port = nullptr;
  uint8_t bit = 0;

  if (pin <= 7) {
    port = &PORTD;
    bit = pin;
  } else if (pin <= 13) {
    port = &PORTB;
    bit = static_cast<uint8_t>(pin - 8);
  } else if (pin <= 19) {
    port = &PORTC;
    bit = static_cast<uint8_t>(pin - 14);
  } else {
    return;
  }

  if (high) {
    *port |= _BV(bit);
  } else {
    *port &= static_cast<uint8_t>(~_BV(bit));
  }
}

bool hasActiveServo() {
  for (uint8_t i = 0; i < MAX_SERVOS; ++i) {
    if (channels[i].active) return true;
  }

  return false;
}

uint16_t totalActivePulseTicks() {
  uint32_t total = 0;

  for (uint8_t i = 0; i < MAX_SERVOS; ++i) {
    if (channels[i].active) {
      total += channels[i].pulseTicks;
    }
  }

  if (total > 65534U) {
    total = 65534U;
  }

  return static_cast<uint16_t>(total);
}

int8_t findNextActiveChannel(int8_t after) {
  int8_t next = after + 1;

  while (
    next < static_cast<int8_t>(MAX_SERVOS) &&
    !channels[next].active
  ) {
    ++next;
  }

  return next < static_cast<int8_t>(MAX_SERVOS)
    ? next
    : -1;
}

/*
 * Timer1 is shared with Servo in the real Arduino AVR library.
 *
 * We intentionally use CTC mode here instead of normal overflow mode.
 * Every compare event resets TCNT1 automatically, which makes the
 * generated 50 Hz frame deterministic in AVR8JS as well as on AVR.
 *
 * One servo frame is:
 *
 *   HIGH for pulse width
 *   LOW for the remaining frame time
 *
 * With multiple servos, pulses are emitted back-to-back and the remaining
 * time becomes the frame gap.
 */
void startTimer1() {
  if (timerInitialized) {
    return;
  }

  const uint8_t savedSreg = SREG;
  cli();

  TCCR1A = 0;
  TCCR1B = _BV(WGM12) | _BV(CS11); // CTC, /8
  TCNT1 = 0;

  /*
   * Start with the first servo pulse almost immediately.
   * AVR8JS supports Timer1 CTC compare interrupts and handles OCR1A
   * as the TOP value in this mode.
   */
  currentChannel = findNextActiveChannel(-1);
  pulseHigh = false;

  if (currentChannel >= 0) {
    writeServoPin(
      channels[currentChannel].pin,
      true
    );

    pulseHigh = true;

    OCR1A = static_cast<uint16_t>(
      channels[currentChannel].pulseTicks - 1U
    );
  } else {
    OCR1A = 0;
  }

  /*
   * On AVR, writing a 1 clears OCF1A. Use |= so the operation matches
   * the real TIFR1 write-one-to-clear semantics and AVR8JS's timer hook.
   */
  TIFR1 |= _BV(OCF1A);
  TIMSK1 |= _BV(OCIE1A);

  timerInitialized = true;

  SREG = savedSreg;
}

void stopTimer1() {
  if (!timerInitialized) {
    return;
  }

  const uint8_t savedSreg = SREG;
  cli();

  TIMSK1 &= static_cast<uint8_t>(~_BV(OCIE1A));
  TCCR1A = 0;
  TCCR1B = 0;
  TCNT1 = 0;
  OCR1A = 0;

  if (currentChannel >= 0) {
    writeServoPin(
      channels[currentChannel].pin,
      false
    );
  }

  currentChannel = -1;
  pulseHigh = false;
  timerInitialized = false;

  SREG = savedSreg;
}

void scheduleNextTimerInterval() {
  if (!hasActiveServo()) {
    stopTimer1();
    return;
  }

  if (
    currentChannel >= 0 &&
    currentChannel < static_cast<int8_t>(MAX_SERVOS) &&
    channels[currentChannel].active &&
    pulseHigh
  ) {
    /*
     * End the current HIGH pulse.
     */
    digitalWrite(
      channels[currentChannel].pin,
      LOW
    );

    pulseHigh = false;

    const int8_t next = findNextActiveChannel(currentChannel);

    if (next >= 0) {
      /*
       * Start the next servo pulse immediately after this one.
       */
      currentChannel = next;

      digitalWrite(
        channels[currentChannel].pin,
        HIGH
      );

      pulseHigh = true;

      OCR1A = static_cast<uint16_t>(
        channels[currentChannel].pulseTicks - 1U
      );

      return;
    }

    /*
     * All active servos have been pulsed. Wait until the 20 ms frame
     * boundary before starting channel zero again.
     */
    currentChannel = -1;

    const uint16_t refreshTicks =
      ticksFromMicroseconds(REFRESH_INTERVAL);

    const uint16_t pulseTicks =
      totalActivePulseTicks();

    const uint16_t gapTicks =
      pulseTicks < refreshTicks
        ? static_cast<uint16_t>(
            refreshTicks - pulseTicks
          )
        : 1U;

    OCR1A = static_cast<uint16_t>(
      gapTicks - 1U
    );

    return;
  }

  /*
   * Frame gap finished. Start the first active servo pulse.
   */
  const int8_t first = findNextActiveChannel(-1);

  if (first < 0) {
    stopTimer1();
    return;
  }

  currentChannel = first;

  digitalWrite(
    channels[currentChannel].pin,
    HIGH
  );

  pulseHigh = true;

  OCR1A = static_cast<uint16_t>(
    channels[currentChannel].pulseTicks - 1U
  );
}

ISR(TIMER1_COMPA_vect) {
  scheduleNextTimerInterval();
}

} // namespace

Servo::Servo()
    : servoIndex_(INVALID_SERVO),
      minPulse_(MIN_PULSE_WIDTH),
      maxPulse_(MAX_PULSE_WIDTH) {
  const uint8_t savedSreg = SREG;
  cli();

  if (servoCount < MAX_SERVOS) {
    servoIndex_ = servoCount++;

    channels[servoIndex_].pin = 0;
    channels[servoIndex_].pulseTicks =
      ticksFromMicroseconds(DEFAULT_PULSE_WIDTH);
    channels[servoIndex_].active = false;
  }

  SREG = savedSreg;
}

uint8_t Servo::attach(int pin) {
  return attach(
    pin,
    MIN_PULSE_WIDTH,
    MAX_PULSE_WIDTH
  );
}

uint8_t Servo::attach(
  int pin,
  int min,
  int max
) {
  if (servoIndex_ == INVALID_SERVO) {
    return INVALID_SERVO;
  }

  minPulse_ = min;
  maxPulse_ = max;

  if (minPulse_ < 100) {
    minPulse_ = 100;
  }

  if (maxPulse_ <= minPulse_) {
    maxPulse_ = minPulse_ + 1;
  }

  pinMode(pin, OUTPUT);
  writeServoPin(static_cast<uint8_t>(pin), false);

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].pin =
    static_cast<uint8_t>(pin);

  channels[servoIndex_].pulseTicks =
    ticksFromMicroseconds(
      DEFAULT_PULSE_WIDTH
    );

  channels[servoIndex_].active = true;

  startTimer1();

  SREG = savedSreg;

  return servoIndex_;
}

void Servo::detach() {
  if (servoIndex_ == INVALID_SERVO) {
    return;
  }

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].active = false;

  writeServoPin(
    channels[servoIndex_].pin,
    false
  );

  if (!hasActiveServo()) {
    stopTimer1();
  }

  SREG = savedSreg;
}

void Servo::write(int value) {
  if (value < MIN_PULSE_WIDTH) {
    value = constrain(
      value,
      0,
      180
    );

    value = map(
      value,
      0,
      180,
      minPulse_,
      maxPulse_
    );
  }

  writeMicroseconds(value);
}

void Servo::writeMicroseconds(int value) {
  if (servoIndex_ == INVALID_SERVO) {
    return;
  }

  const uint16_t pulse =
    clampPulse(
      value,
      minPulse_,
      maxPulse_
    );

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].pulseTicks =
    ticksFromMicroseconds(pulse);

  SREG = savedSreg;
}

int Servo::read() {
  const int pulse = readMicroseconds();

  if (pulse <= 0) {
    return 0;
  }

  return map(
    pulse,
    minPulse_,
    maxPulse_,
    0,
    180
  );
}

int Servo::readMicroseconds() {
  if (servoIndex_ == INVALID_SERVO) {
    return 0;
  }

  const uint8_t savedSreg = SREG;
  cli();

  const uint16_t ticks =
    channels[servoIndex_].pulseTicks;

  SREG = savedSreg;

  return microsecondsFromTicks(ticks);
}

bool Servo::attached() {
  return (
    servoIndex_ != INVALID_SERVO &&
    channels[servoIndex_].active
  );
}

#else

#error "This simulator Servo library currently supports AVR boards only."

#endif
