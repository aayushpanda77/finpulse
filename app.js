// ==========================================
// FinPulse — User-Friendly Smart Loan & Credit Checker (Extej FinTech Theme)
// Author: Ayush Panda
// ==========================================

const PRESETS = {
  prime: {
    title: "● Safe Borrower Profile",
    params: { income: 92000, loan: 18000, dti: 16, util: 22, history: 8.5, delinq: 0 }
  },
  starter: {
    title: "● New Earner Profile",
    params: { income: 64000, loan: 20000, dti: 28, util: 38, history: 3.5, delinq: 0 }
  },
  stretched: {
    title: "● Average User (High Card Bills)",
    params: { income: 54000, loan: 28000, dti: 43, util: 76, history: 4.0, delinq: 1 }
  },
  distressed: {
    title: "● Risky User (Missed Payments)",
    params: { income: 36000, loan: 32000, dti: 54, util: 89, history: 1.5, delinq: 3 }
  }
};

let state = { ...PRESETS.prime.params };
let stressShock = false;

function evaluateCredit(p) {
  const dti = stressShock ? Math.min(62, p.dti + 6) : p.dti;
  const util = stressShock ? Math.min(95, p.util + 8) : p.util;
  const loanToIncome = (p.loan / p.income) * 100;

  // How much each item helps (< 0) or hurts (> 0) compared to an average person
  const shap = {
    income: Number((-((p.income - 65000) / 10000) * 1.45).toFixed(2)),
    dti: Number(((dti - 24) * 0.68).toFixed(2)),
    util: Number(((util - 34) * 0.39).toFixed(2)),
    loan: Number(((loanToIncome - 25) * 0.42).toFixed(2)),
    history: Number((-((p.history - 5.0) * 1.35)).toFixed(2)),
    delinq: Number((p.delinq * 11.2).toFixed(2))
  };

  const netShift =
    shap.income + shap.dti + shap.util + shap.loan + shap.history + shap.delinq;
  const rawProb = 18.0 + netShift;
  const prob = Number(Math.max(1.4, Math.min(95.8, rawProb)).toFixed(1));
  const repayConfidence = Number((100 - prob).toFixed(1));

  const creditScore = Math.max(320, Math.min(850, Math.round(835 - prob * 5.4)));
  const apr = Number((5.25 + prob * 0.23 + (stressShock ? 2.0 : 0)).toFixed(2));
  const monthlyRate = apr / 100 / 12;
  const emi = Math.round((p.loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -36)));
  const totalInterest = Math.max(0, emi * 36 - p.loan);

  // Safe loan limit
  const dtiHeadroom = Math.max(0.18, (64 - dti) / 100);
  const safeLimit = Math.round((p.income * dtiHeadroom * 0.82) / 500) * 500;
  const safetyMargin = safeLimit - p.loan;

  const rows = [
    {
      name: "Yearly Income (Money you earn)",
      val: `$${p.income.toLocaleString()} / yr`,
      shap: shap.income,
      bench: "$65,000+ is comfortable",
      flagged: p.income < 45000
    },
    {
      name: "Monthly Bills % (Rent & EMIs vs Income)",
      val: `${dti}% of income`,
      shap: shap.dti,
      bench: "Keep under 35%",
      flagged: dti >= 36
    },
    {
      name: "Credit Card Used % (Balance vs Limit)",
      val: `${util}% used`,
      shap: shap.util,
      bench: "Keep under 30%",
      flagged: util >= 45
    },
    {
      name: "Loan Amount Needed",
      val: `$${p.loan.toLocaleString()}`,
      shap: shap.loan,
      bench: "Less than 35% of yearly pay",
      flagged: p.loan / p.income > 0.42
    },
    {
      name: "Years Using Credit",
      val: `${p.history} years`,
      shap: shap.history,
      bench: "4+ years of history",
      flagged: p.history < 2.5
    },
    {
      name: "Missed Payments (Past 2 Years)",
      val: p.delinq === 0 ? "None (0)" : `${p.delinq} missed`,
      shap: shap.delinq,
      bench: "0 missed payments",
      flagged: p.delinq >= 1
    }
  ];

  const flaggedCount = rows.filter((r) => r.flagged).length;
  const tier =
    prob < 18 ? "Easy Approval" : prob < 42 ? "Medium Risk" : "Hard to Approve";

  const rateLabel =
    apr < 8.5 ? "Low Interest" : apr < 14.0 ? "Medium Interest" : "High Interest";

  return {
    prob,
    repayConfidence,
    netShift: Number(netShift.toFixed(1)),
    creditScore,
    apr,
    rateLabel,
    emi,
    totalInterest,
    safeLimit,
    safetyMargin,
    flaggedCount,
    tier,
    rows
  };
}

// Render Extej-Style Orange Area Spline Chart with Blue Vertical Indicator Pin
function renderOrangeTrajectoryChart(evalRes) {
  const svg = document.getElementById("trajectorySvg");
  const w = 920;
  const h = 230;
  const bottomY = 198;

  // Generate 36 realistic trajectory points shaped like the Extej chart
  const basePattern = [
    0.72, 0.74, 0.71, 0.76, 0.48, 0.42, 0.51, 0.81, 0.85, 0.76,
    0.66, 0.69, 0.65, 0.67, 0.63, 0.66, 0.64, 0.67, 0.62, 0.65,
    0.63, 0.64, 0.61, 0.59, 0.62, 0.56, 0.58, 0.24, 0.29, 0.27,
    0.18, 0.23, 0.21, 0.26, 0.24, 0.29
  ];

  const riskFactor = (evalRes.prob - 6.8) / 100;
  const pts = basePattern.map((normY, i) => {
    const x = 16 + (i / (basePattern.length - 1)) * (w - 32);
    const shifted = Math.max(0.12, Math.min(0.88, normY + riskFactor * 0.32));
    const y = 18 + shifted * (bottomY - 26);
    return { x, y };
  });

  const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${pts[0].x.toFixed(1)},${bottomY} ${linePoints} ${pts[pts.length - 1].x.toFixed(1)},${bottomY}`;

  // Pin at index 27 (where the sharp step-up happens, matching the Extej screenshot!)
  const pinPt = pts[27];

  const timeLabels = [
    { x: 55, text: "Month 1" },
    { x: 255, text: "Month 9" },
    { x: 465, text: "Month 18" },
    { x: 675, text: "Month 27" },
    { x: 870, text: "Month 36" }
  ];

  svg.innerHTML = `
    <defs>
      <linearGradient id="extejOrangeFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f7882f" stop-opacity="0.26" />
        <stop offset="85%" stop-color="#f7882f" stop-opacity="0.03" />
        <stop offset="100%" stop-color="#f7882f" stop-opacity="0.0" />
      </linearGradient>
    </defs>

    <!-- Bottom baseline -->
    <line x1="16" y1="${bottomY}" x2="${w - 16}" y2="${bottomY}" stroke="#edf0f7" stroke-width="1.2" />

    <!-- Soft Orange Area Fill -->
    <polygon points="${areaPoints}" fill="url(#extejOrangeFill)" />

    <!-- Crisp Orange Line Stroke -->
    <polyline fill="none" stroke="#f7882f" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="${linePoints}" />

    <!-- Blue Vertical Pin Line (Extej Screenshot Style) -->
    <line x1="${pinPt.x.toFixed(1)}" y1="${pinPt.y.toFixed(1)}" x2="${pinPt.x.toFixed(1)}" y2="${bottomY}" stroke="#4c84ff" stroke-width="1.8" />
    <circle cx="${pinPt.x.toFixed(1)}" cy="${pinPt.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#4c84ff" stroke-width="2.4" />

    <!-- X-Axis Labels -->
    ${timeLabels
      .map(
        (t) =>
          `<text x="${t.x}" y="${h - 8}" text-anchor="middle" fill="#949cb0" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="600">${t.text}</text>`
      )
      .join("")}
  `;

  // Update floating tooltip box
  document.getElementById("ttConfidenceVal").textContent = `$${evalRes.safeLimit.toLocaleString()}.00`;
  document.getElementById("ttDeltaVal").textContent = `${evalRes.repayConfidence}% Safe`;
}

function renderShapTable(evalRes) {
  const query = document.getElementById("globalSearchInput").value.trim().toLowerCase();
  const tbody = document.getElementById("shapTableBody");

  const filtered = evalRes.rows.filter(
    (r) => !query || r.name.toLowerCase().includes(query) || r.val.toLowerCase().includes(query)
  );

  tbody.innerHTML = filtered
    .map((r) => {
      const impactBadge =
        r.shap <= 0
          ? `<span class="shap-badge-good">Helps Approval (+${Math.abs(r.shap).toFixed(1)}%)</span>`
          : `<span class="shap-badge-bad">Adds Risk (-${r.shap.toFixed(1)}%)</span>`;

      const statusPill = r.flagged
        ? `<span class="shap-badge-bad">Needs Attention !</span>`
        : `<span class="shap-badge-good">Looks Good ✓</span>`;

      return `
        <tr>
          <td>${r.name}</td>
          <td style="font-family: var(--font-mono);">${r.val}</td>
          <td>${impactBadge}</td>
          <td style="color: var(--text-muted);">${r.bench}</td>
          <td>${statusPill}</td>
        </tr>
      `;
    })
    .join("");
}

function syncSliders() {
  document.getElementById("inputIncome").value = state.income;
  document.getElementById("inputLoan").value = state.loan;
  document.getElementById("inputDti").value = state.dti;
  document.getElementById("inputUtil").value = state.util;
  document.getElementById("inputHistory").value = state.history;
  document.getElementById("inputDelinq").value = state.delinq;

  document.getElementById("valIncome").textContent = `$${state.income.toLocaleString()}`;
  document.getElementById("valLoan").textContent = `$${state.loan.toLocaleString()}`;
  document.getElementById("valDti").textContent = `${state.dti}%`;
  document.getElementById("valUtil").textContent = `${state.util}%`;
  document.getElementById("valHistory").textContent = `${state.history} yrs`;
  document.getElementById("valDelinq").textContent = String(state.delinq);
}

function updateDashboard() {
  syncSliders();
  const res = evaluateCredit(state);

  // Card 1: Safe Loan Limit
  document.getElementById("kpiSafeLimit").textContent = `$${res.safeLimit.toLocaleString()}.00`;
  const marginSign = res.safetyMargin >= 0 ? "+" : "-";
  document.getElementById("kpiSafetyMargin").textContent = `${marginSign}$${Math.abs(res.safetyMargin).toLocaleString()}.00`;
  document.getElementById("kpiRepayPct").textContent = `${res.repayConfidence}% Safe`;

  // Update 4-color segmented bar widths dynamically
  const wInc = Math.min(55, Math.max(20, Math.round((state.income / 220000) * 55)));
  const wDti = Math.min(35, Math.max(10, Math.round((state.dti / 62) * 35)));
  const wUtil = Math.min(30, Math.max(10, Math.round((state.util / 95) * 30)));
  const wHist = Math.max(8, 100 - wInc - wDti - wUtil);
  document.getElementById("segIncome").style.width = `${wInc}%`;
  document.getElementById("segDti").style.width = `${wDti}%`;
  document.getElementById("segUtil").style.width = `${wUtil}%`;
  document.getElementById("segHist").style.width = `${wHist}%`;

  // Card 2: Credit Score & Approval Chance
  document.getElementById("kpiCreditScore").textContent = `${res.creditScore} / 850`;
  document.getElementById("kpiDefaultProb").textContent = `Risk of Late Pay: ${res.prob}%`;
  document.getElementById("kpiTierBadge").textContent = res.tier;

  const compareLabel = document.getElementById("kpiCompareLabel");
  if (res.netShift <= 0) {
    if (compareLabel) compareLabel.textContent = "Safer than average person";
    document.getElementById("kpiShapShift").textContent = `+${Math.abs(res.netShift)}% Safer`;
  } else {
    if (compareLabel) compareLabel.textContent = "Higher risk than average";
    document.getElementById("kpiShapShift").textContent = `+${res.netShift}% Riskier`;
  }
  document.getElementById("kpiFlaggedCount").textContent = `${res.flaggedCount} / 6 Warnings`;

  // Card 3: Monthly Payment (EMI)
  document.getElementById("kpiMonthlyEmi").textContent = `$${res.emi.toLocaleString()} / mo`;
  document.getElementById("kpiTotalLoan").textContent = `Loan Needed: $${state.loan.toLocaleString()}`;
  document.getElementById("kpiAprRate").textContent = `Interest = ${res.apr}%`;
  document.getElementById("kpiTotalInterest").textContent = `+$${res.totalInterest.toLocaleString()}.00`;
  document.getElementById("kpiSpreadPct").textContent = res.rateLabel;

  // Card 1 in Bottom Row dynamic telemetry
  document.getElementById("card1Pd").textContent = `${res.prob}%`;

  renderOrangeTrajectoryChart(res);
  renderShapTable(res);
}

function applyPreset(presetKey) {
  const found = PRESETS[presetKey];
  if (!found) return;
  state = { ...found.params };
  document.getElementById("activeScenarioBadge").textContent = found.title;
  updateDashboard();
}

function randomizeBorrower() {
  state = {
    income: Math.round((32000 + Math.random() * 160000) / 2000) * 2000,
    loan: Math.round((6000 + Math.random() * 50000) / 1000) * 1000,
    dti: Math.round(8 + Math.random() * 48),
    util: Math.round(6 + Math.random() * 82),
    history: Number((1 + Math.round(Math.random() * 32) * 0.5).toFixed(1)),
    delinq: Math.random() > 0.72 ? Math.floor(1 + Math.random() * 3) : 0
  };
  document.getElementById("activeScenarioBadge").textContent = "● Random Person Profile";
  updateDashboard();
}

function exportJsonReport() {
  const res = evaluateCredit(state);
  const blob = new Blob([JSON.stringify({ personDetails: state, loanResult: res }, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finpulse-loan-summary.json";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  const bindSlider = (id, key) => {
    document.getElementById(id).addEventListener("input", (e) => {
      state[key] = Number(e.target.value);
      document.getElementById("activeScenarioBadge").textContent = "● Your Custom Numbers";
      updateDashboard();
    });
  };

  bindSlider("inputIncome", "income");
  bindSlider("inputLoan", "loan");
  bindSlider("inputDti", "dti");
  bindSlider("inputUtil", "util");
  bindSlider("inputHistory", "history");
  bindSlider("inputDelinq", "delinq");

  document.querySelectorAll("[data-preset]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-preset");
      if (el.classList.contains("nav-item")) {
        document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n === el));
      }
      if (el.classList.contains("tf-pill")) {
        document.querySelectorAll(".tf-pill").forEach((t) => t.classList.toggle("active", t === el));
      }
      if (el.classList.contains("fintech-card")) {
        document
          .querySelectorAll(".fintech-card")
          .forEach((c) => c.classList.toggle("active-fintech-card", c === el));
      }
      applyPreset(key);
    });
  });

  document.getElementById("randomBorrowerSlot").addEventListener("click", randomizeBorrower);
  document.getElementById("addSimulationBtn").addEventListener("click", randomizeBorrower);
  document.getElementById("tfRandomBtn").addEventListener("click", randomizeBorrower);
  document.getElementById("resetBtn").addEventListener("click", () => applyPreset("prime"));
  document.getElementById("tfResetBtn").addEventListener("click", () => applyPreset("prime"));

  document.getElementById("stressActionBtn").addEventListener("click", (e) => {
    stressShock = !stressShock;
    e.currentTarget.textContent = stressShock ? "Rate +2% ON" : "Test +2% Rate";
    updateDashboard();
  });

  document.getElementById("stressToggleSwitch").addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("active");
    document.body.classList.toggle("dark-mode");
  });

  document.getElementById("exportJsonBtn").addEventListener("click", exportJsonReport);
  document.getElementById("exportActionBtn").addEventListener("click", exportJsonReport);
  document.getElementById("globalSearchInput").addEventListener("input", updateDashboard);

  const navShap = document.getElementById("navScrollShap");
  if (navShap) {
    navShap.addEventListener("click", () => {
      document.getElementById("shapSection").scrollIntoView({ behavior: "smooth" });
    });
  }

  updateDashboard();
});
