#ifndef RDE_KEYPAD_H
#define RDE_KEYPAD_H

#include <Arduino.h>

/*
 * Simulator-compatible matrix keypad driver.
 *
 * API-compatible with the commonly used Arduino Keypad examples:
 *   Keypad keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
 *   char key = keypad.getKey();
 *
 * The electrical matrix is NOT simulated here. The simulator resolves
 * the selected row/column contacts through the circuit graph, while
 * this library performs the same GPIO scan that runs on a real Uno.
 */

#ifndef NO_KEY
#define NO_KEY '\0'
#endif

#ifndef OPEN
#define OPEN LOW
#endif

#ifndef CLOSED
#define CLOSED HIGH
#endif

#ifndef makeKeymap
#define makeKeymap(x) ((char*)x)
#endif

typedef char KeypadEvent;
typedef unsigned int uint;
typedef unsigned long ulong;

enum KeyState {
  IDLE = 0,
  PRESSED,
  RELEASED,
  HOLD
};

class Keypad {
public:
  Keypad(
    char* userKeymap,
    byte* row,
    byte* col,
    byte numRows,
    byte numCols
  )
      : keymap_(userKeymap),
        rowPins_(row),
        columnPins_(col),
        rows_(numRows),
        cols_(numCols),
        debounceTime_(10),
        holdTime_(1000),
        stableKey_(NO_KEY),
        candidateKey_(NO_KEY),
        state_(IDLE),
        candidateSince_(0),
        holdSince_(0),
        stateChanged_(false),
        listener_(nullptr),
        initialized_(false) {
    begin(userKeymap);
  }

  void begin(char* userKeymap) {
    keymap_ = userKeymap;
    initialized_ = true;

    for (byte c = 0; c < cols_; ++c) {
      pinMode(columnPins_[c], OUTPUT);
      digitalWrite(columnPins_[c], HIGH);
    }

    for (byte r = 0; r < rows_; ++r) {
      pinMode(rowPins_[r], INPUT_PULLUP);
    }

    stableKey_ = NO_KEY;
    candidateKey_ = NO_KEY;
    state_ = IDLE;
    stateChanged_ = false;
    candidateSince_ = millis();
    holdSince_ = 0;
  }

  char getKey() {
    if (!initialized_) {
      begin(keymap_);
    }

    stateChanged_ = false;

    const char detected = scanCurrentKey();
    const unsigned long now = millis();

    if (detected != candidateKey_) {
      candidateKey_ = detected;
      candidateSince_ = now;
      return NO_KEY;
    }

    if ((unsigned long)(now - candidateSince_) < debounceTime_) {
      return NO_KEY;
    }

    if (candidateKey_ != stableKey_) {
      stableKey_ = candidateKey_;
      holdSince_ = now;
      state_ = stableKey_ == NO_KEY ? RELEASED : PRESSED;
      stateChanged_ = true;

      if (listener_) {
        listener_(stableKey_);
      }

      return state_ == PRESSED ? stableKey_ : NO_KEY;
    }

    if (stableKey_ != NO_KEY &&
        (unsigned long)(now - holdSince_) >= holdTime_) {
      if (state_ != HOLD) {
        state_ = HOLD;
        stateChanged_ = true;
        if (listener_) {
          listener_(stableKey_);
        }
      }
    }

    return NO_KEY;
  }

  bool getKeys() {
    const char before = stableKey_;
    const KeyState beforeState = state_;
    (void)getKey();
    return before != stableKey_ || beforeState != state_;
  }

  KeyState getState() {
    return state_;
  }

  bool isPressed(char keyChar) {
    return stableKey_ == keyChar;
  }

  void setDebounceTime(uint debounce) {
    debounceTime_ = debounce < 1 ? 1 : debounce;
  }

  void setHoldTime(uint hold) {
    holdTime_ = hold;
  }

  void addEventListener(void (*listener)(char)) {
    listener_ = listener;
  }

  char waitForKey() {
    for (;;) {
      const char key = getKey();
      if (key != NO_KEY) {
        return key;
      }
    }
  }

  bool keyStateChanged() {
    return stateChanged_;
  }

  byte numKeys() {
    return 1;
  }

private:
  char* keymap_;
  byte* rowPins_;
  byte* columnPins_;
  byte rows_;
  byte cols_;

  uint debounceTime_;
  uint holdTime_;

  char stableKey_;
  char candidateKey_;
  KeyState state_;

  unsigned long candidateSince_;
  unsigned long holdSince_;

  bool stateChanged_;
  void (*listener_)(char);
  bool initialized_;

  char scanCurrentKey() {
    char detected = NO_KEY;

    // A standard matrix scan drives one column LOW at a time while
    // the rows use internal pull-ups. A closed switch therefore makes
    // the corresponding row read LOW.
    for (byte c = 0; c < cols_; ++c) {
      for (byte other = 0; other < cols_; ++other) {
        pinMode(columnPins_[other], OUTPUT);
        digitalWrite(columnPins_[other], HIGH);
      }

      digitalWrite(columnPins_[c], LOW);

      for (byte r = 0; r < rows_; ++r) {
        if (digitalRead(rowPins_[r]) == LOW) {
          const char key = keymap_[r * cols_ + c];
          if (detected == NO_KEY) {
            detected = key;
          }
        }
      }

      digitalWrite(columnPins_[c], HIGH);
    }

    return detected;
  }
};

#endif
