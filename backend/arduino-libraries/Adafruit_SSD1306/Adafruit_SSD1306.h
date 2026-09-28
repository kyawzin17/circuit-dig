#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>

#ifndef SSD1306_128_64
#define SSD1306_128_64 1
#endif

#ifndef SSD1306_128_32
#define SSD1306_128_32 2
#endif

#ifndef SSD1306_WHITE
#define SSD1306_WHITE 1
#endif

#ifndef SSD1306_BLACK
#define SSD1306_BLACK 0
#endif

#ifndef SSD1306_INVERSE
#define SSD1306_INVERSE 2
#endif

#ifndef SSD1306_SWITCHCAPVCC
#define SSD1306_SWITCHCAPVCC 0x02
#endif

#ifndef SSD1306_EXTERNALVCC
#define SSD1306_EXTERNALVCC 0x01
#endif

#ifndef SSD1306_I2C_ADDRESS
#define SSD1306_I2C_ADDRESS 0x3C
#endif

class Adafruit_SSD1306 : public Adafruit_GFX {
public:
  Adafruit_SSD1306(int8_t width, int8_t height, TwoWire *wire = &Wire,
                   int8_t rst_pin = -1, uint32_t clkDuring = 400000UL,
                   uint32_t clkAfter = 100000UL)
      : Adafruit_GFX(width, height),
        _wire(wire),
        _rst_pin(rst_pin),
        _clkDuring(clkDuring),
        _clkAfter(clkAfter) {}

  bool begin(uint8_t, uint8_t addr = SSD1306_I2C_ADDRESS,
             bool = true, bool = true) {
    _address = addr;
    _begun = true;
    return true;
  }

  bool begin(uint8_t vccstate, uint8_t addr, bool reset) {
    return begin(vccstate, addr, reset, true);
  }

  void clearDisplay() {
    _cleared = true;
  }

  void display() {
    _displayed = true;
  }

  void invertDisplay(bool i) {
    _inverted = i;
  }

  void dim(bool d) {
    _dimmed = d;
  }

  void ssd1306_command(uint8_t) {}
  void ssd1306_command1(uint8_t) {}

  void startscrollright(uint8_t, uint8_t) {}
  void startscrollleft(uint8_t, uint8_t) {}
  void startscrolldiagright(uint8_t, uint8_t) {}
  void startscrolldiagleft(uint8_t, uint8_t) {}
  void stopscroll() {}

  void drawPixel(int16_t x, int16_t y, uint16_t color) override {
    if (x < 0 || y < 0 || x >= width() || y >= height()) {
      return;
    }
    (void)color;
  }

  uint8_t getAddress() const { return _address; }
  bool isBegun() const { return _begun; }

private:
  TwoWire *_wire;
  int8_t _rst_pin;
  uint32_t _clkDuring;
  uint32_t _clkAfter;
  uint8_t _address = SSD1306_I2C_ADDRESS;
  bool _begun = false;
  bool _cleared = false;
  bool _displayed = false;
  bool _inverted = false;
  bool _dimmed = false;
};
