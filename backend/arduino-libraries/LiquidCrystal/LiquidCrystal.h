#ifndef RDE_LIQUIDCRYSTAL_COMPAT_H
#define RDE_LIQUIDCRYSTAL_COMPAT_H

#include <Arduino.h>
#include <Print.h>

#ifndef LCD_CLEARDISPLAY
#define LCD_CLEARDISPLAY 0x01
#define LCD_RETURNHOME 0x02
#define LCD_ENTRYMODESET 0x04
#define LCD_DISPLAYCONTROL 0x08
#define LCD_CURSORSHIFT 0x10
#define LCD_FUNCTIONSET 0x20
#define LCD_SETCGRAMADDR 0x40
#define LCD_SETDDRAMADDR 0x80

#define LCD_ENTRYRIGHT 0x00
#define LCD_ENTRYLEFT 0x02
#define LCD_ENTRYSHIFTINCREMENT 0x01
#define LCD_ENTRYSHIFTDECREMENT 0x00

#define LCD_DISPLAYON 0x04
#define LCD_DISPLAYOFF 0x00
#define LCD_CURSORON 0x02
#define LCD_CURSOROFF 0x00
#define LCD_BLINKON 0x01
#define LCD_BLINKOFF 0x00

#define LCD_DISPLAYMOVE 0x08
#define LCD_CURSORMOVE 0x00
#define LCD_MOVERIGHT 0x04
#define LCD_MOVELEFT 0x00

#define LCD_8BITMODE 0x10
#define LCD_4BITMODE 0x00
#define LCD_2LINE 0x08
#define LCD_1LINE 0x00
#define LCD_5x10DOTS 0x04
#define LCD_5x8DOTS 0x00
#endif

/*
 * RDE Circuit Simulator compatibility implementation.
 *
 * This is intentionally a small, self-contained LiquidCrystal-compatible
 * implementation. It drives the real Arduino GPIO pins using the normal
 * HD44780 parallel protocol, so the simulator can observe the same RS/E/data
 * transitions produced by an Arduino sketch.
 */
class LiquidCrystal : public Print {
public:
  LiquidCrystal(uint8_t rs, uint8_t enable,
                uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) {
    init(true, rs, 255, enable, 0, 0, 0, 0, d4, d5, d6, d7);
  }

  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable,
                uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) {
    init(true, rs, rw, enable, 0, 0, 0, 0, d4, d5, d6, d7);
  }

  LiquidCrystal(uint8_t rs, uint8_t enable,
                uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3,
                uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) {
    init(false, rs, 255, enable, d0, d1, d2, d3, d4, d5, d6, d7);
  }

  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable,
                uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3,
                uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) {
    init(false, rs, rw, enable, d0, d1, d2, d3, d4, d5, d6, d7);
  }

  void begin(uint8_t cols, uint8_t rows, uint8_t charsize = LCD_5x8DOTS) {
    _cols = cols;
    _numlines = rows > 0 ? rows : 1;

    _displayfunction =
      (_fourBit ? LCD_4BITMODE : LCD_8BITMODE) |
      (_numlines > 1 ? LCD_2LINE : LCD_1LINE) |
      ((charsize != LCD_5x8DOTS && _numlines == 1) ? LCD_5x10DOTS : LCD_5x8DOTS);

    setRowOffsets(0x00, 0x40, cols, 0x40 + cols);

    pinMode(_rs_pin, OUTPUT);
    if (_rw_pin != 255) {
      pinMode(_rw_pin, OUTPUT);
      digitalWrite(_rw_pin, LOW);
    }
    pinMode(_enable_pin, OUTPUT);

    const uint8_t count = _fourBit ? 4 : 8;
    for (uint8_t i = 0; i < count; ++i) {
      pinMode(_data_pins[i], OUTPUT);
    }

    digitalWrite(_rs_pin, LOW);
    digitalWrite(_enable_pin, LOW);

    delayMicroseconds(5000);

    if (_fourBit) {
      write4bits(0x03);
      delayMicroseconds(4500);
      write4bits(0x03);
      delayMicroseconds(4500);
      write4bits(0x03);
      delayMicroseconds(150);
      write4bits(0x02);
    } else {
      command(LCD_FUNCTIONSET | _displayfunction);
      delayMicroseconds(4500);
      command(LCD_FUNCTIONSET | _displayfunction);
      delayMicroseconds(150);
      command(LCD_FUNCTIONSET | _displayfunction);
    }

    command(LCD_FUNCTIONSET | _displayfunction);

    _displaycontrol = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF;
    display();

    clear();

    _displaymode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT;
    command(LCD_ENTRYMODESET | _displaymode);
  }

  void clear() {
    command(LCD_CLEARDISPLAY);
    delayMicroseconds(2000);
  }

  void home() {
    command(LCD_RETURNHOME);
    delayMicroseconds(2000);
  }

  void noDisplay() {
    _displaycontrol &= static_cast<uint8_t>(~LCD_DISPLAYON);
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void display() {
    _displaycontrol |= LCD_DISPLAYON;
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void noBlink() {
    _displaycontrol &= static_cast<uint8_t>(~LCD_BLINKON);
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void blink() {
    _displaycontrol |= LCD_BLINKON;
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void noCursor() {
    _displaycontrol &= static_cast<uint8_t>(~LCD_CURSORON);
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void cursor() {
    _displaycontrol |= LCD_CURSORON;
    command(LCD_DISPLAYCONTROL | _displaycontrol);
  }

  void scrollDisplayLeft() {
    command(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVELEFT);
  }

  void scrollDisplayRight() {
    command(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVERIGHT);
  }

  void leftToRight() {
    _displaymode |= LCD_ENTRYLEFT;
    command(LCD_ENTRYMODESET | _displaymode);
  }

  void rightToLeft() {
    _displaymode &= static_cast<uint8_t>(~LCD_ENTRYLEFT);
    command(LCD_ENTRYMODESET | _displaymode);
  }

  void autoscroll() {
    _displaymode |= LCD_ENTRYSHIFTINCREMENT;
    command(LCD_ENTRYMODESET | _displaymode);
  }

  void noAutoscroll() {
    _displaymode &= static_cast<uint8_t>(~LCD_ENTRYSHIFTINCREMENT);
    command(LCD_ENTRYMODESET | _displaymode);
  }

  void setRowOffsets(int row0, int row1, int row2, int row3) {
    _row_offsets[0] = row0;
    _row_offsets[1] = row1;
    _row_offsets[2] = row2;
    _row_offsets[3] = row3;
  }

  void setCursor(uint8_t col, uint8_t row) {
    const uint8_t maxRows = 4;
    if (row >= maxRows) {
      row = maxRows - 1;
    }
    if (row >= _numlines) {
      row = _numlines - 1;
    }
    command(LCD_SETDDRAMADDR | (col + _row_offsets[row]));
  }

  void createChar(uint8_t location, uint8_t charmap[]) {
    location &= 0x07;
    command(LCD_SETCGRAMADDR | (location << 3));
    for (uint8_t i = 0; i < 8; ++i) {
      write(charmap[i]);
    }
  }

  void command(uint8_t value) {
    send(value, LOW);
  }

  size_t write(uint8_t value) override {
    send(value, HIGH);
    return 1;
  }

  using Print::write;

private:
  void init(bool fourBit, uint8_t rs, uint8_t rw, uint8_t enable,
            uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3,
            uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) {
    _fourBit = fourBit;
    _rs_pin = rs;
    _rw_pin = rw;
    _enable_pin = enable;
    _data_pins[0] = d0;
    _data_pins[1] = d1;
    _data_pins[2] = d2;
    _data_pins[3] = d3;
    _data_pins[4] = d4;
    _data_pins[5] = d5;
    _data_pins[6] = d6;
    _data_pins[7] = d7;
    _displayfunction = fourBit ? LCD_4BITMODE | LCD_1LINE | LCD_5x8DOTS
                               : LCD_8BITMODE | LCD_1LINE | LCD_5x8DOTS;
    _displaycontrol = LCD_DISPLAYOFF | LCD_CURSOROFF | LCD_BLINKOFF;
    _displaymode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT;
    _numlines = 1;
    _cols = 16;
    setRowOffsets(0x00, 0x40, 0x10, 0x50);
  }

  void send(uint8_t value, uint8_t mode) {
    digitalWrite(_rs_pin, mode);
    if (_rw_pin != 255) {
      digitalWrite(_rw_pin, LOW);
    }

    if (_fourBit) {
      write4bits(value >> 4);
      write4bits(value);
    } else {
      write8bits(value);
    }
  }

  void pulseEnable() {
    digitalWrite(_enable_pin, LOW);
    delayMicroseconds(1);
    digitalWrite(_enable_pin, HIGH);
    delayMicroseconds(1);
    digitalWrite(_enable_pin, LOW);
    delayMicroseconds(100);
  }

  void write4bits(uint8_t value) {
    for (uint8_t i = 0; i < 4; ++i) {
      digitalWrite(_data_pins[i + 4], (value >> i) & 0x01);
    }
    pulseEnable();
  }

  void write8bits(uint8_t value) {
    for (uint8_t i = 0; i < 8; ++i) {
      digitalWrite(_data_pins[i], (value >> i) & 0x01);
    }
    pulseEnable();
  }

  bool _fourBit = true;
  uint8_t _rs_pin = 0;
  uint8_t _rw_pin = 255;
  uint8_t _enable_pin = 0;
  uint8_t _data_pins[8] = {};
  uint8_t _displayfunction = LCD_4BITMODE | LCD_1LINE | LCD_5x8DOTS;
  uint8_t _displaycontrol = LCD_DISPLAYOFF;
  uint8_t _displaymode = LCD_ENTRYLEFT;
  uint8_t _numlines = 1;
  uint8_t _cols = 16;
  uint8_t _row_offsets[4] = {0, 0x40, 0x10, 0x50};
};

#endif
