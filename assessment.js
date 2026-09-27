// ============================================================
// QuantRehab — Assessment page logic
// Gated behind a successful payment (checked via sessionStorage
// set by app.js on the payment page). No backend in this PoC —
// the "submitted" data is only shown back to the user, not stored.
// ============================================================

const views = {
  locked: document.getElementById("lockedView"),
  redFlag: document.getElementById("redFlagView"),
  done: document.getElementById("doneView"),
  form: document.getElementById("assessmentForm"),
};

function showOnly(view) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  view.classList.remove("hidden");
}

// --- Gate: must have a verified payment in this browser tab/session ---
const paid = sessionStorage.getItem("quantrehab_payment_verified") === "true";

if (!paid) {
  showOnly(views.locked);
} else {
  showOnly(views.form);
}

views.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(views.form).entries());

  const redFlagFields = [
    "flag_trauma",
    "flag_night",
    "flag_neuro",
    "flag_systemic",
    "flag_saddle",
  ];
  const anyRedFlag = redFlagFields.some((f) => data[f] === "on");

  if (anyRedFlag) {
    showOnly(views.redFlag);
    return;
  }

  // Build a plain-language summary of what was captured.
  const rows = [
    ["Body region", data.bodyRegion],
    ["Onset", data.onset],
    ["Pain level", `${data.painLevel} / 10`],
    ["Aggravating factors", data.aggravating || "—"],
    ["Relieving factors", data.relieving || "—"],
    ["Sport", data.sport],
    ["Training frequency", data.frequency ? `${data.frequency} sessions/week` : "—"],
    ["Recent load change", data.loadChange || "—"],
    ["Technique notes", data.technique || "—"],
    ["Sleep", data.sleep ? `${data.sleep} hrs/night` : "—"],
    ["Recovery quality", data.recovery || "—"],
    ["Previous injury", data.previousInjury || "—"],
    ["Movement notes", data.selfTestNotes || "—"],
    ["Payment tx", sessionStorage.getItem("quantrehab_payment_tx") || "—"],
  ];

  const summaryBox = document.getElementById("summaryBox");
  summaryBox.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`
    )
    .join("");

  showOnly(views.done);
});
