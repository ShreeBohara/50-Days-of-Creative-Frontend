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

/* Distance-based ripple: GSAP's grid stagger IS the distance math —
   one tween, staggered outward from the hovered/tapped cell. */
export function initWallRipple(grid, cells, cols = WALL_COLS, rows = WALL_ROWS) {
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim();
  const base = css.getPropertyValue("--ink-dim").trim();

  let lastIndex = -1;
  let lastFire = 0;

  function ripple(index) {
    const now = performance.now();
    if (index === lastIndex && now - lastFire < 400) return;
    if (now - lastFire < 80) return; // fast sweeps don't spam tweens
    lastIndex = index;
    lastFire = now;

    gsap.to(cells, {
      fontWeight: 850,
      fontStretch: "120%",
      color: accent,
      duration: 0.35,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      overwrite: "auto",
      stagger: { grid: [rows, cols], from: index, each: 0.05, ease: "power1.out" },
    });
  }

  const indexOf = (e) => {
    const cell = e.target.closest(".wall-cell");
    return cell ? cells.indexOf(cell) : -1;
  };

  grid.addEventListener("pointerover", (e) => {
    const i = indexOf(e);
    if (i >= 0) ripple(i);
  });
  grid.addEventListener("pointerdown", (e) => {
    const i = indexOf(e);
    if (i >= 0) ripple(i); // tap = same ripple on touch
  });

  /* A ripple overwritten mid-yoyo can leave cells stuck heavy —
     sweep everything back to base when the pointer leaves the wall. */
  grid.addEventListener("pointerleave", () => {
    lastIndex = -1;
    gsap.to(cells, {
      fontWeight: 300,
      fontStretch: "100%",
      color: base,
      duration: 0.5,
      delay: 0.75, // let a just-fired ripple play out first
      ease: "power2.out",
      overwrite: "auto",
    });
  });
}
