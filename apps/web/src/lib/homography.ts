export interface Pt {
  x: number;
  y: number;
}

/** Padel court used as the ground plane. Heights are regulation references, not measured in the frame. */
export const PADEL_COURT = {
  widthM: 10,
  lengthM: 20,
  netCenterM: 0.88,
  netPostM: 0.92,
};

export const COURT_CORNERS: Pt[] = [
  { x: 0, y: 0 },
  { x: PADEL_COURT.widthM, y: 0 },
  { x: PADEL_COURT.widthM, y: PADEL_COURT.lengthM },
  { x: 0, y: PADEL_COURT.lengthM },
];

function solve8(matrix: number[][], values: number[]): number[] | null {
  const n = 8;
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    if (Math.abs(rows[pivot][col]) < 1e-10) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    for (let cell = col; cell <= n; cell += 1) rows[col][cell] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let cell = col; cell <= n; cell += 1) rows[row][cell] -= factor * rows[col][cell];
    }
  }
  return rows.map((row) => row[n]);
}

/** Maps four image points (0–1) onto the padel court in meters. Returns null if the points are degenerate. */
export function courtHomography(imageCorners: Pt[]): number[] | null {
  if (imageCorners.length !== 4) return null;
  const matrix: number[][] = [];
  const values: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = imageCorners[i];
    const { x: X, y: Y } = COURT_CORNERS[i];
    matrix.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    values.push(X);
    matrix.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    values.push(Y);
  }
  const solved = solve8(matrix, values);
  return solved ? [...solved, 1] : null;
}

export function applyHomography(h: number[], point: Pt): Pt | null {
  const w = h[6] * point.x + h[7] * point.y + h[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-8) return null;
  return {
    x: (h[0] * point.x + h[1] * point.y + h[2]) / w,
    y: (h[3] * point.x + h[4] * point.y + h[5]) / w,
  };
}
