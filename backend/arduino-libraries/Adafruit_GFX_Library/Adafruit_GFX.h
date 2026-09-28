#pragma once

#include <Arduino.h>
#include <Print.h>

#ifndef WHITE
#define WHITE 1
#endif

#ifndef BLACK
#define BLACK 0
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

class Adafruit_GFX : public Print {
public:
  Adafruit_GFX(int16_t w, int16_t h)
      : WIDTH(w), HEIGHT(h), _width(w), _height(h) {}

  virtual ~Adafruit_GFX() = default;

  int16_t width() const { return _width; }
  int16_t height() const { return _height; }

  virtual void drawPixel(int16_t, int16_t, uint16_t) {}

  void setCursor(int16_t x, int16_t y) {
    cursor_x = x;
    cursor_y = y;
  }

  void setTextSize(uint8_t size) {
    textsize_x = size ? size : 1;
    textsize_y = textsize_x;
  }

  void setTextSize(uint8_t sx, uint8_t sy) {
    textsize_x = sx ? sx : 1;
    textsize_y = sy ? sy : 1;
  }

  void setTextColor(uint16_t color) {
    textcolor = color;
    textbgcolor = color;
  }

  void setTextColor(uint16_t color, uint16_t bg) {
    textcolor = color;
    textbgcolor = bg;
  }

  void setTextWrap(bool wrap) {
    wrap_enabled = wrap;
  }

  void cp437(bool = true) {}

  void writePixel(int16_t x, int16_t y, uint16_t color) {
    drawPixel(x, y, color);
  }

  size_t write(uint8_t c) override {
    if (c == '\n') {
      cursor_x = 0;
      cursor_y += 8 * textsize_y;
      return 1;
    }

    if (c == '\r') {
      return 1;
    }

    if (wrap_enabled && cursor_x + 6 * textsize_x > _width) {
      cursor_x = 0;
      cursor_y += 8 * textsize_y;
    }

    cursor_x += 6 * textsize_x;
    return 1;
  }

protected:
  const int16_t WIDTH;
  const int16_t HEIGHT;
  int16_t _width;
  int16_t _height;

  int16_t cursor_x = 0;
  int16_t cursor_y = 0;
  uint8_t textsize_x = 1;
  uint8_t textsize_y = 1;
  uint16_t textcolor = WHITE;
  uint16_t textbgcolor = BLACK;
  bool wrap_enabled = true;
};
