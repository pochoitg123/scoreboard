import { useEffect, useRef, useState } from "react";
import type React from "react";
import { getMe, getMyProfile, updateMyProfile, Me } from "../api/auth";
import { getMyCustomize, updateMyCustomize } from "../api/customize";
import customize from "../data/customize.json";

/* ===== Rutas de assets =====
   public/assets/customize/
   ├─ appeal/{id}.png
   ├─ gamebg/{id}.mp4
   ├─ characterp1/{id}_left.png
   ├─ characterp2/{id}_right.png
   ├─ lanebg/single/{id}.png
   ├─ lanecover/single/{id}.png
   ├─ lanebg/double/{id}.png
   ├─ lanecover/double/{id}.png
   └─ placeholder.png
*/
const ASSET_BASE = {
  appeal: "/assets/customize/appeal",
  gamebg: "/assets/customize/gamebg",
  characterP1: "/assets/customize/characterp1",
  characterP2: "/assets/customize/characterp2",
  laneBgSingle: "/assets/customize/lanebg/single",
  laneCoverSingle: "/assets/customize/lanecover/single",
  laneBgDouble: "/assets/customize/lanebg/double",
  laneCoverDouble: "/assets/customize/lanecover/double",
  placeholder: "/assets/customize/placeholder.png",
};

const appealImage = (id: number) => `${ASSET_BASE.appeal}/${id || 1}.png`;
const gameBgVideo = (id: number) => `${ASSET_BASE.gamebg}/${id || 1}.mp4`;
const characterImageP1 = (id: number) => `${ASSET_BASE.characterP1}/${id || 1}_left.png`;
const characterImageP2 = (id: number) => `${ASSET_BASE.characterP2}/${id || 1}_right.png`;

const laneBgSingleImage    = (id: number) => `${ASSET_BASE.laneBgSingle}/${id || 1}.png`;
const laneCoverSingleImage = (id: number) => `${ASSET_BASE.laneCoverSingle}/${id || 1}.png`;
const laneBgDoubleImage    = (id: number) => `${ASSET_BASE.laneBgDouble}/${id || 1}.png`;
const laneCoverDoubleImage = (id: number) => `${ASSET_BASE.laneCoverDouble}/${id || 1}.png`;

// Opciones simples
const ARROW_SKINS = ["Normal", "X", "Classic", "Cyber", "Medium", "Small", "Dot"];
const GUIDELINES = ["Off", "Border", "Center"];
const FILTERS = ["Off", "Dark", "Darker", "Darkest"];
const JUDGMENT_PRIORITY = ["Judgment priority", "Arrow priority"];
const ON_OFF = ["Off", "On"];

// Filtros
const FILTER_TO_VALUE = [0, 30, 50, 70];
const VALUE_TO_FILTER_INDEX = (val?: number | null) => {
  const arr = FILTER_TO_VALUE;
  const v = typeof val === "number" ? val : 0;
  let best = 0, diff = Infinity;
  arr.forEach((x, i) => {
    const d = Math.abs(x - v);
    if (d < diff) { diff = d; best = i; }
  });
  return best;
};

type TabKey = "profile" | "custom";

export default function Profile({ onGoScores }: { onGoScores: (d: string) => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // snapshots originales
  const [originalCore, setOriginalCore] = useState<any | null>(null);
  const [originalCustom, setOriginalCustom] = useState<any | null>(null);

  // feedback
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "error" } | null>(null);

  // core
  const [dancerName, setDancerName] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [isDispWeight, setIsDispWeight] = useState<number>(0);
  const [subscribed, setSubscribed] = useState<number>(0);

  const [arrowSkin, setArrowSkin] = useState<number>(0);
  const [guideline, setGuideline] = useState<number>(0);
  const [filterIdx, setFilterIdx] = useState<number>(0);
  const [judgePriority, setJudgePriority] = useState<number>(0);
  const [displayTiming, setDisplayTiming] = useState<number>(0);

  // customize
  const [characterP1, setCharacterP1] = useState<number>(0);
  const [characterP2, setCharacterP2] = useState<number>(0);
  const [appealBoard, setAppealBoard] = useState<number>(0);
  const [laneBgSingle, setLaneBgSingle] = useState<number>(0);
  const [laneBgDouble, setLaneBgDouble] = useState<number>(0);
  const [laneCoverSingle, setLaneCoverSingle] = useState<number>(0);
  const [laneCoverDouble, setLaneCoverDouble] = useState<number>(0);
  const [gameBGSystem, setGameBGSystem] = useState<number>(0);
  const [gameBGPlay, setGameBGPlay] = useState<number>(0);
  const [songVid, setSongVid] = useState<number>(0);

  // ===== Estado + refs para la "cortina" (cover SINGLE deslizante) =====
  // top de la cortina en % relativo al alto del slot; altura fija = 50% del alto
  const [curtainTop, setCurtainTop] = useState<number>(50);
  const [draggingCurtain, setDraggingCurtain] = useState<boolean>(false);
  const singleSlotRef = useRef<HTMLDivElement | null>(null);

  // ===== Estado + refs para la "cortina" (cover DOUBLE deslizante) =====
  const [curtainTopD, setCurtainTopD] = useState<number>(50);
  const [draggingCurtainD, setDraggingCurtainD] = useState<boolean>(false);
  const doubleSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const m = await getMe();
        if (!alive) return;
        setMe(m);

        // CORE
        const prof = await getMyProfile();
        if (!alive) return;
        setOriginalCore(prof);

        setDancerName(prof?.dancerName || "");
        setWeight(
          typeof prof?.weight === "number" ? String(prof.weight) :
          typeof prof?.weight === "string" ? prof.weight : ""
        );
        setIsDispWeight(prof?.isDispWeight ? 1 : 0);
        setSubscribed(prof?.subscribed ? 1 : 0);

        setArrowSkin(typeof prof?.opArrowDesign === "number" ? prof.opArrowDesign : 0);
        setGuideline(typeof prof?.opGuideline === "number" ? prof.opGuideline : 0);
        setFilterIdx(VALUE_TO_FILTER_INDEX(prof?.opLaneFilter));
        setJudgePriority(typeof prof?.opJudgePriority === "number" ? prof.opJudgePriority : 0);
        setDisplayTiming(typeof prof?.opTimingDisp === "number" ? prof.opTimingDisp : 0);

        // CUSTOM
        const custom = await getMyCustomize();
        if (!alive) return;
        setOriginalCustom(custom || {});
        setCharacterP1(typeof custom?.characterP1Id === "number" ? custom.characterP1Id : 0);
        setCharacterP2(typeof custom?.characterP2Id === "number" ? custom.characterP2Id : 0);
        setAppealBoard(typeof custom?.appealBoardId === "number" ? custom.appealBoardId : 0);
        setLaneBgSingle(typeof custom?.laneBgSingleId === "number" ? custom.laneBgSingleId : 0);
        setLaneBgDouble(typeof custom?.laneBgDoubleId === "number" ? custom.laneBgDoubleId : 0);
        setLaneCoverSingle(typeof custom?.laneCoverSingleId === "number" ? custom.laneCoverSingleId : 0);
        setLaneCoverDouble(typeof custom?.laneCoverDoubleId === "number" ? custom.laneCoverDoubleId : 0);
        setGameBGSystem(typeof custom?.gameBGSystemId === "number" ? custom.gameBGSystemId : 0);
        setGameBGPlay(typeof custom?.gameBGPlayId === "number" ? custom.gameBGPlayId : 0);
        setSongVid(typeof custom?.songVidId === "number" ? custom.songVidId : 0);

      } catch (e: any) {
        setErr(e?.response?.data?.detail || e?.message || "Error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const linkedName = me?.linked?.dancerName || "";

  function maybeFrom(base: any, patch: any, key: string, newVal: any) {
    if (!base) return;
    const oldVal = (base as any)[key];
    if (oldVal !== newVal) patch[key] = newVal;
  }

  async function saveCore() {
    const patch: any = {};
    if (!originalCore) return;

    maybeFrom(originalCore, patch, "dancerName", dancerName);
    if (weight !== "") {
      const w = Number(weight);
      if (!Number.isNaN(w)) maybeFrom(originalCore, patch, "weight", w);
    }
    maybeFrom(originalCore, patch, "isDispWeight", isDispWeight === 1);
    maybeFrom(originalCore, patch, "subscribed", subscribed === 1);
    maybeFrom(originalCore, patch, "opArrowDesign", arrowSkin);
    maybeFrom(originalCore, patch, "opGuideline", guideline);
    maybeFrom(originalCore, patch, "opLaneFilter", FILTER_TO_VALUE[filterIdx] ?? 0);
    maybeFrom(originalCore, patch, "opJudgePriority", judgePriority);
    maybeFrom(originalCore, patch, "opTimingDisp", displayTiming);

    if (Object.keys(patch).length === 0) {
      setMsg({ text: "No hay cambios en Perfil", type: "ok" });
      setTimeout(() => setMsg(null), 1400);
      return;
    }
    try {
      await updateMyProfile(patch);
      setOriginalCore({ ...(originalCore || {}), ...patch });
      setMsg({ text: "✔ Perfil actualizado", type: "ok" });
      setTimeout(() => setMsg(null), 1600);
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.detail || "No se pudo actualizar Perfil", type: "error" });
      setTimeout(() => setMsg(null), 2400);
    }
  }

  async function saveCustom() {
    const patch: any = {};
    if (!originalCustom) return;

    maybeFrom(originalCustom, patch, "characterP1Id", characterP1);
    maybeFrom(originalCustom, patch, "characterP2Id", characterP2);
    maybeFrom(originalCustom, patch, "appealBoardId", appealBoard);
    maybeFrom(originalCustom, patch, "laneBgSingleId", laneBgSingle);
    maybeFrom(originalCustom, patch, "laneBgDoubleId", laneBgDouble);
    maybeFrom(originalCustom, patch, "laneCoverSingleId", laneCoverSingle);
    maybeFrom(originalCustom, patch, "laneCoverDoubleId", laneCoverDouble);
    maybeFrom(originalCustom, patch, "gameBGSystemId", gameBGSystem);
    maybeFrom(originalCustom, patch, "gameBGPlayId", gameBGPlay);
    maybeFrom(originalCustom, patch, "songVidId", songVid);

    if (Object.keys(patch).length === 0) {
      setMsg({ text: "No hay cambios en Customize", type: "ok" });
      setTimeout(() => setMsg(null), 1400);
      return;
    }
    try {
      await updateMyCustomize(patch);
      setOriginalCustom({ ...(originalCustom || {}), ...patch });
      setMsg({ text: "✔ Customize actualizado", type: "ok" });
      setTimeout(() => setMsg(null), 1600);
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.detail || "No se pudo actualizar Customize", type: "error" });
      setTimeout(() => setMsg(null), 2400);
    }
  }

  // ==== Drag handlers (cortinas) ====
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  function updateCurtainFromClientY(clientY: number) {
    const el = singleSlotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let pct = ((clientY - rect.top) / rect.height) * 100; // 0..100
    pct = clamp(pct, 0, 50); // cortina de 50% alto => top 0..50
    setCurtainTop(pct);
  }

  function updateCurtainDFromClientY(clientY: number) {
    const el = doubleSlotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let pct = ((clientY - rect.top) / rect.height) * 100; // 0..100
    pct = clamp(pct, 0, 50); // misma lógica que Single
    setCurtainTopD(pct);
  }

  useEffect(() => {
    if (!draggingCurtain) return;
    const onMove = (e: MouseEvent) => updateCurtainFromClientY(e.clientY);
    const onUp = () => setDraggingCurtain(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingCurtain]);

  useEffect(() => {
    if (!draggingCurtainD) return;
    const onMove = (e: MouseEvent) => updateCurtainDFromClientY(e.clientY);
    const onUp = () => setDraggingCurtainD(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingCurtainD]);

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    if (draggingCurtain)  updateCurtainFromClientY(t.clientY);
    if (draggingCurtainD) updateCurtainDFromClientY(t.clientY);
  }

  if (loading) return <p className="profile-loading">Cargando…</p>;
  if (err) return <p className="profile-error">{err}</p>;
  if (!me) return null;

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const absPlaceholder = window.location.origin + ASSET_BASE.placeholder;
    if (img.src !== absPlaceholder) img.src = ASSET_BASE.placeholder;
  };
  const onVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.style.display = "none";
  };

  const systemBgId = gameBGSystem || gameBGPlay;

  return (
    <div className="profile-page">
      <h2 className="profile-title">Mi cuenta</h2>

      <div className="profile-user">
        <strong>Usuario:</strong> {me.username}
      </div>

      <div className="profile-linked">
        <strong>Jugador vinculado:</strong>{" "}
        {me?.linked?.dancerName ? (
          <>
            {me.linked.dancerName}{" "}
            <button className="btn" onClick={() => onGoScores(me.linked!.dancerName!)}>
              Ver Score Dashboard
            </button>
          </>
        ) : (
          <em>ninguno</em>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Perfil
        </button>
        <button
          className={`tab ${activeTab === "custom" ? "active" : ""}`}
          onClick={() => setActiveTab("custom")}
        >
          Customize
        </button>
      </div>

      {/* Panel Perfil */}
      {activeTab === "profile" && (
        <section className="card">
          <h3 className="card-title">Profile Settings</h3>

          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">Dancer Name</span>
              <input
                className="input"
                value={dancerName}
                onChange={e => setDancerName(e.target.value)}
                placeholder={me?.linked?.dancerName || "ANGI"}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Weight (kg)</span>
              <input
                className="input"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 70.5"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Workout Display Calories</span>
              <select className="select" value={isDispWeight} onChange={e => setIsDispWeight(Number(e.target.value))}>
                {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Platinum Pass</span>
              <select className="select" value={subscribed} onChange={e => setSubscribed(Number(e.target.value))}>
                {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Arrow Skin</span>
              <select className="select" value={arrowSkin} onChange={e => setArrowSkin(Number(e.target.value))}>
                {ARROW_SKINS.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Guideline</span>
              <select className="select" value={guideline} onChange={e => setGuideline(Number(e.target.value))}>
                {GUIDELINES.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Filter concentration</span>
              <select className="select" value={filterIdx} onChange={e => setFilterIdx(Number(e.target.value))}>
                {FILTERS.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
              <small className="hint">
                Se guarda como <code>opLaneFilter</code> = {FILTER_TO_VALUE[filterIdx]}.
              </small>
            </label>

            <label className="form-field">
              <span className="form-label">Judgment display priority</span>
              <select className="select" value={judgePriority} onChange={e => setJudgePriority(Number(e.target.value))}>
                {JUDGMENT_PRIORITY.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Display Timing judgment</span>
              <select className="select" value={displayTiming} onChange={e => setDisplayTiming(Number(e.target.value))}>
                {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
              </select>
            </label>
          </div>

          <div className="actions">
            <button className="btn primary" onClick={saveCore}>Guardar Perfil</button>
            {msg && <span className={`msg ${msg.type}`}>{msg.text}</span>}
          </div>
        </section>
      )}

      {/* Panel Customize */}
      {activeTab === "custom" && (
        <section className="card">
          <h3 className="card-title">Customize</h3>

          {/* ===== General (Appeal) ===== */}
          <div className="subsection">
            <div className="subsection-header">
              <div className="bar" />
              <h4>General</h4>
            </div>

            <div className="custom-row">
              <div className="custom-form">
                <label className="form-field">
                  <span className="form-label">Appeal Board</span>
                  <select className="select" value={appealBoard} onChange={e => setAppealBoard(Number(e.target.value))}>
                    {customize.appealBoard.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="preview-appeal preview-card">
                <img
                  className="preview-img"
                  src={appealImage(appealBoard)}
                  alt="Appeal preview"
                  onError={onImgError}
                />
              </div>
            </div>
          </div>

          {/* ===== System (video chico + P1/P2) ===== */}
          <div className="subsection">
            <div className="subsection-header">
              <div className="bar" />
              <h4>System</h4>
            </div>

            <div className="custom-row">
              <div className="custom-form">
                <label className="form-field">
                  <span className="form-label">Background</span>
                  <select className="select" value={gameBGSystem} onChange={e => setGameBGSystem(Number(e.target.value))}>
                    {customize.gameBG.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Character (Left / P1)</span>
                  <select className="select" value={characterP1} onChange={e => setCharacterP1(Number(e.target.value))}>
                    {customize.character.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Character (Right / P2)</span>
                  <select className="select" value={characterP2} onChange={e => setCharacterP2(Number(e.target.value))}>
                    {customize.character.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="preview-system preview-card">
                <div className="stage">
                  <video
                    key={gameBGSystem || gameBGPlay}
                    className="stage-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={onVideoError}
                  >
                    <source src={gameBgVideo(gameBGSystem || gameBGPlay)} type="video/mp4" />
                  </video>

                  <img className="char char-p1" src={characterImageP1(characterP1)} alt="Character P1" onError={onImgError} />
                  <img className="char char-p2" src={characterImageP2(characterP2)} alt="Character P2" onError={onImgError} />
                </div>
              </div>
            </div>
          </div>

          {/* ===== Game Play (controles globales) ===== */}
          <div className="subsection">
            <div className="subsection-header">
              <div className="bar" />
              <h4>Game Play</h4>
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Background (During Play)</span>
                <select className="select" value={gameBGPlay} onChange={e => setGameBGPlay(Number(e.target.value))}>
                  {customize.gameBG.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Song Movie Display</span>
                <select className="select" value={songVid} onChange={e => setSongVid(Number(e.target.value))}>
                  {customize.songVid.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* ===== Lane (Single) — lado izq + margen 10% + COVER tipo cortina ===== */}
          <div className="subsection" onTouchMove={onTouchMove}>
            <div className="subsection-header">
              <div className="bar" />
              <h4>Lane (Single)</h4>
            </div>

            <div className="custom-row">
              <div className="custom-form">
                <label className="form-field">
                  <span className="form-label">Lane Background (Single)</span>
                  <select className="select" value={laneBgSingle} onChange={e => setLaneBgSingle(Number(e.target.value))}>
                    {customize.laneBgSingle.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Lane Cover (Single)</span>
                  <select className="select" value={laneCoverSingle} onChange={e => setLaneCoverSingle(Number(e.target.value))}>
                    {customize.laneCoverSingle.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <div className="hint">
                  Cortina: arrastra la línea para mover el cover (top: {Math.round(curtainTop)}%)
                </div>
              </div>

              <div className="preview-lane preview-card">
                <div className="stage-lane">
                  {/* Base: Background (During Play) */}
                  <video
                    key={`play-${gameBGPlay}`}
                    className="lane-video base"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={onVideoError}
                  >
                    <source src={gameBgVideo(gameBGPlay)} type="video/mp4" />
                  </video>

                  {/* Slot IZQUIERDO con margen 10% */}
                  <div className="lane-slot left" ref={singleSlotRef}>
                    {/* BG ocupa todo el slot */}
                    <img
                      key={`sbg-${laneBgSingle}`}
                      className="lane-image in-slot bg"
                      src={laneBgSingleImage(laneBgSingle)}
                      alt="Lane BG Single"
                      onError={onImgError}
                    />

                    {/* COVER como CORTINA (altura fija 50%, se mueve verticalmente con 'top') */}
                    <div
                      className="cover-curtain"
                      style={{ top: `${curtainTop}%` }}
                      onMouseDown={(e) => { setDraggingCurtain(true); updateCurtainFromClientY(e.clientY); }}
                      onTouchStart={(e) => { setDraggingCurtain(true); const t = e.touches[0]; if (t) updateCurtainFromClientY(t.clientY); }}
                      onTouchEnd={() => setDraggingCurtain(false)}
                    >
                      <img
                        key={`scv-${laneCoverSingle}`}
                        className="lane-image cover in-curtain"
                        src={laneCoverSingleImage(laneCoverSingle)}
                        alt="Lane Cover Single"
                        onError={onImgError}
                      />
                      {/* línea/handler de la cortina */}
                      <div className="curtain-handle">
                        <div className="curtain-handle-line" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Lane (Double) — slot central con margen HORIZONTAL + CORTINA ===== */}
          <div className="subsection" onTouchMove={onTouchMove}>
            <div className="subsection-header">
              <div className="bar" />
              <h4>Lane (Double)</h4>
            </div>

            <div className="custom-row">
              <div className="custom-form">
                <label className="form-field">
                  <span className="form-label">Lane Background (Double)</span>
                  <select className="select" value={laneBgDouble} onChange={e => setLaneBgDouble(Number(e.target.value))}>
                    {customize.laneBgDouble.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Lane Cover (Double)</span>
                  <select className="select" value={laneCoverDouble} onChange={e => setLaneCoverDouble(Number(e.target.value))}>
                    {customize.laneCoverDouble.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </label>

                <div className="hint">
                  Cortina (Double): arrastra para mover (top: {Math.round(curtainTopD)}%)
                </div>
              </div>

              <div className="preview-lane preview-card">
                <div className="stage-lane">
                  <video
                    key={`play-${gameBGPlay}`}
                    className="lane-video base"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={onVideoError}
                  >
                    <source src={gameBgVideo(gameBGPlay)} type="video/mp4" />
                  </video>

                  {/* SLOT central con margen SOLO HORIZONTAL (controlado en CSS: inset: 0 15%) */}
                  <div className="lane-slot double" ref={doubleSlotRef}>
                    {/* BG ocupa el slot */}
                    <img
                      key={`dbg-${laneBgDouble}`}
                      className="lane-image in-slot bg"
                      src={laneBgDoubleImage(laneBgDouble)}
                      alt="Lane BG Double"
                      onError={onImgError}
                    />

                    {/* COVER como CORTINA (altura fija 50%, desplazable vertical) */}
                    <div
                      className="cover-curtain"
                      style={{ top: `${curtainTopD}%` }}
                      onMouseDown={(e) => { setDraggingCurtainD(true); updateCurtainDFromClientY(e.clientY); }}
                      onTouchStart={(e) => { setDraggingCurtainD(true); const t = e.touches[0]; if (t) updateCurtainDFromClientY(t.clientY); }}
                      onTouchEnd={() => setDraggingCurtainD(false)}
                    >
                      <img
                        key={`dcv-${laneCoverDouble}`}
                        className="lane-image cover in-curtain"
                        src={laneCoverDoubleImage(laneCoverDouble)}
                        alt="Lane Cover Double"
                        onError={onImgError}
                      />
                      <div className="curtain-handle">
                        <div className="curtain-handle-line" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn primary" onClick={saveCustom}>Guardar Customize</button>
            {msg && <span className={`msg ${msg.type}`}>{msg.text}</span>}
          </div>
        </section>
      )}
    </div>
  );
}
