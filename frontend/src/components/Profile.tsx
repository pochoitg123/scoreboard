
import { useEffect, useState } from "react";
import { getMe, getMyProfile, updateMyProfile, Me } from "../api/auth";
import customize from "../data/customize.json";

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

export default function Profile({ onGoScores }: { onGoScores: (d: string) => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // campos básicos
  const [dancerName, setDancerName] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [isDispWeight, setIsDispWeight] = useState<number>(0);
  const [subscribed, setSubscribed] = useState<number>(0);

  const [arrowSkin, setArrowSkin] = useState<number>(0);
  const [guideline, setGuideline] = useState<number>(0);
  const [filterIdx, setFilterIdx] = useState<number>(0);
  const [judgePriority, setJudgePriority] = useState<number>(0);
  const [displayTiming, setDisplayTiming] = useState<number>(0);

  // nuevos campos de customize.json
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const m = await getMe();
        if (!alive) return;
        setMe(m);

        const prof = await getMyProfile();
        if (!alive) return;

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

        // nuevos campos
        setCharacterP1(typeof prof?.characterP1Id === "number" ? prof.characterP1Id : 0);
        setCharacterP2(typeof prof?.characterP2Id === "number" ? prof.characterP2Id : 0);
        setAppealBoard(typeof prof?.appealBoardId === "number" ? prof.appealBoardId : 0);
        setLaneBgSingle(typeof prof?.laneBgSingleId === "number" ? prof.laneBgSingleId : 0);
        setLaneBgDouble(typeof prof?.laneBgDoubleId === "number" ? prof.laneBgDoubleId : 0);
        setLaneCoverSingle(typeof prof?.laneCoverSingleId === "number" ? prof.laneCoverSingleId : 0);
        setLaneCoverDouble(typeof prof?.laneCoverDoubleId === "number" ? prof.laneCoverDoubleId : 0);
        setGameBGSystem(typeof prof?.gameBGSystemId === "number" ? prof.gameBGSystemId : 0);
        setGameBGPlay(typeof prof?.gameBGPlayId === "number" ? prof.gameBGPlayId : 0);
        setSongVid(typeof prof?.songVidId === "number" ? prof.songVidId : 0);
      } catch (e: any) {
        setErr(e?.response?.data?.detail || e?.message || "Error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const linkedName = me?.linked?.dancerName || "";

  async function saveProfile() {
    const patch: any = {};
    if (dancerName && dancerName !== linkedName) patch.dancerName = dancerName;

    if (weight !== "") {
      const w = Number(weight);
      if (!Number.isNaN(w)) patch.weight = w;
    }

    patch.isDispWeight = isDispWeight === 1;
    patch.subscribed = subscribed === 1;

    patch.opArrowDesign = arrowSkin;
    patch.opGuideline = guideline;
    patch.opLaneFilter = FILTER_TO_VALUE[filterIdx] ?? 0;
    patch.opJudgePriority = judgePriority;
    patch.opTimingDisp = displayTiming;

    // nuevos campos
    patch.characterP1Id = characterP1;
    patch.characterP2Id = characterP2;
    patch.appealBoardId = appealBoard;
    patch.laneBgSingleId = laneBgSingle;
    patch.laneBgDoubleId = laneBgDouble;
    patch.laneCoverSingleId = laneCoverSingle;
    patch.laneCoverDoubleId = laneCoverDouble;
    patch.gameBGSystemId = gameBGSystem;
    patch.gameBGPlayId = gameBGPlay;
    patch.songVidId = songVid;

    try {
      await updateMyProfile(patch);
      alert("Perfil actualizado");
    } catch (e: any) {
      alert(e?.response?.data?.detail || "No se pudo actualizar");
    }
  }

  if (loading) return <p>Cargando…</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!me) return null;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 860 }}>
      <h2>Mi cuenta</h2>
      <div><strong>Usuario:</strong> {me.username}</div>

      <div>
        <strong>Jugador vinculado:</strong>{" "}
        {linkedName ? (
          <>
            {linkedName}{" "}
            <button onClick={() => onGoScores(linkedName)} style={{ marginLeft: 8 }}>
              Ver Score Dashboard
            </button>
          </>
        ) : (
          <em>ninguno</em>
        )}
      </div>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>Profile Settings</h3>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
          <label>
            Dancer Name
            <input value={dancerName} onChange={e => setDancerName(e.target.value)} placeholder={linkedName || "ANGI"} />
          </label>

          <label>
            Weight (kg)
            <input value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" placeholder="e.g. 70.5" />
          </label>

          <label>
            Workout Display Calories
            <select value={isDispWeight} onChange={e => setIsDispWeight(Number(e.target.value))}>
              {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          <label>
            Platinum Pass
            <select value={subscribed} onChange={e => setSubscribed(Number(e.target.value))}>
              {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          <label>
            Arrow Skin
            <select value={arrowSkin} onChange={e => setArrowSkin(Number(e.target.value))}>
              {ARROW_SKINS.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          <label>
            Guideline
            <select value={guideline} onChange={e => setGuideline(Number(e.target.value))}>
              {GUIDELINES.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          <label>
            Filter concentration
            <select value={filterIdx} onChange={e => setFilterIdx(Number(e.target.value))}>
              {FILTERS.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
            <small style={{ display: "block", color: "#6b7280" }}>
              Se guarda como <code>opLaneFilter</code> = {FILTER_TO_VALUE[filterIdx]}.
            </small>
          </label>

          <label>
            Judgment display priority
            <select value={judgePriority} onChange={e => setJudgePriority(Number(e.target.value))}>
              {JUDGMENT_PRIORITY.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          <label>
            Display Timing judgment
            <select value={displayTiming} onChange={e => setDisplayTiming(Number(e.target.value))}>
              {ON_OFF.map((v, i) => <option key={i} value={i}>{v}</option>)}
            </select>
          </label>

          {/* Nuevos selects */}
          <label>
            Character (P1 side)
            <select value={characterP1} onChange={e => setCharacterP1(Number(e.target.value))}>
              {customize.character.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Character (P2 side)
            <select value={characterP2} onChange={e => setCharacterP2(Number(e.target.value))}>
              {customize.character.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Appeal Board
            <select value={appealBoard} onChange={e => setAppealBoard(Number(e.target.value))}>
              {customize.appealBoard.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Lane Background (SINGLE)
            <select value={laneBgSingle} onChange={e => setLaneBgSingle(Number(e.target.value))}>
              {customize.laneBgSingle.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Lane Background (DOUBLE)
            <select value={laneBgDouble} onChange={e => setLaneBgDouble(Number(e.target.value))}>
              {customize.laneBgDouble.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Lane Cover (SINGLE)
            <select value={laneCoverSingle} onChange={e => setLaneCoverSingle(Number(e.target.value))}>
              {customize.laneCoverSingle.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Lane Cover (DOUBLE)
            <select value={laneCoverDouble} onChange={e => setLaneCoverDouble(Number(e.target.value))}>
              {customize.laneCoverDouble.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Game Background (System)
            <select value={gameBGSystem} onChange={e => setGameBGSystem(Number(e.target.value))}>
              {customize.gameBG.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Game Background (During Play)
            <select value={gameBGPlay} onChange={e => setGameBGPlay(Number(e.target.value))}>
              {customize.gameBG.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>

          <label>
            Background Video Display
            <select value={songVid} onChange={e => setSongVid(Number(e.target.value))}>
              {customize.songVid.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={saveProfile} style={{ padding: "6px 12px", borderRadius: 8 }}>
            Guardar cambios
          </button>
        </div>
      </section>
    </div>
  );
}
