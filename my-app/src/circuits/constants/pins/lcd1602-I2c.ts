import { i2c } from './pin';

export const LCD1602_I2C_PIN= [
          { name: 'GND', x: 4, y: 32, dir: "left", number: 1, signals: [{ type: 'power', signal: 'GND' }] },
          { name: 'VCC', x: 4, y: 41.5, dir: "left", number: 2, signals: [{ type: 'power', signal: 'VCC' }] },
          { name: 'SDA', x: 4, y: 51, dir: "left", number: 3, signals: [i2c('SDA')] },
          { name: 'SCL', x: 4, y: 60.5, dir: "left", number: 4, signals: [i2c('SCL')] },
        ]