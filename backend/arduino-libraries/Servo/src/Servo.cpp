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
bool timerInitialized = false;

constexpr uint16_t ticksFromMicroseconds(uint16_t microseconds) {
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

bool hasActiveServo() {
  for (uint8_t i = 0; i < MAX_SERVOS; ++i) {
    if (channels[i].active) return true;
  }
  return false;
}

void startTimer1() {
  if (timerInitialized) return;

  const uint8_t savedSreg = SREG;
  cli();

  TCCR1A = 0;
  TCCR1B = _BV(CS11); // Normal counting mode, /8
  TCNT1 = 0;

  /*
   * Start the first frame almost immediately. The ISR then creates
   * the real 50 Hz servo waveform from Timer1 compare events.
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
      TCNT1 + channels[currentChannel].pulseTicks
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

  currentChannel = -1;
  timerInitialized = true;

  SREG = savedSreg;
}

void stopTimer1() {
  if (!timerInitialized) return;

  const uint8_t savedSreg = SREG;
  cli();

  TIMSK1 &= static_cast<uint8_t>(~_BV(OCIE1A));
  TCCR1A = 0;
  TCCR1B = 0;
  TCNT1 = 0;
  OCR1A = 0;

  currentChannel = -1;
  timerInitialized = false;

  SREG = savedSreg;
}

void scheduleNextPulse() {
  int8_t next = currentChannel + 1;

  while (
    next < static_cast<int8_t>(MAX_SERVOS) &&
    !channels[next].active
  ) {
    ++next;
  }

  if (next < static_cast<int8_t>(MAX_SERVOS)) {
    currentChannel = next;

    digitalWrite(channels[next].pin, HIGH);

    OCR1A = static_cast<uint16_t>(
      TCNT1 + gapTicks
    );
    return;
  }

  /*
   * No more active channels. Wait for the 20 ms frame boundary.
   * TCNT1 is reset only when that boundary interrupt fires.
   */
  currentChannel = -1;

  const uint16_t refreshTicks =
    ticksFromMicroseconds(REFRESH_INTERVAL);
  const uint16_t now = TCNT1;

  currentChannel = first;

  writeServoPin(
    channels[currentChannel].pin,
    true
  );

  pulseHigh = true;

  OCR1A = static_cast<uint16_t>(
    TCNT1 + channels[currentChannel].pulseTicks
  );
}

ISR(TIMER1_COMPA_vect) {
  if (
    currentChannel >= 0 &&
    currentChannel < static_cast<int8_t>(MAX_SERVOS) &&
    channels[currentChannel].active
  ) {
    digitalWrite(channels[currentChannel].pin, LOW);
  }

  if (currentChannel < 0) {
    TCNT1 = 0;
  }

  if (hasActiveServo()) {
    scheduleNextPulse();
  } else {
    stopTimer1();
  }
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
  return attach(pin, MIN_PULSE_WIDTH, MAX_PULSE_WIDTH);
}

uint8_t Servo::attach(int pin, int min, int max) {
  if (servoIndex_ == INVALID_SERVO) return INVALID_SERVO;

  minPulse_ = min;
  maxPulse_ = max;

  if (minPulse_ < 100) minPulse_ = 100;
  if (maxPulse_ <= minPulse_) maxPulse_ = minPulse_ + 1;

  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].pin = static_cast<uint8_t>(pin);
  channels[servoIndex_].pulseTicks =
    ticksFromMicroseconds(DEFAULT_PULSE_WIDTH);
  channels[servoIndex_].active = true;

  startTimer1();

  SREG = savedSreg;
  return servoIndex_;
}

void Servo::detach() {
  if (servoIndex_ == INVALID_SERVO) return;

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].active = false;
  digitalWrite(channels[servoIndex_].pin, LOW);

  if (!hasActiveServo()) stopTimer1();

  SREG = savedSreg;
}

void Servo::write(int value) {
  if (value < MIN_PULSE_WIDTH) {
    value = constrain(value, 0, 180);
    value = map(value, 0, 180, minPulse_, maxPulse_);
  }

  writeMicroseconds(value);
}

void Servo::writeMicroseconds(int value) {
  if (servoIndex_ == INVALID_SERVO) return;

  const uint16_t pulse =
    clampPulse(value, minPulse_, maxPulse_);

  const uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].pulseTicks =
    ticksFromMicroseconds(pulse);

  SREG = savedSreg;
}

int Servo::read() {
  const int pulse = readMicroseconds();
  if (pulse <= 0) return 0;

  return map(
    pulse,
    minPulse_,
    maxPulse_,
    0,
    180
  );
}

int Servo::readMicroseconds() {
  if (servoIndex_ == INVALID_SERVO) return 0;

  const uint8_t savedSreg = SREG;
  cli();

  const uint16_t ticks =
    channels[servoIndex_].pulseTicks;

  SREG = savedSreg;

  return microsecondsFromTicks(ticks);
}

bool Servo::attached() {
  return servoIndex_ != INVALID_SERVO &&
         channels[servoIndex_].active;
}

#else

#error "This simulator Servo library currently supports AVR boards only."

#endif
