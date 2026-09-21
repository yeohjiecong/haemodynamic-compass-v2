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
    const scvo2Band = scvo2 == null ? "Awaiting value" : scvo2 < 70 ? "Low (<70%)" : scvo2 <= 80 ? "Reference band (70–80%)" : "High (>80%): interpret cautiously";
    const scvo2Tone = scvo2 == null ? "neutral" : scvo2 < 70 ? "alert" : scvo2 <= 80 ? "ok" : "caution";
    const dco2Band = dco2 == null ? "Needs paired samples" : dco2 < 0 ? "Check samples: negative gap" : dco2 <= 6 ? "Not elevated (≤6 mmHg)" : "High (>6 mmHg)";
    const dco2Tone = dco2 == null ? "neutral" : dco2 < 0 || dco2 > 6 ? "alert" : "ok";

    let flowPhenotype = {
      title: "Enter ScvO₂ and paired PCO₂ values",
      summary: "The combined oxygen-delivery and flow phenotype requires ScvO₂ plus near-simultaneous central venous and arterial blood gases.",
      think: ["Do not classify an unmeasured variable as normal."],
      next: ["Enter ScvO₂, central venous PCO₂ and arterial PCO₂ from paired samples."]
    };
    if (scvo2 != null && dco2 != null && dco2 < 0) {
      flowPhenotype = {
        title: "CO₂ gap is negative — verify data quality",
        summary: "A negative central venous-to-arterial PCO₂ gap is physiologically unexpected and should not be phenotyped automatically.",
        think: ["Reversed arterial/venous entries", "Non-simultaneous samples", "Sampling or analyser error"],
        next: ["Confirm sample identity and timing, then repeat if necessary."]
      };
    } else if (scvo2 != null && dco2 != null) {
      const lowScv = scvo2 < 70;
      const highScv = scvo2 > 80;
      const highGap = dco2 > 6;
      if (lowScv && highGap) flowPhenotype = {
        title: "Low ScvO₂ + high CO₂ gap",
        summary: "Combined oxygen delivery–demand mismatch and inadequate effective flow/CO₂ washout pattern.",
        think: ["Low cardiac output or hypovolaemia", "LV/RV dysfunction", "Anaemia or arterial hypoxaemia", "Excess metabolic demand"],
        next: ["Assess measured or estimated cardiac output and LVOT VTI.", "Assess fluid responsiveness and fluid tolerance separately.", "Check Hb, SaO₂, temperature, agitation, shivering or seizures."]
      };
      else if (!lowScv && highGap) flowPhenotype = {
        title: `${highScv ? "High" : "ScvO₂ ≥70%"} + high CO₂ gap`,
        summary: "ScvO₂ is not low, but effective flow or microcirculatory CO₂ washout may remain inadequate.",
        think: ["Low or maldistributed effective flow", "Microcirculatory heterogeneity or shunting", "Impaired oxygen extraction", "Sedation-related low VO₂ may make ScvO₂ appear reassuring", "Regional ischaemia"],
        next: ["Reassess cardiac output, echo and LVOT VTI.", "Use a dynamic responsiveness test before fluid.", "Recheck CRT, mottling, temperature, lactate trend and regional ischaemia.", "Do not automatically give fluid or start an inotrope from this pattern alone."]
      };
      else if (lowScv && !highGap) flowPhenotype = {
        title: "Low ScvO₂ + non-elevated CO₂ gap",
        summary: "Oxygen delivery is insufficient relative to demand, while the CO₂ gap does not show a clear low-flow/washout signal.",
        think: ["Anaemia", "Arterial hypoxaemia", "Fever, shivering, agitation or seizures", "Increased oxygen consumption", "Flow may be preserved, but this is not proven"],
        next: ["Check Hb, SaO₂/PaO₂ and metabolic demand.", "Measure or estimate cardiac output if uncertainty persists.", "Treat the identified delivery or demand problem rather than reflexively increasing flow."]
      };
      else flowPhenotype = {
        title: `${highScv ? "High" : "Reference-range"} ScvO₂ + non-elevated CO₂ gap`,
        summary: highScv ? "The CO₂ gap is not elevated, but ScvO₂ >80% may still reflect impaired extraction or shunting; do not label this automatically normal." : "Generally reassuring for global haemodynamic adequacy when tissue-perfusion endpoints are also improving.",
        think: highScv ? ["Impaired oxygen extraction", "Microcirculatory shunting", "Low VO₂ from sedation or hypothermia"] : ["Global flow and oxygen balance may be adequate", "Regional ischaemia can still be missed"],
        next: ["Confirm concordant CRT, urine output, lactate trend, mentation, temperature and organ function.", "Continue serial reassessment rather than relying on one paired sample."]
      };
    }

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
    return { map, pp, shockIndex, bsa, vtiChange, dco2, ppBand, ppTone, shockIndexBand, shockIndexTone, scvo2Band, scvo2Tone, dco2Band, dco2Tone, flowPhenotype, perfusion, responsive, tolerance, phenotype, actions };
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
        <div className="metrics flow-metrics"><Metric name="VTI change" value={`${fmt(r.vtiChange)}${r.vtiChange == null ? "" : "%"}`} reference="Interpret against the chosen intervention" /><Metric name="ScvO₂" value={`${fmt(n(f.scvo2))}${n(f.scvo2) == null ? "" : "%"}`} reference="Reference used: 70–80%" flag={r.scvo2Band} tone={r.scvo2Tone} /><Metric name="Pcv–aCO₂ gap" value={`${fmt(r.dco2)}${r.dco2 == null ? "" : " mmHg"}`} reference="Central venous PCO₂ − arterial PCO₂" flag={r.dco2Band} tone={r.dco2Tone} /></div>
        <div className="flow-interpretation">
          <p className="interpretation-label">Combined interpretation</p>
          <h3>{r.flowPhenotype.title}</h3>
          <p>{r.flowPhenotype.summary}</p>
          <div className="interpretation-grid"><div><h4>Think of</h4><ul>{r.flowPhenotype.think.map(item => <li key={item}>{item}</li>)}</ul></div><div><h4>Check next</h4><ul>{r.flowPhenotype.next.map(item => <li key={item}>{item}</li>)}</ul></div></div>
          <p className="sampling-note">Use near-simultaneous samples from the same arterial and central venous sampling context. The CO₂ gap is a flow-related adjunct, not a direct measurement of cardiac output or proof of anaerobic metabolism.</p>
        </div>
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
