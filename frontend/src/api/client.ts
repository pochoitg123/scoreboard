import axios from "axios";

// ===== Tipos =====
export type ScoreRow = {
  date: any;
  playedAt: any;
  chartType: string;
  level: number;
  songTitle: any;
  title: any;
  songId: number;
  mode: "S" | "D";
  difficulty: number;
  score: number;
  exScore?: number;
  rank?: number | null;
  clearKind?: number | null;
  dancerName?: string;
  source?: string;
  songMeta?: {
    title?: string;
    name?: string;
    basename?: string;
    baseName?: string;
    diffLv?: number[];
    series?: number;
  };
};

export type DancerSummaryRow = {
  dancerName: string;
  total: number;
  AAA: number;
  FC: number;
  GFC: number;
  PFC: number;
  MFC: number;
};

export type SongRankingItem = {
  mode: "S" | "D";
  dancerName: string;
  score: number;
  rank?: number | null;
  clearKind?: number | null;
  difficulty?: number | null;
};

export type SongRankingResponse = {
  songId: number | string;
  songMeta?: {
    title?: string;
    basename?: string;
    series?: number;
    bpm?: number | null;
    diffLv?: number[] | null;
  };
  single: SongRankingItem[];
  double: SongRankingItem[];
};

// ===== API base =====
export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true,
  timeout: 8000,
});

// ===== Endpoints =====

// Scores list
export async function fetchScores(
  opts: { limit?: number; dancer?: string; source?: "score3" | "hiscore3" } = {}
): Promise<ScoreRow[]> {
  const { limit = 50, dancer, source = "score3" } = opts;
  const { data } = await API.get("/scores", {
    params: { limit, dancer, source },
  });
  return Array.isArray(data) ? data : [];
}

// Song Ranking
export async function fetchSongRanking(
  songId: number | string,
  opts: { source?: "score3" | "hiscore3"; limit?: number } = {}
): Promise<SongRankingResponse> {
  const { source = "score3", limit = 5 } = opts;
  const { data } = await API.get("/scores/ranking", {
    params: { songId, source, limit },
  });
  return {
    songId: data?.songId,
    songMeta: data?.songMeta || {},
    single: Array.isArray(data?.single) ? data.single : [],
    double: Array.isArray(data?.double) ? data.double : [],
  };
}

// Dancers Summary
export async function fetchDancersSummary(): Promise<DancerSummaryRow[]> {
  const { data } = await API.get("/stats/dancers");
  return Array.isArray(data?.rows) ? data.rows : [];
}

export type GlobalJudgmentTotals = {
  songs: number; marvelous: number; perfect: number; great: number;
  good: number; bad: number; miss: number; total_notes: number; other: number;
};
export type PlayerJudgmentTotals = GlobalJudgmentTotals & {
  refid: string;
  name?: string | null;   // 👈 nuevo
};
export type JudgmentStatsResponse = { global_: GlobalJudgmentTotals; players: PlayerJudgmentTotals[] };
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Reemplaza esta función por esta versión:
export async function fetchJudgmentStats(refid?: string): Promise<JudgmentStatsResponse> {
  // fallback: si estamos en dev (5173) y no hay VITE_API_BASE, usa 8000
  const base =
    API_BASE ||
    (window.location.port === "5173" ? "http://localhost:8000" : "");

  const url = new URL("/api/stats/judgments", base || window.location.origin);
  if (refid) url.searchParams.set("refid", refid);

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}
