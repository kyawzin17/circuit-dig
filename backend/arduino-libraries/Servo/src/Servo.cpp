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
  // Arduino Uno: 16 MHz / 8 = 2 timer ticks per microsecond.
  return static_cast<uint16_t>(microseconds * 2U);
}

constexpr uint16_t microsecondsFromTicks(uint16_t ticks) {
  return static_cast<uint16_t>(ticks / 2U);
}

uint16_t clampPulse(int value, int minPulse, int maxPulse) {
  if (value < minPulse) {
    return static_cast<uint16_t>(minPulse);
  }
  if (value > maxPulse) {
    return static_cast<uint16_t>(maxPulse);
  }
  return static_cast<uint16_t>(value);
}

void startTimer1() {
  if (timerInitialized) {
    return;
  }

  uint8_t savedSreg = SREG;
  cli();

  TCCR1A = 0;
  TCCR1B = _BV(CS11); // normal mode, prescaler 8
  TCNT1 = 0;
  OCR1A = ticksFromMicroseconds(REFRESH_INTERVAL);

  TIFR1 = _BV(OCF1A);
  TIMSK1 |= _BV(OCIE1A);

  timerInitialized = true;
  SREG = savedSreg;
}

void stopTimer1() {
  if (!timerInitialized) {
    return;
  }

  uint8_t savedSreg = SREG;
  cli();

  TIMSK1 &= static_cast<uint8_t>(~_BV(OCIE1A));
  TCCR1A = 0;
  TCCR1B = 0;
  timerInitialized = false;
  currentChannel = -1;

  SREG = savedSreg;
}

void scheduleNextPulse() {
  int8_t next = currentChannel + 1;

  while (next < static_cast<int8_t>(MAX_SERVOS) &&
         !channels[next].active) {
    ++next;
  }

  if (next < static_cast<int8_t>(MAX_SERVOS)) {
    currentChannel = next;
    digitalWrite(channels[next].pin, HIGH);
    OCR1A = static_cast<uint16_t>(
      TCNT1 + channels[next].pulseTicks
    );
    return;
  }

  // End of the current 20 ms frame.
  currentChannel = -1;

  const uint16_t refreshTicks =
    ticksFromMicroseconds(REFRESH_INTERVAL);

  const uint16_t now = TCNT1;

  if (now + 4U < refreshTicks) {
    OCR1A = refreshTicks;
  } else {
    OCR1A = static_cast<uint16_t>(now + 4U);
  }
}

ISR(TIMER1_COMPA_vect) {
  if (currentChannel >= 0 &&
      currentChannel < static_cast<int8_t>(MAX_SERVOS) &&
      channels[currentChannel].active) {
    digitalWrite(channels[currentChannel].pin, LOW);
  }

  if (currentChannel < 0) {
    TCNT1 = 0;
  }

  scheduleNextPulse();
}

} // namespace

Servo::Servo()
    : servoIndex_(INVALID_SERVO),
      minPulse_(MIN_PULSE_WIDTH),
      maxPulse_(MAX_PULSE_WIDTH) {
  uint8_t savedSreg = SREG;
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
  digitalWrite(pin, LOW);

  uint8_t savedSreg = SREG;
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
  if (servoIndex_ == INVALID_SERVO) {
    return;
  }

  uint8_t savedSreg = SREG;
  cli();

  channels[servoIndex_].active = false;
  digitalWrite(channels[servoIndex_].pin, LOW);

  bool anyActive = false;
  for (uint8_t i = 0; i < MAX_SERVOS; ++i) {
    if (channels[i].active) {
      anyActive = true;
      break;
    }
  }

  if (!anyActive) {
    stopTimer1();
  }

  SREG = savedSreg;
}

void Servo::write(int value) {
  if (value < MIN_PULSE_WIDTH) {
    value = constrain(value, 0, 180);
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
    clampPulse(value, minPulse_, maxPulse_);

  uint8_t savedSreg = SREG;
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

  uint8_t savedSreg = SREG;
  cli();

  const uint16_t ticks =
    channels[servoIndex_].pulseTicks;

  SREG = savedSreg;

  return microsecondsFromTicks(ticks);
}

bool Servo::attached() {
  if (servoIndex_ == INVALID_SERVO) {
    return false;
  }

  return channels[servoIndex_].active;
}

#else

#error "This simulator Servo library currently supports AVR boards only."

#endif
