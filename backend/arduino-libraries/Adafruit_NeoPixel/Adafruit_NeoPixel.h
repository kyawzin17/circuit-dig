#pragma once

#include <Arduino.h>
#include <stdlib.h>
#include <string.h>

/*
 * Simulator-compatible Adafruit_NeoPixel API.
 *
 * This is intentionally small rather than a copy of the upstream library.
 * It implements the public API commonly used by Arduino WS2812B examples
 * and generates a real GPIO waveform on AVR so the simulator can decode
 * the same DIN timing a physical WS2812B expects.
 */

#define NEO_RGB      0x0000
#define NEO_GRB      0x0001
#define NEO_KHZ400   0x0100
#define NEO_KHZ800   0x0000

class Adafruit_NeoPixel {
 public:
  Adafruit_NeoPixel(
    uint16_t n,
    uint8_t p,
    uint8_t t = NEO_GRB + NEO_KHZ800
  )
      : _numPixels(n),
        _pin(p),
        _type(t),
        _brightness(255),
        _pixels(nullptr),
        _begun(false) {
    _allocate(n);
  }

  ~Adafruit_NeoPixel() {
    free(_pixels);
    _pixels = nullptr;
  }

  void begin() {
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    _begun = true;
  }

  void show() {
    if (!_pixels || !_begun || _numPixels == 0) {
      return;
    }

    noInterrupts();

    #if defined(__AVR__)
      volatile uint8_t* port =
        portOutputRegister(digitalPinToPort(_pin));
      const uint8_t mask =
        digitalPinToBitMask(_pin);

      for (uint16_t i = 0; i < _numPixels; ++i) {
        const uint8_t first = _pixels[i * 3 + 0];
        const uint8_t second = _pixels[i * 3 + 1];
        const uint8_t third = _pixels[i * 3 + 2];

        _sendByte(port, mask, first);
        _sendByte(port, mask, second);
        _sendByte(port, mask, third);
      }

      *port &= static_cast<uint8_t>(~mask);
    #else
      for (uint16_t i = 0; i < _numPixels; ++i) {
        _sendBytePortable(_pixels[i * 3 + 0]);
        _sendBytePortable(_pixels[i * 3 + 1]);
        _sendBytePortable(_pixels[i * 3 + 2]);
      }
      digitalWrite(_pin, LOW);
    #endif

    interrupts();

    // WS2812B reset/latch: keep DIN LOW for >=50us.
    delayMicroseconds(60);
  }

  void clear() {
    if (_pixels) {
      memset(
        _pixels,
        0,
        static_cast<size_t>(_numPixels) * 3U
      );
    }
  }

  uint16_t numPixels() const {
    return _numPixels;
  }

  uint16_t numPixels() {
    return _numPixels;
  }

  void setPixelColor(
    uint16_t n,
    uint8_t r,
    uint8_t g,
    uint8_t b
  ) {
    if (!_pixels || n >= _numPixels) {
      return;
    }

    const uint8_t scaledR =
      _scale(r);
    const uint8_t scaledG =
      _scale(g);
    const uint8_t scaledB =
      _scale(b);

    uint8_t* pixel =
      &_pixels[static_cast<size_t>(n) * 3U];

    if ((_type & 0x0001U) == NEO_GRB) {
      pixel[0] = scaledG;
      pixel[1] = scaledR;
      pixel[2] = scaledB;
    } else {
      pixel[0] = scaledR;
      pixel[1] = scaledG;
      pixel[2] = scaledB;
    }
  }

  void setPixelColor(
    uint16_t n,
    uint32_t color
  ) {
    setPixelColor(
      n,
      static_cast<uint8_t>(color >> 16),
      static_cast<uint8_t>(color >> 8),
      static_cast<uint8_t>(color)
    );
  }

  void fill(
    uint32_t color,
    uint16_t first = 0,
    uint16_t count = 0
  ) {
    if (first >= _numPixels) {
      return;
    }

    if (count == 0 ||
        first + count > _numPixels) {
      count = _numPixels - first;
    }

    const uint8_t r =
      static_cast<uint8_t>(color >> 16);
    const uint8_t g =
      static_cast<uint8_t>(color >> 8);
    const uint8_t b =
      static_cast<uint8_t>(color);

    for (
      uint16_t i = 0;
      i < count;
      ++i
    ) {
      setPixelColor(
        first + i,
        r,
        g,
        b
      );
    }
  }

  uint32_t getPixelColor(
    uint16_t n
  ) const {
    if (!_pixels || n >= _numPixels) {
      return 0;
    }

    const uint8_t* pixel =
      &_pixels[static_cast<size_t>(n) * 3U];

    if ((_type & 0x0001U) == NEO_GRB) {
      return Color(
        pixel[1],
        pixel[0],
        pixel[2]
      );
    }

    return Color(
      pixel[0],
      pixel[1],
      pixel[2]
    );
  }

  void setBrightness(uint8_t brightness) {
    /*
     * Match the common Adafruit API semantics for future calls. The
     * simulator stores the scaled bytes so show() transmits exactly
     * what the firmware requested.
     */
    _brightness = brightness;
  }

  uint8_t getBrightness() const {
    return _brightness;
  }

  void setPin(uint8_t pin) {
    if (_begun) {
      pinMode(_pin, INPUT);
    }

    _pin = pin;

    if (_begun) {
      pinMode(_pin, OUTPUT);
      digitalWrite(_pin, LOW);
    }
  }

  static uint32_t Color(
    uint8_t r,
    uint8_t g,
    uint8_t b
  ) {
    return
      (static_cast<uint32_t>(r) << 16) |
      (static_cast<uint32_t>(g) << 8) |
      static_cast<uint32_t>(b);
  }

 private:
  uint16_t _numPixels;
  uint8_t _pin;
  uint8_t _type;
  uint8_t _brightness;
  uint8_t* _pixels;
  bool _begun;

  void _allocate(uint16_t count) {
    free(_pixels);

    _pixels = nullptr;

    if (count == 0) {
      return;
    }

    _pixels = static_cast<uint8_t*>(
      malloc(
        static_cast<size_t>(count) * 3U
      )
    );

    if (_pixels) {
      memset(
        _pixels,
        0,
        static_cast<size_t>(count) * 3U
      );
    }
  }

  uint8_t _scale(uint8_t value) const {
    if (_brightness == 255) {
      return value;
    }

    return static_cast<uint8_t>(
      (
        static_cast<uint16_t>(value) *
        static_cast<uint16_t>(_brightness)
      ) >> 8
    );
  }

  #if defined(__AVR__)
  static void _sendByte(
    volatile uint8_t* port,
    uint8_t mask,
    uint8_t value
  ) {
    for (uint8_t bit = 0; bit < 8; ++bit) {
      const bool one =
        (value & 0x80U) != 0;

      *port |= mask;

      /*
       * The simulator observes the actual AVR PORT transition cycles.
       * At 16MHz these delays produce a short HIGH for 0 and a longer
       * HIGH for 1, matching the WS2812B NRZ protocol.
       */
      if (one) {
        __builtin_avr_delay_cycles(8);
      } else {
        __builtin_avr_delay_cycles(0);
      }

      *port &= static_cast<uint8_t>(~mask);

      if (one) {
        __builtin_avr_delay_cycles(5);
      } else {
        __builtin_avr_delay_cycles(10);
      }

      value <<= 1;
    }
  }
  #else
  void _sendBytePortable(uint8_t value) {
    for (uint8_t bit = 0; bit < 8; ++bit) {
      digitalWrite(
        _pin,
        HIGH
      );

      if (value & 0x80U) {
        delayMicroseconds(1);
      }

      digitalWrite(
        _pin,
        LOW
      );

      if (!(value & 0x80U)) {
        delayMicroseconds(1);
      }

      value <<= 1;
    }
  }
  #endif
};
