export interface BreadboardHole {
  id: string;
  x: number;
  y: number;
  group: string;
}

export const generateBreadboardHoles = (): BreadboardHole[] => {
  const holes: BreadboardHole[] = [];

  const spacing = 9.1;

  // top row
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 15; col++) {
      holes.push({
        id: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 14 + col * spacing,
        y: 14 + row * spacing,
        group: `top-${row}`,
      });
    }
  }
  // left side A-E
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 15; col++) {
      holes.push({
        id: `${String.fromCharCode(65 + col)}${row + 1}`,
        x: 14 + col * spacing,
        y: 42 + row * spacing,
        group: `left-${row}`,
      });
    }
  }

  // right side F-J
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 15; col++) {
      holes.push({
        id: `${String.fromCharCode(70 + col)}${row + 1}`,
        x: 14 + col * spacing,
        y: 97 + row * spacing,
        group: `right-${row}`,
      });
    }
  }

  // bottom row
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 15; col++) {
      holes.push({
        id: `${String.fromCharCode(70 + col)}${row + 1}`,
        x: 14 + col * spacing,
        y: 152 + row * spacing,
        group: `bottom-${row}`,
      });
    }
  }
  return holes;
};