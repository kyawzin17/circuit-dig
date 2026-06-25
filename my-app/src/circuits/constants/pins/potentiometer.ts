
import { analog } from './pin';

export const POTENTIOMETER_PIN= [
    { name: 'GND', x: 29, y: 68.5, number: 1, dir: 'bottom', signals: [{ type: 'power', signal: 'GND' }] },
    { name: 'SIG', x: 39, y: 68.5, number: 2, dir: 'bottom', signals: [analog(0)] },
    { name: 'VCC', x: 49, y: 68.5, number: 3, dir: 'bottom', signals: [{ type: 'power', signal: 'VCC' }] },
  ]
