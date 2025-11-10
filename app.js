// Utility: seedless RNG in range
function randInRange(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) { // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

// Ensure a canvas exists; create if missing (prevents silent failures)
function ensureCanvas(canvasId, parentId, width=560, height=180){
  let c = document.getElementById(canvasId);
  if (!c){
    const parent = document.getElementById(parentId);
    if (!parent) return null;
    c = document.createElement('canvas');
    c.id = canvasId; c.width = width; c.height = height;
    parent.appendChild(c);
  }
  return c;
}

// Global state
let state = {
  n: 100,
  mu: 8.4,
  sigma: 1.2,
  k: 1, // tail at mu + k*sigma
  threshold: 9.6,
  q1Context: {}
};

function generateNumbers() {
  // Q1: sampling question with randomized company/metric/n
  const companies = ["Acme Analytics", "Northstar Retail", "Nimbus Labs", "Orion Biotech", "Vector Logistics"];
  const metrics = ["training hours this year", "annual training hours", "hours of professional development this year"];
  const company = companies[randInt(0, companies.length - 1)];
  const metric = metrics[randInt(0, metrics.length - 1)];
  const n = randInt(80, 200); // sample size
  state.n = n;
  state.q1Context = { company, metric, n };

  // Q1 DOM writes (guarded)
  const q1El = document.getElementById("q1-problem");
  if (q1El) {
    q1El.innerHTML = `A company (<strong>${company}</strong>) wants to estimate the average number of <strong>${metric}</strong>. They collect a <em>simple random sample</em> of <strong>${n}</strong> employees. Define the <strong>population</strong>, <strong>sample</strong>, <strong>parameter</strong>, and <strong>statistic</strong>.`;
  }
  const modelList = document.getElementById("q1-model-list");
  if (modelList) {
    modelList.innerHTML = "";
    [
      `<strong>Population:</strong> All employees at ${company} whose ${metric} are of interest (this year).`,
      `<strong>Sample:</strong> The ${n} employees selected via simple random sampling.`,
      `<strong>Parameter:</strong> The population mean <em>\\(\\mu\\)</em> = average ${metric} for <em>all</em> employees.`,
      `<strong>Statistic:</strong> The sample mean <em>\\(\\\\bar{x}\\)</em> computed from the ${n} sampled employees (and possibly the sample SD <em>\\(s\\)</em>).`
    ].forEach(li => {
      const node = document.createElement("li");
      node.innerHTML = li;
      modelList.appendChild(node);
    });
  }

  // Q2: normal distribution numbers
  const mu = Math.round(randInRange(7.0, 9.8) * 10) / 10;       // one decimal
  const sigma = Math.round(randInRange(0.8, 1.8) * 10) / 10;    // one decimal
  const kChoices = [1, 2, 3];
  const k = kChoices[randInt(0, kChoices.length - 1)];
  const threshold = +(mu + k * sigma).toFixed(2);

  state.mu = mu;
  state.sigma = sigma;
  state.k = k;
  state.threshold = threshold;

  const q2Prob = document.getElementById("q2-problem");
  if (q2Prob) {
    q2Prob.innerHTML = `Assume customer satisfaction scores follow a Normal distribution with mean <strong>\\(\\mu=${mu}\\)</strong> and standard deviation <strong>\\(\\sigma=${sigma}\\)</strong>. Using the 68–95–99.7 rule, what proportion of customers have scores <strong>above</strong> <strong>${threshold}</strong>?`;
  }
  const muLbl = document.getElementById("q2-mu-label"); if (muLbl) muLbl.textContent = mu;
  const sgLbl = document.getElementById("q2-sigma-label"); if (sgLbl) sgLbl.textContent = sigma;

  const a2 = document.getElementById("q2-answer"); if (a2) a2.value = "";
  const fb2 = document.getElementById("q2-feedback"); if (fb2) fb2.textContent = "";
  const xp2 = document.getElementById("q2-explanation"); if (xp2) xp2.classList.add("hidden");

  // Draw the normal curve (guarded)
  if (document.getElementById("q2-canvas")) {
    drawNormalCurve(mu, sigma, threshold);
  }
  // Update explanation steps (guarded)
  buildQ2Explanation(mu, sigma, k, threshold);
}

function buildQ2Explanation(mu, sigma, k, threshold) {
  const steps = document.getElementById("q2-expl-steps");
  if (!steps) return;
  steps.innerHTML = "";
  const z = k; // by construction threshold = mu + k*sigma
  let tailPct = 16.0;
  if (k === 1) tailPct = 16.0;
  if (k === 2) tailPct = 2.5;
  if (k === 3) tailPct = 0.15;

  [
    `Compute a z-score: \\( z = (x - \\mu)/\\sigma = (${threshold} - ${mu})/${sigma} = ${z} \\).`,
    `Use the 68–95–99.7 rule: within ±1σ is ~68% (upper tail ~16%), ±2σ is ~95% (upper tail ~2.5%), ±3σ is ~99.7% (upper tail ~0.15%).`,
    `Therefore, \\(P(X>${threshold})\\) ≈ <strong>${tailPct}%</strong> by the empirical rule.`
  ].forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = t;
    steps.appendChild(li);
  });
}

function checkQ2Answer() {
  let val = parseFloat(document.getElementById("q2-answer").value);
  const fb = document.getElementById("q2-feedback");
  if (isNaN(val)) {
    fb.textContent = "Enter a numeric value (e.g., 16 or 0.16).";
    fb.style.color = "#b91c1c";
    return;
  }
  // allow 0–1 proportions
  if (val <= 1) val *= 100;

  // Expected by k
  let expected = 16.0;
  if (state.k === 2) expected = 2.5;
  if (state.k === 3) expected = 0.15;

  const diff = Math.abs(val - expected);
  const tol = state.k === 1 ? 2.0 : (state.k === 2 ? 0.8 : 0.1);

  if (diff <= tol) {
    fb.textContent = `✓ Correct (expected ≈ ${expected}% using the 68–95–99.7 rule).`;
    fb.style.color = "#065f46";
  } else {
    fb.textContent = `Not quite. Hint: z = ${state.k}. Upper-tail by the empirical rule is about ${expected}%.`;
    fb.style.color = "#b91c1c";
  }
}

// Simple normal curve drawing with shaded right tail
function drawNormalCurve(mu, sigma, threshold) {
  const canvas = document.getElementById("q2-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const W = canvas.width, H = canvas.height;
  const pad = 35;
  const xMin = mu - 4*sigma, xMax = mu + 4*sigma;

  function xToPx(x) { return pad + (x - xMin) * (W - 2*pad) / (xMax - xMin); }
  function yToPx(y) { return H - pad - y*(H - 2*pad); }

  // PDF function
  function pdf(x) {
    const z = (x - mu)/sigma;
    return (1/(sigma*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*z*z);
  }

  // Find max height near mu
  const yMax = pdf(mu);
  // Axes
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  // baseline
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

  // Curve
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i=0;i<=400;i++){
    const x = xMin + (i/400)*(xMax - xMin);
    const y = pdf(x) / yMax; // normalize to [0,1] for plotting
    const px = xToPx(x), py = yToPx(y);
    if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Shade right tail
  const t = threshold;
  ctx.fillStyle = "rgba(17, 24, 39, 0.12)";
  ctx.beginPath();
  let started = false;
  for (let i=0;i<=400;i++){
    const x = xMin + (i/400)*(xMax - xMin);
    if (x < t) continue;
    const y = pdf(x) / yMax;
    const px = xToPx(x), py = yToPx(y);
    if (!started) { ctx.moveTo(xToPx(t), yToPx(0)); ctx.lineTo(px, py); started = true; }
    else ctx.lineTo(px, py);
  }
  if (started){
    ctx.lineTo(xToPx(xMax), yToPx(0));
    ctx.closePath();
    ctx.fill();
  }

  // Draw threshold line
  ctx.strokeStyle = "#ef4444";
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.moveTo(xToPx(t), yToPx(0));
  ctx.lineTo(xToPx(t), yToPx(1));
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = "#111";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica, Arial, sans-serif";
  ctx.fillText(`μ = ${mu}`, xToPx(mu)-12, yToPx(1)-4);
  ctx.fillStyle = "#ef4444";
  ctx.fillText(`threshold = ${t}`, xToPx(t)+4, yToPx(0)+14);
}

function setupUI(){
  const b1 = document.getElementById("q1-show-answers"); if (b1) b1.addEventListener("click", ()=>{ const p=document.getElementById("q1-answer"); if(p) p.classList.toggle("hidden"); });
  const b1c = document.getElementById("q1-clear"); if (b1c) b1c.addEventListener("click", ()=>{
    ["q1-population","q1-sample","q1-parameter","q1-statistic"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  });
  const q2c = document.getElementById("q2-check"); if (q2c) q2c.addEventListener("click", checkQ2Answer);
  const q2s = document.getElementById("q2-show-explanation"); if (q2s) q2s.addEventListener("click", ()=>{ const p=document.getElementById("q2-explanation"); if(p) p.classList.toggle("hidden"); });
  const rg = document.getElementById("regen"); if (rg) rg.addEventListener("click", generateNumbers);
}

window.addEventListener("DOMContentLoaded", ()=>{
  setupUI();
  generateNumbers();
});


// ======== Q3: Probability (Independence & Union) ========
function generateQ3(){
  // Randomize P(A), P(B), and P(A∩B) (in %), keep valid constraints
  // Ensure 0 < P(A∩B) <= min(P(A), P(B))
  let pA = Math.round(randInRange(20, 70)); // 20%–70%
  let pB = Math.round(randInRange(15, 60)); // 15%–60%
  let pInt = Math.round(randInRange(5, Math.min(pA, pB) - 3)); // intersection

  state.q3 = { pA, pB, pInt };
  const prob = document.getElementById("q3-problem");
  if (prob) {
    prob.innerHTML = `In a customer base, let event <strong>A</strong> = “renew next year” with <strong>P(A)=${pA}%</strong> and <strong>B</strong> = “upgrade plan” with <strong>P(B)=${pB}%</strong>. A survey suggests <strong>P(A ∩ B)=${pInt}%</strong>.`;
  }

  const expl = document.getElementById("q3-expl");
  const union = pA + pB - pInt;
  const indep = Math.abs((pA/100)*(pB/100) - (pInt/100)) < 0.01; // ~1% tolerance
  state.q3.union = union;
  state.q3.indep = indep;
  if (expl) {
    expl.innerHTML = `<p><strong>Union:</strong> P(A ∪ B) = P(A)+P(B)−P(A∩B) = ${pA}% + ${pB}% − ${pInt}% = <strong>${union}%</strong>.</p>
    <p><strong>Independence check:</strong> If independent, P(A∩B) = P(A)·P(B) = ${(pA*pB/100).toFixed(2)}%. Observed is ${pInt}%. Therefore: <strong>${indep ? "Independent (approximately)" : "Not independent"}</strong>.</p>`;
  }
}

function checkQ3(){
  const fb = document.getElementById("q3-feedback");
  const u = parseFloat(document.getElementById("q3-union").value);
  const indepSel = document.getElementById("q3-indep").value;
  if (isNaN(u) || indepSel===""){
    fb.textContent = "Enter the union as a % and choose an independence option.";
    fb.style.color = "#b91c1c"; return;
  }
  const okU = Math.abs(u - state.q3.union) <= 1.0;
  const okI = (state.q3.indep && indepSel==="yes") || (!state.q3.indep && indepSel==="no");
  if (okU && okI){ fb.textContent = "✓ Correct."; fb.style.color = "#065f46"; }
  else {
    let hint = `Union expected ≈ ${state.q3.union}%. Independence: ${state.q3.indep? "Yes":"No"}.`;
    fb.textContent = "Not quite. " + hint;
    fb.style.color = "#b91c1c";
  }
}

// ======== Q4: Confidence Interval ========
function generateQ4(){
  // Randomize n >= 30, xbar, s
  const n = randInt(35, 120);
  const xbar = +(randInRange(48, 62).toFixed(2));
  const s = +(randInRange(6, 14).toFixed(2));
  state.q4 = { n, xbar, s };

  const prob = document.getElementById("q4-problem");
  if (prob) {
    prob.innerHTML = `A simple random sample of size <strong>n=${n}</strong> yields a sample mean <strong>x&#772;=${xbar}</strong> and sample SD <strong>s=${s}</strong>. Assume an approximately Normal sampling distribution (n≥30).`;
  }

  const tstar = n >= 30 ? 1.96 : 2.045; // simple fallback
  const se = s / Math.sqrt(n);
  const lower = +(xbar - tstar*se).toFixed(2);
  const upper = +(xbar + tstar*se).toFixed(2);
  state.q4.lower = lower; state.q4.upper = upper; state.q4.tstar = tstar; state.q4.se = se;

  const steps = document.getElementById("q4-steps");
  steps.innerHTML = `<ol>
    <li>SE = s/√n = ${s}/√${n} = ${se.toFixed(3)}</li>
    <li>t* ≈ ${tstar} at 95% (two-sided)</li>
    <li>CI: x&#772; ± t*·SE = ${xbar} ± ${tstar}·${se.toFixed(3)}</li>
    <li>CI ≈ (<strong>${lower}</strong>, <strong>${upper}</strong>)</li>
  </ol><p><em>Reference:</em> Keller 12e — Ch. 6 (Probability), Ch. 5 (Data Collection) for event definitions.</p>`;
}

function checkQ4(){
  const lo = parseFloat(document.getElementById("q4-lower").value);
  const hi = parseFloat(document.getElementById("q4-upper").value);
  const fb = document.getElementById("q4-feedback");
  if (isNaN(lo) || isNaN(hi)){ fb.textContent = "Enter both lower and upper bounds."; fb.style.color = "#b91c1c"; return; }
  const ok = Math.abs(lo - state.q4.lower) <= 0.15 && Math.abs(hi - state.q4.upper) <= 0.15;
  if (ok){ fb.textContent = "✓ Correct (within tolerance)."; fb.style.color = "#065f46"; }
  else {
    fb.textContent = `Not quite. Expected ≈ (${state.q4.lower}, ${state.q4.upper}).`;
    fb.style.color = "#b91c1c";
  }
}

// ======== Q5: Hypothesis Test ========
function generateQ5(){
  const n = randInt(35, 120);
  const mu0 = +(randInRange(49, 51).toFixed(2));
  const xbar = +(randInRange(48, 62).toFixed(2));
  const s = +(randInRange(6, 14).toFixed(2));
  const se = s / Math.sqrt(n);
  const t = (xbar - mu0) / se;
  const df = n - 1;
  const tcrit = df >= 30 ? 1.96 : 2.045; // simple cutoff for α=0.05 two-sided

  state.q5 = { n, mu0, xbar, s, se, t, df, tcrit };
  const prob = document.getElementById("q5-problem");
  prob.innerHTML = `Test <strong>H₀: μ=${mu0}</strong> vs <strong>H₁: μ ≠ ${mu0}</strong> using sample size <strong>n=${n}</strong>, mean <strong>x&#772;=${xbar}</strong>, SD <strong>s=${s}</strong>.`;

  const soln = document.getElementById("q5-soln");
  const decision = Math.abs(t) > tcrit ? "Reject H₀" : "Fail to reject H₀";
  soln.innerHTML = `<ol>
    <li>SE = s/√n = ${s}/√${n} = ${se.toFixed(3)}</li>
    <li>t = (x&#772; − μ₀)/SE = (${xbar} − ${mu0})/${se.toFixed(3)} = <strong>${t.toFixed(2)}</strong></li>
    <li>Critical values (α=0.05, two-sided): ±${tcrit}</li>
    <li>Decision: <strong>${decision}</strong></li>
  </ol><p><em>Reference:</em> Keller 12e — Ch. 11 (Introduction to Hypothesis Testing), Ch. 9 (Sampling Distributions).</p>`;
}

function checkQ5(){
  const tIn = parseFloat(document.getElementById("q5-t").value);
  const decide = document.getElementById("q5-decide").value;
  const fb = document.getElementById("q5-feedback");
  if (isNaN(tIn) || !decide){
    fb.textContent = "Enter the t statistic and choose a decision."; fb.style.color = "#b91c1c"; return;
  }
  const tOk = Math.abs(tIn - state.q5.t) <= 0.15;
  const decision = Math.abs(state.q5.t) > state.q5.tcrit ? "reject" : "fail";
  const dOk = (decide === decision);
  if (tOk && dOk){ fb.textContent = "✓ Correct."; fb.style.color = "#065f46"; }
  else {
    fb.textContent = `Not quite. t ≈ ${state.q5.t.toFixed(2)}; decision: ${decision=="reject"?"Reject H₀":"Fail to reject H₀"}.`;
    fb.style.color = "#b91c1c";
  }
}

// ======== Bonus: Decision-Making (Expected Value) ========
function generateEVBonus(){
  // Two actions, two scenarios
  const pGood = +(randInRange(0.3, 0.8).toFixed(2));
  const pBad = +(1 - pGood).toFixed(2);
  const aPayGood = randInt(50, 150);
  const aPayBad = randInt(-70, 20);
  const bPayGood = randInt(40, 160);
  const bPayBad = randInt(-80, 10);

  const EV_A = +(pGood*aPayGood + pBad*aPayBad).toFixed(2);
  const EV_B = +(pGood*bPayGood + pBad*bPayBad).toFixed(2);
  const winner = EV_A >= EV_B ? "A" : "B";
  const evdiff = +(Math.abs(EV_A - EV_B)).toFixed(2);

  state.bonus = { pGood, pBad, aPayGood, aPayBad, bPayGood, bPayBad, EV_A, EV_B, winner, evdiff };

  const prob = document.getElementById("bonus-problem");
  if (prob){
    prob.innerHTML = `Market has two states: <strong>Good</strong> (p=${pGood}) and <strong>Bad</strong> (p=${pBad}).
    <br/>Action A payoffs: Good=${aPayGood}, Bad=${aPayBad}.
    <br/>Action B payoffs: Good=${bPayGood}, Bad=${bPayBad}.`;
  }

  const work = document.getElementById("bonus-work");
  if (work){
    work.innerHTML = `<p>EV(A) = ${pGood}×${aPayGood} + ${pBad}×${aPayBad} = <strong>${EV_A}</strong></p>
    <p>EV(B) = ${pGood}×${bPayGood} + ${pBad}×${bPayBad} = <strong>${EV_B}</strong></p>
    <p>Choose <strong>Action ${winner}</strong>. EV difference = <strong>${evdiff}</strong>.</p>`;
  }
}

function checkEVBonus(){
  const fb = document.getElementById("bonus-feedback");
  const choice = document.getElementById("bonus-choice").value;
  const diff = parseFloat(document.getElementById("bonus-evdiff").value);
  if (!fb){ return; }
  if (!choice || isNaN(diff)){
    fb.textContent = "Choose an action and enter the EV difference.";
    fb.style.color = "#b91c1c"; return;
  }
  const okC = (choice === state.bonus.winner);
  const okD = Math.abs(diff - state.bonus.evdiff) <= 1.0;
  if (okC && okD){ fb.textContent = "✓ Correct."; fb.style.color = "#065f46"; }
  else {
    fb.textContent = `Not quite. Winner: Action ${state.bonus.winner}. EV diff ≈ ${state.bonus.evdiff}.`;
    fb.style.color = "#b91c1c";
  }
}


// === Utilities ===
function phi(z){ // standard normal CDF approximation (Abramowitz-Stegun)
  // Error function approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
  const p = 1 - d*(0.319381530*t - 0.356563782*Math.pow(t,2) + 1.781477937*Math.pow(t,3) - 1.821255978*Math.pow(t,4) + 1.330274429*Math.pow(t,5));
  return z>=0 ? p : 1-p;
}
function normalPDF(x, mu, sigma){ const z=(x-mu)/sigma; return (1/(sigma*Math.sqrt(2*Math.PI)))*Math.exp(-0.5*z*z); }

// === Q3: Joint & Conditional ===
function generateQ3_midterm() {
  // Fixed per practice (but allow small randomization around given values)
  const pC = 60; // %
  const pL = 40; // %
  const pL_given_C = 50; // %
  const pInt = +(pC * pL_given_C / 100).toFixed(2); // P(C∩L) = %
  const pCond = +((pInt) / (pL) * 100).toFixed(2);   // P(C|L) in %

  state.q3m = { pC, pL, pL_given_C, pInt, pCond };

  const q3p = document.getElementById("q3-problem");
  if (q3p) {
    q3p.innerHTML = `Survey: P(C)=${pC}%, P(L)=${pL}%, and among coffee buyers P(L|C)=${pL_given_C}%.`;
  }

  const expl = document.getElementById("q3-expl");
  if (expl) {
    expl.innerHTML = `<ol>
      <li>P(C∩L) = P(C)·P(L|C) = ${pC}% × ${pL_given_C}% = <strong>${pInt}%</strong>.</li>
      <li>P(C|L) = P(C∩L)/P(L) = ${pInt}% / ${pL}% = <strong>${pCond}%</strong>.</li>
      <li>Interpretation: About ${pInt}% of all consumers both buy weekly coffee and use loyalty cards; among loyalty-card users, ~${pCond}% buy coffee weekly.</li>
    </ol><p><em>Reference:</em> Keller 12e — Ch. 3–4 (Probability: unions, intersections, conditional).</p>`;
  }
}

function checkQ3_midterm(){
  let u = parseFloat(document.getElementById("q3-int").value);
  let c = parseFloat(document.getElementById("q3-cond").value);
  const fb = document.getElementById("q3-feedback");
  if (isNaN(u)||isNaN(c)){ fb.textContent="Enter both values."; fb.style.color="#b91c1c"; return; }

  // allow 0–1 proportions or 0–100 percents
  if (u <= 1) u *= 100;
  if (c <= 1) c *= 100;

  const okU = Math.abs(u - state.q3m.pInt) <= 0.5;
  const okC = Math.abs(c - state.q3m.pCond) <= 0.5;
  if (okU && okC){ fb.textContent="✓ Correct."; fb.style.color="#065f46"; }
  else { fb.textContent=`Not quite. P(C∩L)≈${state.q3m.pInt}%, P(C|L)≈${state.q3m.pCond}%.`; fb.style.color="#b91c1c"; }
}

// === Q4: Two-Way Table ===
function drawQ4Table() {
  const canvas = document.getElementById("q4-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height, pad = 20;
  // Bars representing joint probabilities
  const cells = [
    { label: "A & Promoted", p: 0.12 },
    { label: "A & Not", p: 0.28 },
    { label: "B & Promoted", p: 0.18 },
    { label: "B & Not", p: 0.42 },
  ];
  const maxP = 0.42;
  const barW = (W - 2 * pad) / cells.length - 10;
  ctx.font = "12px system-ui";
  ctx.strokeStyle = "#9ca3af"; ctx.beginPath(); ctx.moveTo(pad, H - 40); ctx.lineTo(W - pad, H - 40); ctx.stroke();
  cells.forEach((c, i) => {
    const h = (H - 80) * (c.p / maxP);
    const x = pad + i * (barW + 10);
    const y = H - 40 - h;
    ctx.fillStyle = "#111";
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#111";
    ctx.fillText(c.label, x, H - 22);
    ctx.fillText(c.p.toFixed(2), x, y - 6);
  });
}

function generateQ4_midterm() {
  const probs = { Ap: 0.12, An: 0.28, Bp: 0.18, Bn: 0.42 };
  const pA = probs.Ap + probs.An; // 0.40
  const pProm = probs.Ap + probs.Bp; // 0.30
  const pProm_given_A = probs.Ap / pA; // 0.12 / 0.40 = 0.30
  state.q4m = { pA, pProm, pProm_given_A };
  const q4p = document.getElementById("q4-problem");
  if (q4p) {
    q4p.innerHTML =
      "Joint probabilities: Dept A Promoted 0.12, A Not 0.28, B Promoted 0.18, B Not 0.42.";
  }
  try { if (document.getElementById("q4-canvas")) drawQ4Table(); } catch (e) { console.warn("Q4 draw skipped:", e); }
  const q4e = document.getElementById("q4-expl");
  if (q4e) {
    q4e.innerHTML = `<ol>
      <li>P(Dept A) = 0.12 + 0.28 = <strong>${pA.toFixed(2)}</strong></li>
      <li>P(Promoted) = 0.12 + 0.18 = <strong>${pProm.toFixed(2)}</strong></li>
      <li>P(Promoted | Dept A) = 0.12 / 0.40 = <strong>${pProm_given_A.toFixed(2)}</strong></li>
    </ol><p><em>Reference:</em> Keller 12e — Ch. 3–4 (Probability tables &amp; conditional probability).</p>`;
  }
}
function checkQ4_midterm(){
  const pa = parseFloat(document.getElementById("q4-pa").value);
  const pp = parseFloat(document.getElementById("q4-pp").value);
  const pc = parseFloat(document.getElementById("q4-cond").value);
  const fb = document.getElementById("q4-feedback");
  if ([pa,pp,pc].some(isNaN)){ fb.textContent="Enter all three."; fb.style.color="#b91c1c"; return; }
  const ok1 = Math.abs(pa - state.q4m.pA) <= 0.02;
  const ok2 = Math.abs(pp - state.q4m.pProm) <= 0.02;
  const ok3 = Math.abs(pc - state.q4m.pProm_given_A) <= 0.02;
  if (ok1 && ok2 && ok3){ fb.textContent="✓ Correct."; fb.style.color="#065f46"; }
  else {
    fb.textContent=`Expected: P(A) = ${ state.q4m.pA.toFixed(2) }, P(Promoted) = ${ state.q4m.pProm.toFixed(2) }, P(Promoted | A) = ${ state.q4m.pProm_given_A.toFixed(2) }.`;
    fb.style.color="#b91c1c";
  }
}

// === Q5: Correlation vs Causation (Guidance only)
function setupQ5(){
  document.getElementById("q5-guidance").innerHTML = `<ul><li><em>Reference:</em> Keller 12e — Ch. 16 (Simple Linear Regression & Correlation).</li>
    <li><strong>Correlation ≠ Causation:</strong> Higher ad spend and sales can move together due to a third factor (market size, seasonality, pricing).</li>
    <li><strong>Alternative explanation:</strong> Regions with bigger markets both spend more and sell more.</li>
    <li><strong>Business risk:</strong> Overinvesting in ads when marginal ROI is low; misallocation of budget.</li>
    <li><strong>Better evidence:</strong> A/B experiments, holdout tests, controls for confounders, time-series with lags.</li>
  </ul>`;
}

// === Q6: Z-test (known sigma), one-sided decrease
function drawZTest(mu0, se, zObs){
  const canvas = document.getElementById("q6-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,pad=30, xMin=-4, xMax=4;
  function xToPx(x){ return pad + (x - xMin)*(W-2*pad)/(xMax-xMin); }
  function yToPx(y){ return H - pad - y*(H-2*pad); }
  // baseline
  ctx.strokeStyle="#9ca3af"; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
  // curve
  ctx.beginPath(); ctx.strokeStyle="#111"; ctx.lineWidth=2;
  let yMax = normalPDF(0,0,1);
  for(let i=0;i<=400;i++){
    const x = xMin + (i/400)*(xMax-xMin);
    const y = normalPDF(x,0,1)/yMax;
    const px = xToPx(x), py = yToPx(y);
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.stroke();
  // critical region left (alpha=0.05 one-sided): z < -1.645
  const zCrit = -1.645;
  ctx.fillStyle="rgba(220,38,38,0.18)";
  ctx.beginPath();
  ctx.moveTo(xToPx(xMin),yToPx(0)); ctx.lineTo(xToPx(zCrit),yToPx(0));
  for(let x=zCrit;x>=xMin;x-=0.02){
    const y = normalPDF(x,0,1)/yMax;
    ctx.lineTo(xToPx(x), yToPx(y));
  }
  ctx.closePath(); ctx.fill();
  // observed z line
  ctx.strokeStyle="#ef4444"; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(xToPx(zObs), yToPx(0)); ctx.lineTo(xToPx(zObs), yToPx(1)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle="#ef4444"; ctx.font="12px system-ui";
  ctx.fillText(`z = ${zObs.toFixed(2)}`, xToPx(zObs)+4, yToPx(0)+14);
  ctx.fillStyle="#111"; ctx.fillText("critical = -1.645", xToPx(zCrit)-40, yToPx(0)+14);
}

function generateQ6_midterm(){
  const mu0 = 45, sigma = 6, n = 36, xbar = 43.5;
  const se = sigma/Math.sqrt(n); // 1
  const z = (xbar - mu0)/se; // -1.5
  state.q6m = {mu0,sigma,n,xbar,se,z};
  const panel = document.getElementById("q6-soln");
  if (panel){
    // Preserve an existing canvas if it’s already in the panel
    const existingCanvas = panel.querySelector('#q6-canvas');
    const html = `<ol>
  <li>H₀: μ = 45; H₁: μ &lt; 45 (decrease).</li>
  <li>SE = σ/√n = ${sigma}/√${n} = ${se.toFixed(2)}</li>
  <li>z = (x&#772;−μ₀)/SE = (${xbar}−${mu0})/${se.toFixed(2)} = <strong>${z.toFixed(2)}</strong></li>
  <li>One-sided α=0.05 ⇒ critical z = −1.645. Since −1.50 &gt; −1.645, <strong>fail to reject H₀</strong>.</li>
  <li>p-value ≈ Φ(z)=Φ(−1.50) ≈ 0.067 &gt; 0.05.</li>
  <li><em>Assumptions:</em> SRS/independence; known σ; Normal population or n large (CLT); one-sided test at α=0.05.</li>
</ol>`;
    panel.innerHTML = html;
    if (existingCanvas) panel.appendChild(existingCanvas);
  }
  ensureCanvas('q6-canvas','q6-soln',560,180);
  try { if (document.getElementById("q6-canvas")) drawZTest(mu0, se, z); } catch(e){ console.warn("Q6 draw skipped:", e); }
}
function checkQ6_midterm(){
  const zIn = parseFloat(document.getElementById("q6-z").value);
  const dec = document.getElementById("q6-decision").value;
  const fb = document.getElementById("q6-feedback");
  if (isNaN(zIn) || !dec){ fb.textContent="Enter z and choose a decision."; fb.style.color="#b91c1c"; return; }
  const okZ = Math.abs(zIn - state.q6m.z) <= 0.1;
  const correctDecision = "fail";
  const okD = (dec === correctDecision);
  if (okZ && okD){ fb.textContent="✓ Correct."; fb.style.color="#065f46"; }
  else {
    fb.textContent=`Not quite. z≈${state.q6m.z.toFixed(2)}; decision: Fail to reject H₀.`;
    fb.style.color="#b91c1c";
  }
}

// === Q7: CI (n=50, xbar=42, s=8) — 95%
function drawCI(lo, hi, xbar, se){
  const canvas = document.getElementById("q7-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,pad=30, xMin=xbar-5, xMax=xbar+5;
  function xToPx(x){ return pad + (x - xMin)*(W-2*pad)/(xMax-xMin); }
  function y(y){ return H/2; }
  // CI line
  ctx.strokeStyle="#111"; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(xToPx(lo),H/2); ctx.lineTo(xToPx(hi),H/2); ctx.stroke();
  // Mean marker
  ctx.fillStyle="#111"; ctx.fillRect(xToPx(xbar)-1, H/2-8, 2, 16);
  // Labels
  ctx.font="12px system-ui"; ctx.fillStyle="#111";
  ctx.fillText(`Lower ${lo.toFixed(2)}`, xToPx(lo)-24, H/2-12);
  ctx.fillText(`Upper ${hi.toFixed(2)}`, xToPx(hi)-24, H/2-12);
  ctx.fillText(`x̄ = ${xbar}`, xToPx(xbar)+6, H/2+16);
}
function generateQ7_midterm(){
  const n=50, xbar=42, s=8;
  const se = s/Math.sqrt(n); // 8/sqrt(50)=1.1314
  const tstar = 2.009; // df = 49, 95%
  const lo = xbar - tstar*se;
  const hi = xbar + tstar*se;
  state.q7m={n,xbar,s,se,tstar,lo,hi};
  const steps = document.getElementById("q7-steps");
  if (steps){
    const existingCanvas = steps.querySelector('#q7-canvas');
    const html = `<ol>
      <li>SE = s/√n = ${s}/√${n} = ${se.toFixed(3)}</li>
      <li>t* (df=49, 95%) ≈ ${tstar}</li>
      <li>CI = x&#772; ± t*·SE ⇒ <strong>(${lo.toFixed(2)}, ${hi.toFixed(2)})</strong></li>
      <li>Interpretation: We are 95% confident the true mean lies in this interval.</li>
      <li><em>Assumptions:</em> SRS/independence; unknown σ ⇒ use t with df=n−1; sampling distribution approximately Normal or n large.</li>
    </ol>`;
    steps.innerHTML = html;
    if (existingCanvas) steps.insertBefore(existingCanvas, steps.firstChild);
  }
  ensureCanvas('q7-canvas','q7-steps',560,160);
  try { if (document.getElementById("q7-canvas")) drawCI(lo, hi, xbar, se); } catch(e){ console.warn("Q7 draw skipped:", e); }
}
function checkQ7_midterm(){
  const lo = parseFloat(document.getElementById("q7-lo").value);
  const hi = parseFloat(document.getElementById("q7-hi").value);
  const fb = document.getElementById("q7-feedback");
  if (isNaN(lo) || isNaN(hi)){ fb.textContent="Enter both bounds."; fb.style.color="#b91c1c"; return; }
  const ok = Math.abs(lo - state.q7m.lo) <= 0.2 && Math.abs(hi - state.q7m.hi) <= 0.2;
  if (ok){ fb.textContent="✓ Correct."; fb.style.color="#065f46"; }
  else { fb.textContent=`Expected ≈ (${state.q7m.lo.toFixed(2)}, ${state.q7m.hi.toFixed(2)}).`; fb.style.color="#b91c1c"; }
}

// === Q8: Type II error β under μ=102
function drawBeta(mu_true, se, lo, hi){
  const canvas = document.getElementById("q8-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,pad=30, xMin=94, xMax=106;
  function xToPx(x){ return pad + (x - xMin)*(W-2*pad)/(xMax-xMin); }
  function yToPx(y){ return H - pad - y*(H-2*pad); }
  // PDF under true mean
  const yMax = normalPDF(mu_true, mu_true, se);
  ctx.beginPath(); ctx.strokeStyle="#111"; ctx.lineWidth=2;
  for(let i=0;i<=400;i++){
    const x = xMin + (i/400)*(xMax-xMin);
    const y = normalPDF(x, mu_true, se)/yMax;
    const px = xToPx(x), py=yToPx(y);
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.stroke();
  // Shade acceptance region [lo, hi]
  ctx.fillStyle="rgba(17,24,39,0.15)";
  ctx.beginPath();
  ctx.moveTo(xToPx(lo), yToPx(0)); 
  for(let x=lo; x<=hi; x+=0.02){
    const y = normalPDF(x, mu_true, se)/yMax;
    ctx.lineTo(xToPx(x), yToPx(y));
  }
  ctx.lineTo(xToPx(hi), yToPx(0)); ctx.closePath(); ctx.fill();
  // Labels
  ctx.fillStyle="#111"; ctx.font="12px system-ui";
  ctx.fillText(`μ(true)=${mu_true}`, xToPx(mu_true)+6, yToPx(1)-4);
  ctx.fillText(`accept: [${lo.toFixed(2)}, ${hi.toFixed(2)}]`, xToPx(lo), yToPx(0)+14);
}
function generateQ8_midterm(){
  const mu0=100, sigma=10, n=25;
  const se = sigma/Math.sqrt(n); // 2
  const zCrit = 1.96;
  const lo = mu0 - zCrit*se; // 96.08
  const hi = mu0 + zCrit*se; // 103.92
  const mu_true = 102;
  const beta = (phi((hi-mu_true)/se) - phi((lo-mu_true)/se)); // ≈ Φ(0.96)-Φ(-2.96)
  state.q8m = {mu0,sigma,n,se,lo,hi,mu_true,beta};
  const sol = document.getElementById("q8-soln");
  if (sol){
    const existingCanvas = sol.querySelector('#q8-canvas');
    const html = `<ol>
      <li>Acceptance region for x&#772;: [${lo.toFixed(2)}, ${hi.toFixed(2)}]</li>
      <li>Under μ=102 (SE=${se.toFixed(2)}): β = Φ((hi−μ)/SE) − Φ((lo−μ)/SE) ≈ <strong>${beta.toFixed(3)}</strong></li>
      <li>Interpretation: With true mean 102, we fail to reject H₀ about ${(beta*100).toFixed(1)}% of the time.</li>
      <li><em>Assumptions:</em> Known σ; x&#772; ~ N(μ, σ/√n); two-sided z-test with |Z|&gt;1.96 at α=0.05.</li>
    </ol>`;
    sol.innerHTML = html;
    if (existingCanvas) sol.insertBefore(existingCanvas, sol.firstChild);
  }
  ensureCanvas('q8-canvas','q8-soln',560,180);
  try { if (document.getElementById("q8-canvas")) drawBeta(mu_true, se, lo, hi); } catch(e){ console.warn("Q8 draw skipped:", e); }
}
function checkQ8_midterm(){
  let b = parseFloat(document.getElementById("q8-beta").value);
  const fb = document.getElementById("q8-feedback");
  if (isNaN(b)){ fb.textContent="Enter a numeric β."; fb.style.color="#b91c1c"; return; }
  // accept 0.83 or 83
  if (b > 1.0001) b = b/100;
  const ok = Math.abs(b - state.q8m.beta) <= 0.03;
  if (ok){ fb.textContent="✓ Correct (within tolerance)."; fb.style.color="#065f46"; }
  else { fb.textContent=`Expected β ≈ ${state.q8m.beta.toFixed(3)}.`; fb.style.color="#b91c1c"; }
}

// === Q9 & Q10: Guidance only
function setupQ9(){
  document.getElementById("q9-guidance").innerHTML = `<ul>
    <li><strong>Statistical significance:</strong> Unlikely due to chance (p &lt; α) given sample size, variation.</li>
    <li><strong>Practical significance:</strong> Is the effect <em>meaningful</em> in business terms? 8.0% → 8.2% may be negligible.</li>
    <li><strong>Manager’s call:</strong> Compare lift vs cost; run pilot; check heterogeneity (which segments benefit).</li>
  </ul>`;
}
function drawQ10(){
  const canvas = document.getElementById("q10-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,pad=30;
  // Generate synthetic points with negative slope
  const pts = Array.from({length:30}, (_,i)=>{
    const x = i/29*10;
    const y = 9 - 0.5*x + (Math.random()-0.5)*1.2;
    return {x,y};
  });
  // axes
  ctx.strokeStyle="#9ca3af"; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(pad,pad); ctx.stroke();
  // points
  ctx.fillStyle="#111";
  pts.forEach(p=>{
    const px = pad + p.x*(W-2*pad)/10;
    const py = H - pad - (p.y-0)*(H-2*pad)/10;
    ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
  });
  // trend line
  ctx.strokeStyle="#111"; ctx.setLineDash([4,3]);
  ctx.beginPath();
  const x1=0,y1=9,x2=10,y2=4;
  const px1 = pad + x1*(W-2*pad)/10, py1 = H - pad - (y1)*(H-2*pad)/10;
  const px2 = pad + x2*(W-2*pad)/10, py2 = H - pad - (y2)*(H-2*pad)/10;
  ctx.moveTo(px1,py1); ctx.lineTo(px2,py2); ctx.stroke(); ctx.setLineDash([]);
}


// Integrate Midterm generators with existing app
function generateMidtermAll(){
  try { generateQ3_midterm(); } catch(e){ console.warn('Q3 gen skipped:', e); }
  try { generateQ4_midterm(); } catch(e){ console.warn('Q4 gen skipped:', e); }
  try { generateQ6_midterm(); } catch(e){ console.warn('Q6 gen skipped:', e); }
  try { generateQ7_midterm(); } catch(e){ console.warn('Q7 gen skipped:', e); }
  try { generateQ8_midterm(); } catch(e){ console.warn('Q8 gen skipped:', e); }
  try { setupQ5(); } catch(e){ console.warn('Q5 setup skipped:', e); }
  try { setupQ9(); } catch(e){ console.warn('Q9 setup skipped:', e); }
  try { if (document.getElementById('q10-canvas')) drawQ10(); } catch(e){ console.warn('Q10 draw skipped:', e); }
  try { generateEVBonus(); } catch(e){ console.warn('Bonus gen skipped:', e); }
}

// Extend existing generateNumbers (from the original app) to also regenerate midterm items
if (!window._midtermHooked){
  const _origGen = window.generateNumbers;
  window.generateNumbers = function(){
    _origGen();
    generateMidtermAll();
  };
  window._midtermHooked = true;
}

// Bind UI for new questions after DOM ready
window.addEventListener("DOMContentLoaded", ()=>{
  // Q3
  const q3c = document.getElementById("q3-check"); if(q3c) q3c.addEventListener("click", checkQ3_midterm);
  const q3s = document.getElementById("q3-show"); if(q3s) q3s.addEventListener("click", ()=>{
    document.getElementById("q3-expl").classList.toggle("hidden");
  });
  // Q4
  const q4c = document.getElementById("q4-check"); if(q4c) q4c.addEventListener("click", checkQ4_midterm);
  const q4s = document.getElementById("q4-show"); if(q4s) q4s.addEventListener("click", ()=>{
    document.getElementById("q4-expl").classList.toggle("hidden");
  });
  // Q6
const q6c = document.getElementById("q6-check"); if(q6c) q6c.addEventListener("click", checkQ6_midterm);
setupAnswerToggle("q6-show", "q6-soln", () => {
  ensureCanvas("q6-canvas", "q6-soln", 560, 180);
  try {
    drawZTest(
      state.q6m?.mu0 ?? 45,
      state.q6m?.se  ?? (6/Math.sqrt(36)),
      state.q6m?.z   ?? (-1.5)
    );
  } catch(e){}
});
  // Q7
const q7c = document.getElementById("q7-check"); if(q7c) q7c.addEventListener("click", checkQ7_midterm);
setupAnswerToggle("q7-show", "q7-steps", () => {
  ensureCanvas("q7-canvas", "q7-steps", 560, 160);
  try {
    drawCI(
      state.q7m?.lo   ?? (42 - 2.009 * (8/Math.sqrt(50))),
      state.q7m?.hi   ?? (42 + 2.009 * (8/Math.sqrt(50))),
      state.q7m?.xbar ?? 42,
      state.q7m?.se   ?? (8/Math.sqrt(50))
    );
  } catch(e){}
});
  // Q8
const q8c = document.getElementById("q8-check"); if(q8c) q8c.addEventListener("click", checkQ8_midterm);
setupAnswerToggle("q8-show", "q8-soln", () => {
  ensureCanvas("q8-canvas", "q8-soln", 560, 180);
  try {
    drawBeta(
      state.q8m?.mu_true ?? 102,
      state.q8m?.se      ?? (10/Math.sqrt(25)),
      state.q8m?.lo      ?? (100 - 1.96 * (10/Math.sqrt(25))),
      state.q8m?.hi      ?? (100 + 1.96 * (10/Math.sqrt(25)))
    );
  } catch(e){}
});
  // Q5 guidance toggle (single binding)
  const q5s = document.getElementById("q5-show");
  if (q5s) q5s.addEventListener("click", ()=> safeToggle("q5-guidance"));
// Q9 uses unified "Show answer" behavior
setupAnswerToggle("q9-show", "q9-guidance");
  // Bonus EV bindings
  const bnsC = document.getElementById("bonus-check"); if (bnsC) bnsC.addEventListener("click", checkEVBonus);
  const bnsS = document.getElementById("bonus-show"); if (bnsS) bnsS.addEventListener("click", ()=> safeToggle("bonus-work"));
});

function safeToggle(id){
  const el = document.getElementById(id);
  if (el){ el.classList.toggle("hidden"); }
}
// Generic "Show answer" toggle that flips the button label and can run a draw callback
function setupAnswerToggle(btnId, panelId, onShow) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  // Normalize default label
  btn.textContent = "Show answer";
  btn.setAttribute("data-state", "closed");

  btn.addEventListener("click", () => {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const isClosed = btn.getAttribute("data-state") !== "open";
    if (isClosed) {
      panel.classList.remove("hidden");
      try { if (typeof onShow === "function") onShow(); } catch(e){}
      btn.textContent = "Hide answer";
      btn.setAttribute("data-state", "open");
    } else {
      panel.classList.add("hidden");
      btn.textContent = "Show answer";
      btn.setAttribute("data-state", "closed");
    }
  });
}
window.addEventListener("DOMContentLoaded", ()=>{
  const binds = [
    ["q1-show-answers","q1-answer"],
    ["q2-show-explanation","q2-explanation"],
    // NOTE: Q3–Q9 have custom handlers defined above; do not bind them here.
    ["q10-show","q10-guidance"]
  ];
  binds.forEach(([btn, panel])=>{
    const b = document.getElementById(btn);
    if (b){ b.addEventListener("click", ()=> safeToggle(panel)); }
  });
});

function toggleAllSolutions(show){
  const ids = ["q1-answer","q2-explanation","q3-expl","q4-expl","q5-guidance","q6-soln","q7-steps","q8-soln","q9-guidance","q10-guidance"];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}
window.addEventListener("DOMContentLoaded", ()=>{
  const btnShow = document.getElementById("show-all");
  const btnHide = document.getElementById("hide-all");
  if (btnShow) btnShow.addEventListener("click", ()=>toggleAllSolutions(true));
  if (btnHide) btnHide.addEventListener("click", ()=>toggleAllSolutions(false));
});

function renderAllVisuals(){
  try { if (typeof drawNormalCurve==='function' && state && typeof state.mu!=='undefined') drawNormalCurve(state.mu, state.sigma, state.threshold); } catch(e){}
  try { if (typeof drawQ4Table==='function') drawQ4Table(); } catch(e){}
  try { if (typeof drawZTest==='function' && state && state.q6m) drawZTest(state.q6m.mu0, state.q6m.se, state.q6m.z); } catch(e){}
  try { if (typeof drawCI==='function' && state && state.q7m) drawCI(state.q7m.lo, state.q7m.hi, state.q7m.xbar, state.q7m.se); } catch(e){}
  try { if (typeof drawBeta==='function' && state && state.q8m) drawBeta(state.q8m.mu_true, state.q8m.se, state.q8m.lo, state.q8m.hi); } catch(e){}
  try { if (typeof drawQ10==='function') drawQ10(); } catch(e){}
}
window.addEventListener("DOMContentLoaded", ()=>{
  renderAllVisuals();
});
console.debug("midterm handlers + visuals ready");

if (!window._renderHooked){
  const _origGen2 = window.generateNumbers;
  window.generateNumbers = function(){
    _origGen2();
    // Generate midterm content if available
    if (typeof generateMidtermAll==='function') generateMidtermAll();
    renderAllVisuals();
  };
  window._renderHooked = true;
}

function checkQ5_mcq(){
  const fb = document.getElementById("q5-feedback");
  const a = document.querySelector('input[name="q5a"]:checked');
  const b = document.getElementById("q5b").value;
  const c = document.getElementById("q5c").value;
  let ok = true;
  if (!a || a.value!=="no") ok=false;
  if (!(b==="market" || b==="reverse")) ok=false;
  if (c!=="overspend") ok=false;
  if (ok){ fb.textContent = "✓ Correct: correlation ≠ causation; alt: market size or reverse causality; risk: overspending without lift."; fb.style.color="#065f46"; }
  else { fb.textContent = "Not quite. Choose: (No), (Bigger markets OR Reverse causality), (Overspend risk)."; fb.style.color="#b91c1c"; }
}

