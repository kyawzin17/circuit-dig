#pragma once

#include <Arduino.h>
#include <SPI.h>
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

#define SSD1306_MEMORYMODE 0x20
#define SSD1306_COLUMNADDR 0x21
#define SSD1306_PAGEADDR 0x22
#define SSD1306_DISPLAYOFF 0xAE
#define SSD1306_DISPLAYON 0xAF
#define SSD1306_SETDISPLAYCLOCKDIV 0xD5
#define SSD1306_SETMULTIPLEX 0xA8
#define SSD1306_SETDISPLAYOFFSET 0xD3
#define SSD1306_SETSTARTLINE 0x40
#define SSD1306_CHARGEPUMP 0x8D
#define SSD1306_SEGREMAP 0xA0
#define SSD1306_COMSCANDEC 0xC0
#define SSD1306_COMSCANINC 0xC8
#define SSD1306_SETCOMPINS 0xDA
#define SSD1306_SETCONTRAST 0x81
#define SSD1306_SETPRECHARGE 0xD9
#define SSD1306_SETVCOMDETECT 0xDB
#define SSD1306_DISPLAYALLON_RESUME 0xA4
#define SSD1306_NORMALDISPLAY 0xA6
#define SSD1306_INVERTDISPLAY 0xA7
#define SSD1306_DEACTIVATE_SCROLL 0x2E

class Adafruit_SSD1306 : public Adafruit_GFX {
public:
  // Hardware SPI: DATA=D11, CLK=D13 on UNO; DC/CS/RST are GPIO pins.
  Adafruit_SSD1306(
    uint8_t w, uint8_t h, SPIClass *spi,
    int8_t dc_pin, int8_t rst_pin, int8_t cs_pin,
    uint32_t bitrate = 8000000UL
  )
    : Adafruit_GFX(w, h),
      _spi(spi ? spi : &SPI),
      _hardwareSpi(true),
      _mosiPin(-1),
      _clkPin(-1),
      _dcPin(dc_pin),
      _rstPin(rst_pin),
      _csPin(cs_pin),
      _bitrate(bitrate) {}

  // Software SPI constructor used by the upstream Adafruit API.
  Adafruit_SSD1306(
    uint8_t w, uint8_t h,
    int8_t mosi_pin, int8_t sclk_pin,
    int8_t dc_pin, int8_t rst_pin, int8_t cs_pin
  )
    : Adafruit_GFX(w, h),
      _spi(&SPI),
      _hardwareSpi(false),
      _mosiPin(mosi_pin),
      _clkPin(sclk_pin),
      _dcPin(dc_pin),
      _rstPin(rst_pin),
      _csPin(cs_pin),
      _bitrate(8000000UL) {}

  // Deprecated size-less software SPI constructor.
  Adafruit_SSD1306(
    int8_t mosi_pin, int8_t sclk_pin,
    int8_t dc_pin, int8_t rst_pin, int8_t cs_pin
  )
    : Adafruit_SSD1306(
        128, 64,
        mosi_pin, sclk_pin, dc_pin, rst_pin, cs_pin) {}

  // Deprecated hardware SPI constructor.
  Adafruit_SSD1306(
    int8_t dc_pin, int8_t rst_pin, int8_t cs_pin
  )
    : Adafruit_SSD1306(
        128, 64, &SPI,
        dc_pin, rst_pin, cs_pin) {}

  ~Adafruit_SSD1306() override = default;

  bool begin(
    uint8_t vccstate = SSD1306_SWITCHCAPVCC,
    uint8_t = 0,
    bool reset = true,
    bool periphBegin = true
  ) {
    _begun = false;

    pinMode(_dcPin, OUTPUT);
    pinMode(_csPin, OUTPUT);
    if (_rstPin >= 0) pinMode(_rstPin, OUTPUT);

    digitalWrite(_csPin, HIGH);
    if (_rstPin >= 0) {
      digitalWrite(_rstPin, HIGH);
      if (reset) {
        digitalWrite(_rstPin, LOW);
        digitalWrite(_rstPin, HIGH);
      }
    }

    if (_hardwareSpi) {
      if (periphBegin) _spi->begin();
      _spi->beginTransaction(
        SPISettings(_bitrate, MSBFIRST, SPI_MODE0)
      );
    } else {
      pinMode(_mosiPin, OUTPUT);
      pinMode(_clkPin, OUTPUT);
      digitalWrite(_clkPin, LOW);
    }

    clearDisplay();

    // Minimal controller initialization matching the SSD1306 SPI protocol.
    command(SSD1306_DISPLAYOFF);
    command(SSD1306_SETDISPLAYCLOCKDIV); command(0x80);
    command(SSD1306_SETMULTIPLEX); command(height() - 1);
    command(SSD1306_SETDISPLAYOFFSET); command(0x00);
    command(SSD1306_SETSTARTLINE | 0x00);
    command(SSD1306_CHARGEPUMP); command(
      vccstate == SSD1306_EXTERNALVCC ? 0x10 : 0x14
    );
    command(SSD1306_MEMORYMODE); command(0x00);
    command(SSD1306_SEGREMAP | 0x01);
    command(SSD1306_COMSCANDEC);
    command(SSD1306_SETCOMPINS); command(height() == 64 ? 0x12 : 0x02);
    command(SSD1306_SETCONTRAST); command(
      height() == 64 ? 0xCF : 0x8F
    );
    command(SSD1306_SETPRECHARGE); command(
      vccstate == SSD1306_EXTERNALVCC ? 0x22 : 0xF1
    );
    command(SSD1306_SETVCOMDETECT); command(0x40);
    command(SSD1306_DISPLAYALLON_RESUME);
    command(SSD1306_NORMALDISPLAY);
    command(SSD1306_DEACTIVATE_SCROLL);
    command(SSD1306_DISPLAYON);

    if (_hardwareSpi) {
      _spi->endTransaction();
    }

    _begun = true;
    return true;
  }

  void clearDisplay() {
    for (size_t i = 0; i < sizeof(_buffer); ++i) {
      _buffer[i] = 0;
    }
  }

  void display() {
    if (!_begun) return;

    beginTransfer();
    command(SSD1306_COLUMNADDR);
    command(0);
    command(127);
    command(SSD1306_PAGEADDR);
    command(0);
    command(7);

    dataMode(true);
    for (size_t i = 0; i < sizeof(_buffer); ++i) {
      transferByte(_buffer[i]);
    }
    dataMode(false);
    endTransfer();
  }

  void invertDisplay(bool inverse) {
    beginTransfer();
    command(inverse ? SSD1306_INVERTDISPLAY : SSD1306_NORMALDISPLAY);
    endTransfer();
  }

  void dim(bool dimmed) {
    beginTransfer();
    command(SSD1306_SETCONTRAST);
    command(dimmed ? 0x00 : 0xCF);
    endTransfer();
  }

  void ssd1306_command(uint8_t value) {
    beginTransfer();
    command(value);
    endTransfer();
  }

  void ssd1306_command1(uint8_t value) {
    ssd1306_command(value);
  }

  void startscrollright(uint8_t start, uint8_t stop) {
    beginTransfer();
    command(0x26);
    command(0x00);
    command(start);
    command(0x00);
    command(stop);
    command(0x00);
    command(0xFF);
    command(0x2F);
    endTransfer();
  }

  void startscrollleft(uint8_t start, uint8_t stop) {
    beginTransfer();
    command(0x27);
    command(0x00);
    command(start);
    command(0x00);
    command(stop);
    command(0x00);
    command(0xFF);
    command(0x2F);
    endTransfer();
  }

  void startscrolldiagright(uint8_t start, uint8_t stop) {
    beginTransfer();
    command(0x29);
    command(0x00);
    command(start);
    command(0x00);
    command(stop);
    command(0x01);
    endTransfer();
  }

  void startscrolldiagleft(uint8_t start, uint8_t stop) {
    beginTransfer();
    command(0x2A);
    command(0x00);
    command(start);
    command(0x00);
    command(stop);
    command(0x01);
    endTransfer();
  }

  void stopscroll() {
    ssd1306_command(SSD1306_DEACTIVATE_SCROLL);
  }

  void drawPixel(int16_t x, int16_t y, uint16_t color) override {
    if (x < 0 || y < 0 || x >= width() || y >= height()) return;

    switch (getRotation()) {
      case 1: {
        int16_t t = x; x = y; y = t;
        x = width() - x - 1;
        break;
      }
      case 2:
        x = width() - x - 1;
        y = height() - y - 1;
        break;
      case 3: {
        int16_t t = x; x = y; y = t;
        y = height() - y - 1;
        break;
      }
      default:
        break;
    }

    if (x < 0 || y < 0 || x >= 128 || y >= 64) return;

    const size_t index =
      static_cast<size_t>(x) +
      static_cast<size_t>(y / 8) * 128;
    const uint8_t mask = static_cast<uint8_t>(1U << (y & 7));

    if (color == SSD1306_WHITE) {
      _buffer[index] |= mask;
    } else if (color == SSD1306_BLACK) {
      _buffer[index] &= static_cast<uint8_t>(~mask);
    } else if (color == SSD1306_INVERSE) {
      _buffer[index] ^= mask;
    }
  }

  uint8_t *getBuffer() { return _buffer; }

private:
  SPIClass *_spi;
  bool _hardwareSpi;
  int8_t _mosiPin;
  int8_t _clkPin;
  int8_t _dcPin;
  int8_t _rstPin;
  int8_t _csPin;
  uint32_t _bitrate;
  bool _begun = false;
  uint8_t _buffer[1024] = {};

  void beginTransfer() {
    if (_hardwareSpi) {
      _spi->beginTransaction(
        SPISettings(_bitrate, MSBFIRST, SPI_MODE0)
      );
    }
    digitalWrite(_csPin, LOW);
  }

  void endTransfer() {
    digitalWrite(_csPin, HIGH);
    if (_hardwareSpi) {
      _spi->endTransaction();
    }
  }

  void dataMode(bool data) {
    digitalWrite(_dcPin, data ? HIGH : LOW);
  }

  void command(uint8_t value) {
    dataMode(false);
    transferByte(value);
  }

  void transferByte(uint8_t value) {
    if (_hardwareSpi) {
      _spi->transfer(value);
      return;
    }

    for (uint8_t bit = 0; bit < 8; ++bit) {
      digitalWrite(
        _mosiPin,
        (value & 0x80) ? HIGH : LOW
      );
      digitalWrite(_clkPin, HIGH);
      digitalWrite(_clkPin, LOW);
      value <<= 1;
    }
  }
};
