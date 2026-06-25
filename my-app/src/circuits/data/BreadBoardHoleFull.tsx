export interface BreadboardHole {
  id: string;
  x: number;
  y: number;
  group: string;
}

export const generateBreadboardHoles = (): BreadboardHole[] => {
  const holes: BreadboardHole[] = [];

  const spacing = 9.8;

  // top row
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 60; col++) {
      holes.push({
        id: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 15 + col * spacing,
        y: 15 + row * spacing,
        group: `top-${col}`,
      });
    }
  }
  // left side A-E
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 60; col++) {
      holes.push({
        id: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 15 + col * spacing,
        y: 43 + row * spacing,
        group: `left-${row}`,
      });
    }
  }

  // right side F-J
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 60; col++) {
      holes.push({
        id: `${String.fromCharCode(70 + col)}${row + 1}`,
        x: 15 + col * spacing,
        y: 103 + row * spacing,
        group: `right-${row}`,
      });
    }
  }

  // bottom row
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 60; col++) {
      holes.push({
        id: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 15 + col * spacing,
        y: 162 + row * spacing,
        group: `bottom-${row}`,
      });
    }
  }
  return holes;
};