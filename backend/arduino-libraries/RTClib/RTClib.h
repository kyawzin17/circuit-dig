#ifndef RDE_RTCLIB_H
#define RDE_RTCLIB_H

#include <Arduino.h>
#include <Wire.h>
#include <stdint.h>

// Forward declaration: DateTime exposes operators taking TimeSpan below.
class TimeSpan;

/*
 * Simulator-compatible subset of Adafruit RTClib.
 *
 * The public API intentionally follows the commonly used RTClib
 * DateTime / RTC_DS1307 interface so sketches can be compiled and
 * executed by the real AVR firmware runtime.
 */

class DateTime {
public:
  DateTime()
      : _unixtime(946684800UL) {}

  DateTime(uint32_t t)
      : _unixtime(t) {}

  DateTime(
      uint16_t year,
      uint8_t month,
      uint8_t day,
      uint8_t hour = 0,
      uint8_t minute = 0,
      uint8_t second = 0)
      : _unixtime(fromCivil(
            year,
            month,
            day,
            hour,
            minute,
            second)) {}

  DateTime(
      const char *date,
      const char *time)
      : _unixtime(
          fromCompileDateTime(
            date,
            time)) {}

  DateTime(
      const __FlashStringHelper *date,
      const __FlashStringHelper *time)
      : _unixtime(946684800UL) {
    char dateBuffer[12] = {0};
    char timeBuffer[9] = {0};

    if (date) {
      memcpy_P(dateBuffer, date, 11);
    }

    if (time) {
      memcpy_P(timeBuffer, time, 8);
    }

    _unixtime =
      fromCompileDateTime(
        dateBuffer,
        timeBuffer);
  }

  explicit DateTime(
      const char *iso8601)
      : _unixtime(946684800UL) {
    if (!iso8601) {
      return;
    }

    const uint16_t year =
      static_cast<uint16_t>(
        (iso8601[0] - '0') * 1000 +
        (iso8601[1] - '0') * 100 +
        (iso8601[2] - '0') * 10 +
        (iso8601[3] - '0')
      );

    const uint8_t month =
      static_cast<uint8_t>(
        (iso8601[5] - '0') * 10 +
        (iso8601[6] - '0')
      );

    const uint8_t day =
      static_cast<uint8_t>(
        (iso8601[8] - '0') * 10 +
        (iso8601[9] - '0')
      );

    const uint8_t hour =
      static_cast<uint8_t>(
        (iso8601[11] - '0') * 10 +
        (iso8601[12] - '0')
      );

    const uint8_t minute =
      static_cast<uint8_t>(
        (iso8601[14] - '0') * 10 +
        (iso8601[15] - '0')
      );

    const uint8_t second =
      static_cast<uint8_t>(
        (iso8601[17] - '0') * 10 +
        (iso8601[18] - '0')
      );

    _unixtime =
      fromCivil(
        year,
        month,
        day,
        hour,
        minute,
        second);
  }

  bool isValid() const {
    const Civil value = civil();

    return value.year >= 2000 &&
           value.year <= 2099 &&
           value.month >= 1 &&
           value.month <= 12 &&
           value.day >= 1 &&
           value.day <= 31 &&
           value.hour <= 23 &&
           value.minute <= 59 &&
           value.second <= 59;
  }

  uint8_t twelveHour() const {
    const uint8_t h = hour();

    if (h == 0 || h == 12) {
      return 12;
    }

    return h > 12 ? h - 12 : h;
  }

  uint8_t isPM() const {
    return hour() >= 12 ? 1 : 0;
  }

  uint16_t year() const {
    return civil().year;
  }

  uint8_t month() const {
    return civil().month;
  }

  uint8_t day() const {
    return civil().day;
  }

  uint8_t hour() const {
    return civil().hour;
  }

  uint8_t minute() const {
    return civil().minute;
  }

  uint8_t second() const {
    return civil().second;
  }

  uint8_t dayOfTheWeek() const {
    /*
     * 0 = Sunday, matching Adafruit RTClib.
     */
    return static_cast<uint8_t>(
      (daysFromCivil(civil().year, civil().month, civil().day) + 4) % 7
    );
  }

  uint32_t unixtime() const {
    return _unixtime;
  }

  uint32_t secondstime() const {
    return _unixtime - 946684800UL;
  }

  bool operator<(const DateTime &other) const {
    return _unixtime < other._unixtime;
  }

  bool operator>(const DateTime &other) const {
    return _unixtime > other._unixtime;
  }

  bool operator==(const DateTime &other) const {
    return _unixtime == other._unixtime;
  }

  bool operator!=(const DateTime &other) const {
    return _unixtime != other._unixtime;
  }

  bool operator<=(const DateTime &other) const {
    return _unixtime <= other._unixtime;
  }

  bool operator>=(const DateTime &other) const {
    return _unixtime >= other._unixtime;
  }

  DateTime operator+(const TimeSpan &span) const;
  DateTime operator-(const TimeSpan &span) const;

private:
  struct Civil {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
  };

  uint32_t _unixtime;

  static int32_t daysFromCivil(
      int32_t y,
      uint32_t m,
      uint32_t d) {
    y -= m <= 2;
    const int32_t era =
      (y >= 0 ? y : y - 399) / 400;
    const uint32_t yoe =
      static_cast<uint32_t>(y - era * 400);
    const uint32_t doy =
      (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 +
      d - 1;
    const uint32_t doe =
      yoe * 365 +
      yoe / 4 -
      yoe / 100 +
      doy;

    return era * 146097 + static_cast<int32_t>(doe) - 719468;
  }

  static uint32_t fromCivil(
      uint16_t year,
      uint8_t month,
      uint8_t day,
      uint8_t hour,
      uint8_t minute,
      uint8_t second) {
    const int32_t days =
      daysFromCivil(year, month, day);

    const int64_t seconds =
      static_cast<int64_t>(days) * 86400LL +
      static_cast<int64_t>(hour) * 3600LL +
      static_cast<int64_t>(minute) * 60LL +
      second;

    return static_cast<uint32_t>(seconds + 946684800ULL);
  }

  static uint32_t fromCompileDateTime(
      const char *date,
      const char *time) {
    static const char months[] =
      "JanFebMarAprMayJunJulAugSepOctNovDec";

    char monthText[4] = {0, 0, 0, 0};
    uint8_t day = 1;
    uint16_t year = 2000;
    uint8_t hour = 0;
    uint8_t minute = 0;
    uint8_t second = 0;

    if (date) {
      monthText[0] = date[0];
      monthText[1] = date[1];
      monthText[2] = date[2];

      for (uint8_t i = 0; i < 12; ++i) {
        if (
          monthText[0] == months[i * 3] &&
          monthText[1] == months[i * 3 + 1] &&
          monthText[2] == months[i * 3 + 2]
        ) {
          // month is resolved below
          uint8_t month = i + 1;
          const char *p = date + 4;
          while (*p == ' ') {
            ++p;
          }

          day = static_cast<uint8_t>(
            p[0] >= '0' && p[0] <= '9'
              ? p[0] - '0'
              : 1
          );

          if (p[1] >= '0' && p[1] <= '9') {
            day = static_cast<uint8_t>(
              day * 10 + (p[1] - '0')
            );
          }

          const char *y = date + 7;
          year = static_cast<uint16_t>(
            (y[0] - '0') * 1000 +
            (y[1] - '0') * 100 +
            (y[2] - '0') * 10 +
            (y[3] - '0')
          );

          const char *t = time;
          if (t) {
            hour = static_cast<uint8_t>(
              (t[0] - '0') * 10 + (t[1] - '0')
            );
            minute = static_cast<uint8_t>(
              (t[3] - '0') * 10 + (t[4] - '0')
            );
            second = static_cast<uint8_t>(
              (t[6] - '0') * 10 + (t[7] - '0')
            );
          }

          return fromCivil(
            year,
            month,
            day,
            hour,
            minute,
            second
          );
        }
      }
    }

    return fromCivil(
      year,
      1,
      1,
      hour,
      minute,
      second
    );
  }

  Civil civil() const {
    int64_t z =
      static_cast<int64_t>(_unixtime) -
      946684800LL;

    int64_t days = z / 86400LL;
    int64_t rem = z % 86400LL;

    if (rem < 0) {
      rem += 86400LL;
      --days;
    }

    // Inverse of daysFromCivil(), using the proleptic Gregorian calendar.
    int64_t era =
      (days >= 0 ? days : days - 146096) / 146097;
    uint32_t doe =
      static_cast<uint32_t>(
        days - era * 146097
      );
    uint32_t yoe =
      static_cast<uint32_t>(
        (doe - doe / 1460 + doe / 36524 - doe / 146096) /
        365
      );
    uint16_t y =
      static_cast<uint16_t>(
        yoe + era * 400
      );
    uint32_t doy =
      doe - (
        365 * yoe +
        yoe / 4 -
        yoe / 100
      );
    uint32_t mp =
      (5 * doy + 2) / 153;
    uint8_t d =
      static_cast<uint8_t>(
        doy - (153 * mp + 2) / 5 + 1
      );
    uint8_t m =
      static_cast<uint8_t>(
        mp + (mp < 10 ? 3 : -9)
      );

    if (m <= 2) {
      ++y;
    }

    uint32_t secondsOfDay =
      static_cast<uint32_t>(
        rem
      );

    return {
      y,
      m,
      d,
      static_cast<uint8_t>(secondsOfDay / 3600),
      static_cast<uint8_t>((secondsOfDay / 60) % 60),
      static_cast<uint8_t>(secondsOfDay % 60),
    };
  }
};

class TimeSpan {
public:
  TimeSpan()
      : _seconds(0) {}

  explicit TimeSpan(int32_t seconds)
      : _seconds(seconds) {}

  TimeSpan(
      int32_t days,
      int32_t hours,
      int32_t minutes,
      int32_t seconds)
      : _seconds(
          days * 86400L +
          hours * 3600L +
          minutes * 60L +
          seconds) {}

  int32_t days() const { return _seconds / 86400L; }
  int32_t hours() const { return (_seconds % 86400L) / 3600L; }
  int32_t minutes() const { return (_seconds % 3600L) / 60L; }
  int32_t seconds() const { return _seconds % 60L; }
  int32_t totalseconds() const { return _seconds; }

private:
  int32_t _seconds;
  friend class DateTime;
};

inline DateTime DateTime::operator+(const TimeSpan &span) const {
  return DateTime(_unixtime + span._seconds);
}

inline DateTime DateTime::operator-(const TimeSpan &span) const {
  return DateTime(_unixtime - span._seconds);
}

enum Ds1307SqwPinMode {
  DS1307_OFF = 0x00,
  DS1307_ON = 0x80,
  DS1307_SquareWave1HZ = 0x10,
  DS1307_SquareWave4kHz = 0x11,
  DS1307_SquareWave8kHz = 0x12,
  DS1307_SquareWave32kHz = 0x13
};

class RTC_DS1307 {
public:
  bool begin(TwoWire *wireInstance = &Wire) {
    _wire = wireInstance;
    if (!_wire) {
      return false;
    }
    _wire->begin();
    _wire->beginTransmission(0x68);
    return _wire->endTransmission() == 0;
  }

  void adjust(const DateTime &dt) {
    if (!_wire) {
      return;
    }

    _wire->beginTransmission(0x68);
    _wire->write(0x00);
    _wire->write(bin2bcd(dt.second()));
    _wire->write(bin2bcd(dt.minute()));
    _wire->write(bin2bcd(dt.hour()));
    _wire->write(bin2bcd(dt.dayOfTheWeek() + 1));
    _wire->write(bin2bcd(dt.day()));
    _wire->write(bin2bcd(dt.month()));
    _wire->write(bin2bcd(dt.year() - 2000));
    _wire->endTransmission();
  }

  uint8_t isrunning(void) {
    uint8_t value = readRegister(0x00);
    return (value & 0x80) == 0;
  }

  DateTime now() {
    uint8_t data[7] = {0};
    readRegisters(0x00, data, 7);

    uint8_t second = bcd2bin(data[0] & 0x7f);
    uint8_t minute = bcd2bin(data[1] & 0x7f);
    uint8_t hour = bcd2bin(data[2] & 0x3f);
    uint8_t day = bcd2bin(data[4] & 0x3f);
    uint8_t month = bcd2bin(data[5] & 0x1f);
    uint16_t year = 2000 + bcd2bin(data[6]);

    return DateTime(
      year,
      month,
      day,
      hour,
      minute,
      second
    );
  }

  Ds1307SqwPinMode readSqwPinMode() {
    return static_cast<Ds1307SqwPinMode>(
      readRegister(0x07) & 0x93
    );
  }

  void writeSqwPinMode(
      Ds1307SqwPinMode mode) {
    if (!_wire) {
      return;
    }

    _wire->beginTransmission(0x68);
    _wire->write(0x07);
    _wire->write(static_cast<uint8_t>(mode));
    _wire->endTransmission();
  }

  uint8_t readnvram(uint8_t address) {
    if (address >= 56) {
      return 0;
    }
    return readRegister(
      static_cast<uint8_t>(0x08 + address)
    );
  }

  void readnvram(
      uint8_t *buf,
      uint8_t size,
      uint8_t address) {
    if (!buf || address >= 56) {
      return;
    }

    if (size > 56 - address) {
      size = 56 - address;
    }

    readRegisters(
      static_cast<uint8_t>(0x08 + address),
      buf,
      size
    );
  }

  void writenvram(
      uint8_t address,
      uint8_t data) {
    if (!_wire || address >= 56) {
      return;
    }

    _wire->beginTransmission(0x68);
    _wire->write(
      static_cast<uint8_t>(0x08 + address)
    );
    _wire->write(data);
    _wire->endTransmission();
  }

  void writenvram(
      uint8_t address,
      const uint8_t *buf,
      uint8_t size) {
    if (!_wire || !buf || address >= 56) {
      return;
    }

    if (size > 56 - address) {
      size = 56 - address;
    }

    _wire->beginTransmission(0x68);
    _wire->write(
      static_cast<uint8_t>(0x08 + address)
    );

    for (uint8_t i = 0; i < size; ++i) {
      _wire->write(buf[i]);
    }

    _wire->endTransmission();
  }

private:
  TwoWire *_wire = nullptr;

  static uint8_t bcd2bin(uint8_t value) {
    return value - 6 * (value >> 4);
  }

  static uint8_t bin2bcd(uint8_t value) {
    return value + 6 * (value / 10);
  }

  uint8_t readRegister(uint8_t address) {
    if (!_wire) {
      return 0;
    }

    _wire->beginTransmission(0x68);
    _wire->write(address);
    _wire->endTransmission(false);

    _wire->requestFrom(
      static_cast<uint8_t>(0x68),
      static_cast<uint8_t>(1)
    );

    return _wire->available()
      ? static_cast<uint8_t>(_wire->read())
      : 0;
  }

  void readRegisters(
      uint8_t address,
      uint8_t *buffer,
      uint8_t count) {
    if (!_wire || !buffer || count == 0) {
      return;
    }

    _wire->beginTransmission(0x68);
    _wire->write(address);
    _wire->endTransmission(false);

    _wire->requestFrom(
      static_cast<uint8_t>(0x68),
      count
    );

    for (uint8_t i = 0; i < count; ++i) {
      buffer[i] =
        _wire->available()
          ? static_cast<uint8_t>(_wire->read())
          : 0;
    }
  }
};

#endif
