import { GRID_SIZE } from "../constants/editor.constants";

export const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};
