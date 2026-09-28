// QuantRehab x Arc — demo flow: assessment -> intelligence -> provider -> USDC payment -> Arc settlement.
// Health answers stay in browser memory only. Only the USDC payment touches Arc.
import {
  createWalletClient, createPublicClient, custom, http, formatUnits, parseUnits,
} from "https://esm.sh/viem@2.21.0";
import { CONFIG } from "./config.js";

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] },
];

const arcTestnet = {
  id: CONFIG.CHAIN_ID,
  name: CONFIG.CHAIN_NAME,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.RPC_URL] } },
  blockExplorers: { default: { name: "Arc Explorer", url: CONFIG.EXPLORER_URL } },
};

const $ = (id) => document.getElementById(id);
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
let account = null;
let walletClient = null;
let recommendation = CONFIG.SERVICE_NAME;

// ---------- screens ----------
function show(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $("s-" + name).classList.remove("hidden");
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-go]").forEach((b) =>
  b.addEventListener("click", () => show(b.dataset.go))
);
$("startBtn").addEventListener("click", () => show("assess"));
$("toServiceBtn").addEventListener("click", () => show("pay"));

function addRow(parent, label, value) {
  const r = document.createElement("div");
  r.className = "row";
  const l = document.createElement("span");
  l.className = "label";
  l.textContent = label;
  const v = document.createElement("span");
  v.className = "value";
  v.textContent = value;
  r.append(l, v);
  parent.append(r);
}

// ---------- assessment ----------
const form = $("form");

$("demoFill").addEventListener("click", () => {
  const demo = {
    bodyRegion: "Knee", onset: "Gradual", painLevel: "4",
    aggravating: "Downhill running, stairs", relieving: "Rest",
    sport: "Running", frequency: "4", loadChange: "Increased recently",
    technique: "Switched to new running shoes", sleep: "6", recovery: "Fair",
    previousInjury: "",
  };
  Object.entries(demo).forEach(([k, v]) => {
    if (form.elements[k]) form.elements[k].value = v;
  });
  form.elements.painLevel.nextElementSibling.textContent = "4";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form).entries());

  const flags = ["flag_trauma", "flag_night", "flag_neuro", "flag_systemic", "flag_saddle"];
  if (flags.some((f) => d[f] === "on")) {
    show("redflag");
    return;
  }

  // Transparent, rule-based demo mapping (research-stage, NOT validated, no probabilities).
  const sleep = d.sleep ? Number(d.sleep) : null;
  const factors = [
    ["Training-load factor", d.loadChange === "Increased recently" ? "Identified (reported load increase)" : "Not reported"],
    ["Technique / mechanical factor", (d.technique || "").trim() ? "Reported" : "Not reported"],
    ["Recovery factor",
      d.recovery === "Poor" || (sleep !== null && sleep < 6) ? "Identified"
      : d.recovery === "Fair" || (sleep !== null && sleep < 7) ? "Possible"
      : "Not reported"],
    ["Previous-injury factor", (d.previousInjury || "").trim() ? "Reported" : "Not reported"],
  ];

  const evidence = $("evidenceBox");
  evidence.replaceChildren();
  addRow(evidence, "Sport", d.sport);
  addRow(evidence, "Region", d.bodyRegion);
  addRow(evidence, "Onset", d.onset);
  addRow(evidence, "Pain", `${d.painLevel} / 10`);
  addRow(evidence, "Sessions/week", d.frequency || "—");
  addRow(evidence, "Load change", d.loadChange || "—");
  addRow(evidence, "Recovery", d.recovery || "—");

  const fb = $("factorBox");
  fb.replaceChildren();
  factors.forEach(([l, v]) => addRow(fb, l, v));

  const sportPart = d.sport === "Other" ? "Sport-specific" : d.sport + "-focused";
  recommendation = `${sportPart} physiotherapy assessment (${d.bodyRegion.toLowerCase()})`;
  $("recoText").textContent = recommendation;
  show("intel");
});

// ---------- payment ----------
$("providerName").textContent = CONFIG.PROVIDER_NAME;
$("serviceName").textContent = CONFIG.SERVICE_NAME;
$("priceValue").textContent = `${CONFIG.PRICE_USDC} USDC`;
$("networkValue").textContent = CONFIG.CHAIN_NAME;

function setStatus(msg, kind = "") {
  $("status").textContent = msg;
  $("status").className = "status " + kind;
}

async function ensureArcNetwork() {
  const current = String(await window.ethereum.request({ method: "eth_chainId" }));
  if (current.toLowerCase() === CONFIG.CHAIN_ID_HEX.toLowerCase()) return;
  setStatus("Switching wallet to Arc Testnet...");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.CHAIN_ID_HEX,
          chainName: CONFIG.CHAIN_NAME,
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: [CONFIG.RPC_URL],
          blockExplorerUrls: [CONFIG.EXPLORER_URL],
        }],
      });
    } else {
      throw err;
    }
  }
}

async function refreshBalance() {
  const raw = await publicClient.readContract({
    address: CONFIG.USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [account],
  });
  const bal = formatUnits(raw, CONFIG.USDC_DECIMALS);
  $("walletBalance").textContent = `${bal} USDC`;
  return Number(bal);
}

$("connectBtn").addEventListener("click", async () => {
  if (!window.ethereum) {
    setStatus("No wallet found. Open this page in a wallet browser (e.g. MetaMask) and try again.", "error");
    return;
  }
  try {
    setStatus("Requesting wallet connection...");
    walletClient = createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum) });
    [account] = await walletClient.requestAddresses();
    await ensureArcNetwork();
    await refreshBalance();
    $("walletAddress").textContent = account;
    $("walletSection").classList.remove("hidden");
    $("connectBtn").classList.add("hidden");
    $("payBtn").classList.remove("hidden");
    setStatus("Wallet connected on Arc Testnet.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Connection failed: " + (err.shortMessage || err.message), "error");
  }
});

$("payBtn").addEventListener("click", async () => {
  $("payBtn").disabled = true;
  try {
    await ensureArcNetwork();
    setStatus("Checking USDC balance...");
    const bal = await refreshBalance();
    if (bal < CONFIG.PRICE_USDC) {
      throw new Error(`Insufficient balance. You have ${bal} USDC, need ${CONFIG.PRICE_USDC}.`);
    }
    setStatus("Please confirm the transaction in your wallet...");
    const hash = await walletClient.writeContract({
      account, address: CONFIG.USDC_ADDRESS, abi: ERC20_ABI, functionName: "transfer",
      args: [CONFIG.PROVIDER_WALLET_ADDRESS, parseUnits(String(CONFIG.PRICE_USDC), CONFIG.USDC_DECIMALS)],
    });
    setStatus("Submitted. Waiting for Arc confirmation...\n" + hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.");

    $("doneProvider").textContent = CONFIG.PROVIDER_NAME;
    $("doneService").textContent = recommendation;
    $("txHash").textContent = hash;
    $("txLink").href = `${CONFIG.EXPLORER_URL}/tx/${hash}`;
    show("done");
  } catch (err) {
    console.error(err);
    setStatus("Payment failed: " + (err.shortMessage || err.message), "error");
  } finally {
    $("payBtn").disabled = false;
  }
});
