"use client";

import { useMemo, useState } from "react";

type Fields = Record<string, string>;

const initial: Fields = {
  height: "", weight: "", sbp: "", dbp: "", hr: "", vtiPre: "", vtiPost: "",
  intervention: "None", scvo2: "", pco2v: "", pco2a: "", crt: "", urine: "",
  lactate: "", mentation: "Unknown", temperature: "", congestion: "Unknown"
};

const n = (value: string) => value.trim() === "" ? null : Number(value);
const fmt = (value: number | null, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export default function Home() {
  const [f, setF] = useState(initial);
  const set = (key: string, value: string) => setF(prev => ({ ...prev, [key]: value }));

  const r = useMemo(() => {
    const height = n(f.height), weight = n(f.weight), sbp = n(f.sbp), dbp = n(f.dbp), hr = n(f.hr);
    const pre = n(f.vtiPre), post = n(f.vtiPost), scvo2 = n(f.scvo2), pv = n(f.pco2v), pa = n(f.pco2a);
    const crt = n(f.crt), urine = n(f.urine), lactate = n(f.lactate), temp = n(f.temperature);
    const map = sbp != null && dbp != null ? (sbp + 2 * dbp) / 3 : null;
    const pp = sbp != null && dbp != null ? sbp - dbp : null;
    const shockIndex = hr != null && sbp != null && sbp > 0 ? hr / sbp : null;
    const bsa = height != null && weight != null ? Math.sqrt(height * weight / 3600) : null;
    const vtiChange = pre != null && post != null && pre > 0 ? ((post - pre) / pre) * 100 : null;
    const dco2 = pv != null && pa != null ? pv - pa : null;
    const ppBand = pp == null || sbp == null ? "Awaiting values" : pp < 0.25 * sbp ? "Narrow (<25% of SBP)" : pp >= 60 ? "Wide (≥60 mmHg)" : "Within screening band";
    const ppTone = pp == null || sbp == null ? "neutral" : pp < 0.25 * sbp || pp >= 60 ? "alert" : "ok";
    const shockIndexBand = shockIndex == null ? "Awaiting values" : shockIndex < 0.5 ? "Below reference (<0.50)" : shockIndex <= 0.7 ? "Conventional reference" : shockIndex < 0.9 ? "Above reference (0.71–0.89)" : "High (≥0.90)";
    const shockIndexTone = shockIndex == null ? "neutral" : shockIndex >= 0.9 ? "alert" : shockIndex >= 0.5 && shockIndex <= 0.7 ? "ok" : "caution";

    const perfusionFlags = [
      crt != null && crt > 3,
      urine != null && urine < 0.5,
      lactate != null && lactate > 2,
      f.mentation === "Altered",
      temp != null && temp < 36,
      scvo2 != null && scvo2 < 70,
      dco2 != null && dco2 > 6
    ];
    const knownPerfusion = [crt, urine, lactate, temp, scvo2, dco2].filter(x => x != null).length + (f.mentation === "Unknown" ? 0 : 1);
    const impairedCount = perfusionFlags.filter(Boolean).length;
    const perfusion = knownPerfusion === 0 ? "Insufficient data" : impairedCount >= 1 ? "Impaired / possible mismatch" : "No entered marker is abnormal";
    const responsive = vtiChange == null ? "Not determined" : vtiChange >= 10 ? "Likely yes" : "Likely no";
    const tolerance = f.congestion === "Congestion present" ? "Poor / fluid-intolerant pattern" : f.congestion === "No congestion" ? "No congestion identified" : "Not determined";

    let phenotype = "Insufficient data for phenotype";
    const lowFlow = (pre != null && pre < 18) || (scvo2 != null && scvo2 < 70) || (dco2 != null && dco2 > 6);
    const vasoplegia = dbp != null && dbp < 50 && pp != null && pp >= 40;
    if (f.congestion === "Congestion present" && lowFlow) phenotype = "Congested low-flow pattern — cardiogenic or mixed physiology to assess";
    else if (vasoplegia && !lowFlow) phenotype = "Vasodilatory pattern — distributive physiology to assess";
    else if (vasoplegia && lowFlow) phenotype = "Mixed vasodilatory and low-flow pattern";
    else if (responsive === "Likely yes" && f.congestion !== "Congestion present") phenotype = "Preload-responsive pattern without documented congestion";
    else if (knownPerfusion > 0) phenotype = "Indeterminate / compensated pattern — integrate serial examination and echo";

    const actions: string[] = [];
    if (map != null && map < 65) actions.push("Confirm the arterial trace and rapidly reassess pressure, flow and perfusion in parallel.");
    if (vasoplegia) actions.push("Look for vasodilation and exclude aortic regurgitation or an artefactual low diastolic pressure.");
    if (responsive === "Likely yes" && f.congestion !== "Congestion present") actions.push("If hypoperfusion persists, consider a cautious fluid intervention with immediate reassessment.");
    if (f.congestion === "Congestion present") actions.push("Avoid reflex fluid loading; evaluate ventricular function, venous congestion and the need for decongestion.");
    if (lowFlow) actions.push("Reassess LV/RV function, rhythm, preload, afterload and mechanical causes of low forward flow.");
    if (impairedCount > 0) actions.push("Trend CRT, urine output, lactate and mentation after the chosen intervention.");
    if (!actions.length) actions.push("Complete missing domains and interpret trends within the clinical context.");
    return { map, pp, shockIndex, bsa, vtiChange, dco2, ppBand, ppTone, shockIndexBand, shockIndexTone, perfusion, responsive, tolerance, phenotype, actions };
  }, [f]);

  const input = (key: string, label: string, unit = "") => (
    <label><span>{label}{unit && <small> ({unit})</small>}</span><input type="number" inputMode="decimal" step="any" value={f[key]} onChange={e => set(key, e.target.value)} /></label>
  );
  const select = (key: string, label: string, options: string[]) => (
    <label><span>{label}</span><select value={f[key]} onChange={e => set(key, e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>
  );

  return (
    <main>
      <header><p className="eyebrow">Bedside decision-support prototype</p><h1>Haemodynamic Compass</h1><p>Pressure, flow, perfusion, fluid responsiveness and fluid tolerance—reviewed together.</p></header>
      <div className="notice">For clinician education and research only. This prototype does not diagnose disease or replace bedside assessment, validated monitoring, local protocols or senior review.</div>

      <nav className="section-nav" aria-label="Calculator sections">
        <a href="#pressure">Pressure</a><a href="#flow">Flow</a><a href="#perfusion">Perfusion</a><a href="#synthesis">Synthesis</a>
      </nav>

      <section id="pressure"><h2>1. Patient and pressure</h2><div className="grid">{input("height", "Height", "cm")}{input("weight", "Weight", "kg")}{input("sbp", "Systolic BP", "mmHg")}{input("dbp", "Diastolic BP", "mmHg")}{input("hr", "Heart rate", "/min")}</div>
        <div className="metrics"><Metric name="BSA" value={fmt(r.bsa, 2)} /><Metric name="MAP" value={fmt(r.map)} /><Metric name="Pulse pressure" value={fmt(r.pp)} reference="Typical ≈40; wide ≥60 mmHg" flag={r.ppBand} tone={r.ppTone} /><Metric name="Shock index" value={fmt(r.shockIndex, 2)} reference="Conventional reference 0.50–0.70" flag={r.shockIndexBand} tone={r.shockIndexTone} /></div>
        <p className="range-note">Screening thresholds only: narrow pulse pressure is better expressed as &lt;25% of SBP. Shock index ≥0.90 is concerning in acute illness, but age, medication, rhythm and clinical context can alter interpretation.</p>
      </section>

      <section id="flow"><h2>2. Global flow and intervention response</h2><div className="grid">{input("vtiPre", "Pre-intervention LVOT VTI", "cm")}{select("intervention", "Intervention", ["None", "100 mL mini-fluid challenge over 1 min", "250 mL fluid challenge over 2–3 min", "Other intervention"])}{input("vtiPost", "Post-intervention LVOT VTI", "cm")}{input("scvo2", "ScvO₂", "%")}{input("pco2v", "Central venous PCO₂", "mmHg")}{input("pco2a", "Arterial PCO₂", "mmHg")}</div>
        <div className="metrics"><Metric name="VTI change" value={`${fmt(r.vtiChange)}${r.vtiChange == null ? "" : "%"}`} /><Metric name="ΔPCO₂" value={fmt(r.dco2)} /></div>
      </section>

      <section id="perfusion"><h2>3. Tissue perfusion and fluid tolerance</h2><div className="grid">{input("crt", "Capillary refill time", "s")}{input("urine", "Urine output", "mL/kg/h")}{input("lactate", "Lactate", "mmol/L")}{select("mentation", "Mentation", ["Unknown", "Normal", "Altered"])}{input("temperature", "Peripheral temperature", "°C")}{select("congestion", "Integrated congestion assessment", ["Unknown", "No congestion", "Congestion present"])}</div></section>

      <section className="result" id="synthesis"><h2>Clinical synthesis</h2><div className="status-grid"><Status name="Perfusion" value={r.perfusion} /><Status name="Fluid responsiveness" value={r.responsive} /><Status name="Fluid tolerance" value={r.tolerance} /></div><h3>Working phenotype</h3><p className="phenotype">{r.phenotype}</p><h3>Suggested next checks</h3><ol>{r.actions.map(a => <li key={a}>{a}</li>)}</ol></section>

      <button className="reset" onClick={() => setF(initial)}>Reset calculator</button>
      <footer>Interpret values as trends. Missing measurements must remain unknown rather than being assumed normal.</footer>
      <div className="mobile-actions"><a href="#synthesis">View synthesis</a><button onClick={() => setF(initial)}>Reset</button></div>
    </main>
  );
}

function Metric({ name, value, reference, flag, tone = "neutral" }: { name: string; value: string; reference?: string; flag?: string; tone?: string }) { return <div className="metric"><span>{name}</span><strong>{value}</strong>{flag && <em className={`metric-flag ${tone}`}>{flag}</em>}{reference && <small className="metric-reference">{reference}</small>}</div>; }
function Status({ name, value }: { name: string; value: string }) { return <div className="status"><span>{name}</span><strong>{value}</strong></div>; }
