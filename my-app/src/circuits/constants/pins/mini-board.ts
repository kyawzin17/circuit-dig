export interface BreadboardHole {
  name: string;
  x: number;
  y: number;
  dir: string;
  signals: string[];
}

export const MINI_BOARD_PIN= () : BreadboardHole[] => {
    const holes: BreadboardHole[] = [];

    const spaces= 18;

    // header row
    for (let row = 0; row < 30; row++) {
        for (let col = 0; col < 2; col++) {
      holes.push({
        name: `${String.fromCharCode(65 + row)}${row + 1}`,
        x: 70 + row * spaces,
        y: 42 + col * spaces,
        dir: "bottom",
        signals: []
      });
    }
}
    // left side A-E
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 5; col++) {
      holes.push({
        name: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 70 + col * spaces,
        y: 60 + row * spaces,
        dir: `left-${row}`, 
        signals: []
      });
    }
  }

  // right side F-J
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 5; col++) {
      holes.push({
        name: `${String.fromCharCode(70 + col)}${row + 1}`,
        x: 190 + col * spaces,
        y: 60 + row * spaces,
        dir: `right-${row}`, 
        signals: []
      });
    }
  }

  // bottom row
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 2; col++) {
    holes.push({
      name: `${String.fromCharCode(65 + row)}${row + 1}`,
      x: 70 + row * spaces,
      y: 120 + col * spaces,
      dir: "bottom",
      signals: []
    });
  }
}

  return holes;
}

