// ============================================================
// QuantRehab — Assessment page logic
// Gated behind a REAL, on-chain verified payment.
//
// The payment page links here as assessment.html?tx=0x...
// We fetch that transaction's receipt directly from Arc Testnet
// and confirm it was a successful USDC transfer of at least the
// consultation price to the configured provider wallet. This is
// far more reliable on mobile than trusting sessionStorage, which
// can be lost on cache clears, tab switches, or wallet-app
// redirects. sessionStorage is still used as a same-tab shortcut
// so re-visiting the page doesn't re-check the chain every time.
// ============================================================

import {
  createPublicClient,
  http,
  decodeEventLog,
  parseUnits,
} from "https://esm.sh/viem@2.21.0";

import { CONFIG } from "./config.js";

const publicClient = createPublicClient({
  transport: http(CONFIG.RPC_URL),
});

const TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
];

const views = {
  checking: document.getElementById("checkingView"),
  locked: document.getElementById("lockedView"),
  redFlag: document.getElementById("redFlagView"),
  done: document.getElementById("doneView"),
  form: document.getElementById("assessmentForm"),
};

function showOnly(view) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  view.classList.remove("hidden");
}

// Checks a transaction hash directly against Arc Testnet: it must have
// succeeded and include a USDC Transfer of at least the price to the
// provider wallet.
async function verifyTxOnChain(txHash) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  if (!receipt || receipt.status !== "success") {
    return false;
  }

  const requiredAmount = parseUnits(String(CONFIG.PRICE_USDC), CONFIG.USDC_DECIMALS);

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: TRANSFER_EVENT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (
        decoded.eventName === "Transfer" &&
        decoded.args.to.toLowerCase() === CONFIG.PROVIDER_WALLET_ADDRESS.toLowerCase() &&
        decoded.args.value >= requiredAmount
      ) {
        return true;
      }
    } catch {
      // Not a Transfer log we can decode — skip it.
    }
  }

  return false;
}

async function checkAccess() {
  const params = new URLSearchParams(window.location.search);
  const txHash = params.get("tx");

  // Fast path: already verified this session, no need to hit the chain again.
  if (!txHash && sessionStorage.getItem("quantrehab_payment_verified") === "true") {
    return true;
  }

  if (!txHash) {
    return false;
  }

  try {
    const ok = await verifyTxOnChain(txHash);
    if (ok) {
      sessionStorage.setItem("quantrehab_payment_verified", "true");
      sessionStorage.setItem("quantrehab_payment_tx", txHash);
    }
    return ok;
  } catch (err) {
    console.error("Payment verification failed:", err);
    return false;
  }
}

(async () => {
  showOnly(views.checking);
  const allowed = await checkAccess();
  showOnly(allowed ? views.form : views.locked);
})();

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
    
