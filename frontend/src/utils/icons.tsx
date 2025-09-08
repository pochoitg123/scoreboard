import type React from "react";

/** Respeta BASE_URL de Vite */
export function publicUrl(path: string) {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const b = base.endsWith("/") ? base : base + "/";
  return b + String(path).replace(/^\/+/, "");
}

/** Mapeo de íconos dentro de src/assets/icons (se resuelven en build) */
const ICONS_SRC: Record<string, string> = (() => {
  const files = import.meta.glob("../assets/icons/*.{webp,png,jpg,jpeg,svg}", {
    eager: true,
    as: "url",
  }) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const file = path.split("/").pop()!;
    out[file] = url;
  }
  return out;
})();

/** SVG fallback */
const FALLBACK_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect width="100%" height="100%" fill="#0b1220"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="10" font-family="monospace" fill="#a5b4fc">?</text>
    </svg>`
  );

/** Construye candidatos de URL para un conjunto de nombres base (sin extensión) */
function buildIconUrls(names: string[]): string[] {
  const out: string[] = [];
  const exts = ["webp", "png", "svg", "jpg", "jpeg"];

  for (const n of names) {
    for (const ext of exts) {
      out.push(publicUrl(`icons/${n}.${ext}`)); // /public/icons
      const fromSrc = ICONS_SRC[`${n}.${ext}`]; // src/assets/icons
      if (fromSrc) out.push(fromSrc);
    }
  }

  out.push(publicUrl("icons/_icon.webp"));
  out.push(FALLBACK_DATA_URL);
  return Array.from(new Set(out.filter(Boolean))); // dedupe
}

function onIconErrorSwitch(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  const urls = (el.dataset.urls || "").split("|").filter(Boolean);
  let i = Number(el.dataset.idx || "0");
  if (i < urls.length - 1) {
    i += 1;
    el.dataset.idx = String(i);
    el.src = urls[i];
  }
}

/** Inyecta CSS para animación de giro una sola vez */
let spinCSSInjected = false;
function ensureSpinCSS() {
  if (spinCSSInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "icon-spin-css";
  style.textContent = `
@keyframes iconSpin { to { transform: rotate(360deg); } }
.icon-spin { animation: iconSpin var(--spin-speed,1.2s) linear infinite; }
.icon-spin-hover:hover { animation: iconSpin var(--spin-speed,1.2s) linear infinite; }
`;
  document.head.appendChild(style);
  spinCSSInjected = true;
}

type IconProps = {
  names: string[];
  size?: number;
  title?: string;
  /** gira siempre */
  spin?: boolean;
  /** gira al hover */
  hoverSpin?: boolean;
  /** velocidad del giro en ms */
  speedMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function Icon({
  names,
  size = 16,
  title,
  spin,
  hoverSpin,
  speedMs,
  className,
  style,
}: IconProps) {
  if (spin || hoverSpin) ensureSpinCSS();

  const urls = buildIconUrls(names);
  const cls =
    [className, spin && "icon-spin", hoverSpin && "icon-spin-hover"]
      .filter(Boolean)
      .join(" ") || undefined;

  const mergedStyle: React.CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    ...(style || {}),
  };
  if (speedMs) (mergedStyle as any)["--spin-speed"] = `${speedMs}ms`;

  return (
    <img
      src={urls[0]}
      data-urls={urls.join("|")}
      data-idx="0"
      onError={onIconErrorSwitch}
      width={size}
      height={size}
      alt={title || names[0]}
      title={title || names[0]}
      className={cls}
      style={mergedStyle}
    />
  );
}

/* ===== Mapas de íconos ===== */
export function clearIconNames(ck?: number | null): string[] {
  switch (ck) {
    case 10: return ["clear_mfc", "mfc", "10"];
    case 9:  return ["clear_pfc", "pfc", "9"];
    case 8:  return ["clear_gfc", "gfc", "8"];
    case 7:  return ["clear_fc", "fc", "7"];
    case 6:
    case 5:
    case 4:  return ["clear_life4", "life4", String(ck ?? "")];
    case 3:  return ["clear_clear", "clear", "3"];
    case 2:  return ["clear_assist", "assist", "2"];
    case 1:  return ["clear_fail", "fail", "1"];
    default: return ["clear_default", "default", String(ck ?? "")];
  }
}

export function rankIconNames(rankIdx?: number | null): string[] {
  switch (rankIdx) {
    case 0:  return ["rank_aaa", "aaa", "0"];
    case 1:  return ["rank_aa_plus", "aa_plus", "1"];
    case 2:  return ["rank_aa", "aa", "2"];
    case 3:  return ["rank_aa_minus", "aa_minus", "3"];
    case 4:  return ["rank_a_plus", "a_plus", "4"];
    case 5:  return ["rank_a", "a", "5"];
    case 6:  return ["rank_a_minus", "a_minus", "6"];
    case 7:  return ["rank_b_plus", "b_plus", "7"];
    case 8:  return ["rank_b", "b", "8"];
    case 9:  return ["rank_b_minus", "b_minus", "9"];
    case 10: return ["rank_c_plus", "c_plus", "10"];
    case 11: return ["rank_c", "c", "11"];
    case 12: return ["rank_c_minus", "c_minus", "12"];
    case 13: return ["rank_d_plus", "d_plus", "13"];
    case 14: return ["rank_d", "d", "14"];
    case 15: return ["rank_e", "e", "15"];
    default: return ["rank_none", "none", String(rankIdx ?? "")];
  }
}

/* ===== Labels ===== */
const RANK_LABELS = ["AAA","AA+","AA","AA-","A+","A","A-","B+","B","B-","C+","C","C-","D+","D","E","-"] as const;
const CLEAR_LABELS = ["-","Fail","Assisted Clear","Clear","Life4 (1)","Life4 (2)","Life4","FC","GFC","PFC","MFC"] as const;

export function getRankLabel(n?: number | null) {
  if (n === null || n === undefined) return "-";
  return RANK_LABELS[n as number] ?? String(n);
}
export function getClearLabel(n?: number | null) {
  if (n === null || n === undefined) return "-";
  return CLEAR_LABELS[n as number] ?? String(n);
}
