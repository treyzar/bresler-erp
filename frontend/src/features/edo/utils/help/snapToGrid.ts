export const snapToGrid = (value: number, gridSize: number = 20): number =>
  Math.round(value / gridSize) * gridSize;
