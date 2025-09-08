// src/types/index.ts

export type SongMeta = {
  name?: string;
  artist?: string;
  series?: number | string | null; // num o string
  bpm?: number | null;
  imageUrl?: string | null;       // URL absoluta o raíz (/algo.png)
  imageBasename?: string | null;  // nombre de archivo dentro de /songs (ej: "puru" o "puru.png")
  image?: string | null;          // sinónimo aceptado por backend
  cover?: string | null;          // sinónimo aceptado por backend
  // levelInfo puede venir como arreglo (diffLv) o un objeto.
  levelInfo?: number[] | Record<string, any> | null;
};

export type ScoreRow = {
  rank: number;
  source: "score3" | "hiscore3";
  songId: number | string;
  style?: number | null;
  mode?: string | null;          // "S" | "D" | otros
  difficulty?: number | null;    // 0..4 (beginner..challenge)
  dancerName?: string | null;
  score?: number | null;
  clearKind?: number | null;
  exScore?: number | null;
  maxCombo?: number | null;
  createdAt?: string | null;     // ISO
  updatedAt?: string | null;
  grade?: "PFC" | "MFC" | null;
  songMeta?: SongMeta;
};

// ----------------- Series (DDR) -----------------
export const DDR_SERIES_MAP: Record<number, string> = {
  1: "1st mix",
  2: "2nd mix",
  3: "3rd mix",
  4: "4th mix",
  5: "5th mix",
  6: "Max",
  7: "Max 2",
  8: "Extreme",
  9: "SuperNova",
  10: "SuperNova 2",
  11: "X",
  12: "x2",
  13: "X3 vs 2nd",
  14: "2013",
  15: "2014",
  16: "2014",
  17: "Ace",
  18: "A20",
  19: "A20plus",
  20: "A3",
  21: "World",
};

export function seriesName(series?: number | string | null): string {
  if (series === null || series === undefined || series === "") return "";
  const n = typeof series === "string" ? parseInt(series, 10) : series;
  if (Number.isFinite(n as number)) {
    return DDR_SERIES_MAP[n as number] || String(series);
  }
  return String(series);
}

// ----------------- Dificultad -----------------
export function difficultyLabel(num?: number | null): string {
  if (num === null || num === undefined) return "-";
  switch (num) {
    case 0: return "beginner";
    case 1: return "basic";
    case 2: return "difficult";
    case 3: return "expert";
    case 4: return "challenge";
    default: return String(num);
  }
}

/**
 * Beginner sin letra (SP/DP). Resto con abreviaturas: BSP/BDP, DSP/DDP, ESP/EDP, CSP/CDP
 */
export function difficultyBadge(mode?: string | null, diff?: number | null) {
  const dlabel = difficultyLabel(diff);
  const m = (mode || "").toUpperCase();

  if (m === "S") {
    if (dlabel === "beginner")  return { abbr: "SP",  long: "beginner singleplayer" };
    if (dlabel === "basic")     return { abbr: "BSP", long: "basic singleplayer" };
    if (dlabel === "difficult") return { abbr: "DSP", long: "difficult singleplayer" };
    if (dlabel === "expert")    return { abbr: "ESP", long: "expert singleplayer" };
    if (dlabel === "challenge") return { abbr: "CSP", long: "challenge singleplayer" };
  }
  if (m === "D") {
    if (dlabel === "beginner")  return { abbr: "DP",  long: "beginner doubleplayer" };
    if (dlabel === "basic")     return { abbr: "BDP", long: "basic doubleplayer" };
    if (dlabel === "difficult") return { abbr: "DDP", long: "difficult doubleplayer" };
    if (dlabel === "expert")    return { abbr: "EDP", long: "expert doubleplayer" };
    if (dlabel === "challenge") return { abbr: "CDP", long: "challenge doubleplayer" };
  }

  // Si no calza, no mostramos descripción larga
  return { abbr: `${m || "-"}/${dlabel}`, long: "" };
}

/**
 * Índice dentro de diffLv según mode + difficulty:
 * 0..4 -> Single [Beginner, Basic, Difficult, Expert, Challenge]
 * 5..9 -> Double [Beginner, Basic, Difficult, Expert, Challenge]
 */
export function diffLvIndexFor(mode?: string | null, diff?: number | null): number | null {
  if (mode == null || diff == null) return null;
  const m = (mode || "").toUpperCase();
  if (!Number.isInteger(diff) || diff < 0 || diff > 4) return null;
  if (m === "S") return diff;         // 0..4
  if (m === "D") return 5 + diff;     // 5..9
  return null;
}

/**
 * Extrae el arreglo diffLv (tamaño 10) desde songMeta.levelInfo.
 * Rellena con ceros si faltan posiciones.
 */
export function extractDiffLv(meta?: SongMeta): number[] | null {
  if (!meta) return null;
  const li = meta.levelInfo as any;
  let arr: number[] | null = null;
  if (Array.isArray(li)) {
    arr = li.slice();
  } else if (li && Array.isArray(li.diffLv)) {
    arr = li.diffLv.slice();
  } else {
    arr = null;
  }
  if (!arr) return null;
  // normaliza a largo 10
  const out = new Array(10).fill(0);
  for (let i = 0; i < Math.min(10, arr.length); i++) out[i] = Number(arr[i] || 0);
  return out;
}
