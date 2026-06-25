const y= 130;
export const LCD1602_PIN= [
          { name: 'VSS', x: 32, y: y, dir: 'bottom', signals: [{ type: 'power', signal: 'GND' }] },
          { name: 'VDD', x: 41.5, y: y, dir: 'bottom', signals: [{ type: 'power', signal: 'VCC' }] },
          { name: 'V0', x: 51.5, y: y, dir: 'bottom', signals: [] },
          { name: 'RS', x: 60.5, y: y, dir: 'bottom', signals: [] },
          { name: 'RW', x: 70.5, y: y, dir: 'bottom', signals: [] },
          { name: 'E', x: 80, y: y, dir: 'bottom', signals: [] },
          { name: 'D0', x: 89.5, y: y, dir: 'bottom', signals: [] },
          { name: 'D1', x: 99.5, y: y, dir: 'bottom', signals: [] },
          { name: 'D2', x: 109, y: y, dir: 'bottom', signals: [] },
          { name: 'D3', x: 118.5, y: y, dir: 'bottom',  signals: [] },
          { name: 'D4', x: 128, y: y, dir: 'bottom',  signals: [] },
          { name: 'D5', x: 137.5, y: y, dir: 'bottom',  signals: [] },
          { name: 'D6', x: 147, y: y, dir: 'bottom',  signals: [] },
          { name: 'D7', x: 156.5, y: y, dir: 'bottom',  signals: [] },
          { name: 'A', x: 166.5, y: y, dir: 'bottom',  signals: [] },
          { name: 'K', x: 176, y: y, dir: 'bottom',  signals: [] },
        ]