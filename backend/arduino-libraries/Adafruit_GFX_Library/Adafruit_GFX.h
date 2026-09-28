#pragma once

#include <Arduino.h>
#include <Print.h>
#include <stdint.h>
#include <stddef.h>

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

/*
 * RDE simulator-compatible Adafruit_GFX subset.
 *
 * It intentionally keeps the public API used by normal SSD1306 sketches,
 * while drawing into the SSD1306 subclass framebuffer through drawPixel().
 */
class Adafruit_GFX : public Print {
public:
  Adafruit_GFX(int16_t w, int16_t h)
      : WIDTH(w), HEIGHT(h), _width(w), _height(h) {}

  virtual ~Adafruit_GFX() = default;

  int16_t width() const { return _width; }
  int16_t height() const { return _height; }

  virtual void drawPixel(int16_t x, int16_t y, uint16_t color) = 0;

  void setCursor(int16_t x, int16_t y) {
    cursor_x = x;
    cursor_y = y;
  }

  int16_t getCursorX() const { return cursor_x; }
  int16_t getCursorY() const { return cursor_y; }

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

  void setTextWrap(bool wrap) { wrap_enabled = wrap; }
  void cp437(bool value = true) { _cp437 = value; (void)_cp437; }

  void setRotation(uint8_t rotation) {
    _rotation = rotation & 3;
    if (_rotation & 1) {
      _width = HEIGHT;
      _height = WIDTH;
    } else {
      _width = WIDTH;
      _height = HEIGHT;
    }
  }

  uint8_t getRotation() const { return _rotation; }

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

    if (wrap_enabled &&
        cursor_x + 6 * textsize_x > _width) {
      cursor_x = 0;
      cursor_y += 8 * textsize_y;
    }

    drawChar(
      cursor_x,
      cursor_y,
      c,
      textcolor,
      textbgcolor,
      textsize_x,
      textsize_y
    );

    cursor_x += 6 * textsize_x;
    return 1;
  }

  void drawLine(
    int16_t x0, int16_t y0,
    int16_t x1, int16_t y1,
    uint16_t color
  ) {
    const int16_t dx = abs(x1 - x0);
    const int16_t sx = x0 < x1 ? 1 : -1;
    const int16_t dy = -abs(y1 - y0);
    const int16_t sy = y0 < y1 ? 1 : -1;
    int16_t err = dx + dy;

    while (true) {
      drawPixel(x0, y0, color);
      if (x0 == x1 && y0 == y1) break;
      const int16_t e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  void drawFastHLine(int16_t x, int16_t y, int16_t w, uint16_t color) {
    drawLine(x, y, x + w - 1, y, color);
  }

  void drawFastVLine(int16_t x, int16_t y, int16_t h, uint16_t color) {
    drawLine(x, y, x, y + h - 1, color);
  }

  void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) {
    if (w <= 0 || h <= 0) return;
    drawFastHLine(x, y, w, color);
    drawFastHLine(x, y + h - 1, w, color);
    drawFastVLine(x, y, h, color);
    drawFastVLine(x + w - 1, y, h, color);
  }

  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) {
    if (w <= 0 || h <= 0) return;
    for (int16_t yy = y; yy < y + h; ++yy) {
      drawFastHLine(x, yy, w, color);
    }
  }

  void drawCircle(
    int16_t x0, int16_t y0,
    int16_t r, uint16_t color
  ) {
    int16_t x = -r;
    int16_t y = 0;
    int16_t err = 2 - 2 * r;

    do {
      drawPixel(x0 - x, y0 + y, color);
      drawPixel(x0 - y, y0 - x, color);
      drawPixel(x0 + x, y0 - y, color);
      drawPixel(x0 + y, y0 + x, color);
      r = err;
      if (r <= y) err += ++y * 2 + 1;
      if (r > x || err > y) err += ++x * 2 + 1;
    } while (x < 0);
  }

  void fillCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) {
    if (r <= 0) {
      drawPixel(x0, y0, color);
      return;
    }
    drawFastVLine(x0, y0 - r, 2 * r + 1, color);
    int16_t x = 1;
    int16_t y = r;
    int16_t p = 1 - r;

    while (x <= y) {
      if (p < 0) {
        p += 2 * x + 3;
      } else {
        drawFastVLine(x0 + x, y0 - y, 2 * y + 1, color);
        drawFastVLine(x0 - x, y0 - y, 2 * y + 1, color);
        p += 2 * (x - y) + 5;
        --y;
      }
      ++x;
    }
  }

  void getTextBounds(
    const char *text,
    int16_t x, int16_t y,
    int16_t *x1, int16_t *y1,
    uint16_t *w, uint16_t *h
  ) {
    if (!text) {
      *x1 = x; *y1 = y; *w = 0; *h = 0;
      return;
    }

    uint16_t chars = 0;
    uint16_t lines = 1;
    for (const char *p = text; *p; ++p) {
      if (*p == '\n') {
        ++lines;
      } else if (*p != '\r') {
        ++chars;
      }
    }

    *x1 = x;
    *y1 = y;
    *w = chars ? chars * 6 * textsize_x : 0;
    *h = lines * 8 * textsize_y;
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
  bool _cp437 = true;
  uint8_t _rotation = 0;

private:
  static const uint8_t *glyph(char c) {
    // Compact 5x7 font for ASCII digits, letters and common punctuation.
    static const uint8_t font[38][5] = {
      {0,0,0,0,0},       // space
      {0x3E,0x51,0x49,0x45,0x3E}, // 0
      {0x00,0x42,0x7F,0x40,0x00}, // 1
      {0x42,0x61,0x51,0x49,0x46}, // 2
      {0x21,0x41,0x45,0x4B,0x31}, // 3
      {0x18,0x14,0x12,0x7F,0x10}, // 4
      {0x27,0x45,0x45,0x45,0x39}, // 5
      {0x3C,0x4A,0x49,0x49,0x30}, // 6
      {0x01,0x71,0x09,0x05,0x03}, // 7
      {0x36,0x49,0x49,0x49,0x36}, // 8
      {0x06,0x49,0x49,0x29,0x1E}, // 9
      {0x7E,0x11,0x11,0x11,0x7E}, // A
      {0x7F,0x49,0x49,0x49,0x36}, // B
      {0x3E,0x41,0x41,0x41,0x22}, // C
      {0x7F,0x41,0x41,0x22,0x1C}, // D
      {0x7F,0x49,0x49,0x49,0x41}, // E
      {0x7F,0x09,0x09,0x09,0x01}, // F
      {0x3E,0x41,0x49,0x49,0x7A}, // G
      {0x7F,0x08,0x08,0x08,0x7F}, // H
      {0x00,0x41,0x7F,0x41,0x00}, // I
      {0x20,0x40,0x41,0x3F,0x01}, // J
      {0x7F,0x08,0x14,0x22,0x41}, // K
      {0x7F,0x40,0x40,0x40,0x40}, // L
      {0x7F,0x02,0x0C,0x02,0x7F}, // M
      {0x7F,0x04,0x08,0x10,0x7F}, // N
      {0x3E,0x41,0x41,0x41,0x3E}, // O
      {0x7F,0x09,0x09,0x09,0x06}, // P
      {0x3E,0x41,0x51,0x21,0x5E}, // Q
      {0x7F,0x09,0x19,0x29,0x46}, // R
      {0x46,0x49,0x49,0x49,0x31}, // S
      {0x01,0x01,0x7F,0x01,0x01}, // T
      {0x3F,0x40,0x40,0x40,0x3F}, // U
      {0x1F,0x20,0x40,0x20,0x1F}, // V
      {0x3F,0x40,0x38,0x40,0x3F}, // W
      {0x63,0x14,0x08,0x14,0x63}, // X
      {0x07,0x08,0x70,0x08,0x07}, // Y
      {0x61,0x51,0x49,0x45,0x43}, // Z
      {0x00,0x36,0x36,0x00,0x00}  // :
    };

    static uint8_t unknown[5] = {0,0,0,0,0};

    if (c == ' ') return font[0];
    if (c >= '0' && c <= '9') return font[1 + (c - '0')];
    if (c >= 'a' && c <= 'z') c = char(c - 'a' + 'A');
    if (c >= 'A' && c <= 'Z') return font[11 + (c - 'A')];
    if (c == ':') return font[37];

    if (c == '.') { unknown[0]=0; unknown[1]=0x60; unknown[2]=0x60; unknown[3]=0; unknown[4]=0; return unknown; }
    if (c == '-') { unknown[0]=0x08; unknown[1]=0x08; unknown[2]=0x08; unknown[3]=0x08; unknown[4]=0x08; return unknown; }
    if (c == '_') { unknown[0]=0x40; unknown[1]=0x40; unknown[2]=0x40; unknown[3]=0x40; unknown[4]=0x40; return unknown; }
    if (c == '/') { unknown[0]=0x20; unknown[1]=0x10; unknown[2]=0x08; unknown[3]=0x04; unknown[4]=0x02; return unknown; }

    return font[0];
  }

  void drawChar(
    int16_t x, int16_t y, char c,
    uint16_t color, uint16_t bg,
    uint8_t sx, uint8_t sy
  ) {
    const uint8_t *bitmap = glyph(c);

    for (uint8_t col = 0; col < 5; ++col) {
      uint8_t bits = bitmap[col];

      for (uint8_t row = 0; row < 7; ++row) {
        const bool pixel = (bits & (1 << row)) != 0;

        if (pixel) {
          for (uint8_t dx = 0; dx < sx; ++dx)
            for (uint8_t dy = 0; dy < sy; ++dy)
              drawPixel(x + col * sx + dx, y + row * sy + dy, color);
        } else if (bg != color) {
          for (uint8_t dx = 0; dx < sx; ++dx)
            for (uint8_t dy = 0; dy < sy; ++dy)
              drawPixel(x + col * sx + dx, y + row * sy + dy, bg);
        }
      }
    }
  }
};
