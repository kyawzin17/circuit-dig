import { GND, VCC } from './pin';

export const NEOPixel_PIN = [
    { name: 'VDD', y: 3.5, x: 1, dir: "left", number: 1, signals: [VCC()] },
    { name: 'DOUT', y: 14, x: 1, dir: "left", number: 2, signals: [] },
    { name: 'VSS', y: 14, x: 21, dir: "right", number: 3, signals: [{ type: 'power', signal: 'GND' }] },
    { name: 'DIN', y: 3.5, x: 21, dir: "right", number: 4, signals: [GND()] },
  ];
