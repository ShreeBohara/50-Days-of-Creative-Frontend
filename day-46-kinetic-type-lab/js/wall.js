/* 05 · WALL — the word KINETIC repeated as a grid.
   This module builds the cells; the distance-based ripple
   is layered on in the stagger-wall stage. */

export const WALL_WORD = "KINETIC";
export const WALL_COLS = 5;
export const WALL_ROWS = 8;

export function buildWall(grid, cols = WALL_COLS, rows = WALL_ROWS) {
  grid.textContent = "";
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement("span");
    cell.className = "wall-cell";
    cell.textContent = WALL_WORD;
    cell.setAttribute("aria-hidden", "true");
    grid.appendChild(cell);
    cells.push(cell);
  }
  return cells;
}
