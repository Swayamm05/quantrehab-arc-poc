// ============================================================
// QuantRehab x Arc — Payment page logic
// Uses viem (loaded from a CDN, no install needed) to talk to
// the connected wallet (e.g. MetaMask) and to Arc Testnet.
// ============================================================

import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  formatUnits,
  parseUnits,
} from "https://esm.sh/viem@2.21.0";

import { CONFIG } from "./config.js";

// Minimal ERC-20 ABI — only the functions we actually need.
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

// Arc Testnet chain definition for viem
const arcTestnet = {
  id: CONFIG.CHAIN_ID,
  name: CONFIG.CHAIN_NAME,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [CONFIG.RPC_URL] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: CONFIG.EXPLORER_URL },
  },
};

// --- DOM elements ---
const els = {
  connectBtn: document.getElementById("connectBtn"),
  payBtn: document.getElementById("payBtn"),
  walletSection: document.getElementById("walletSection"),
  walletAddress: document.getElementById("walletAddress"),
  walletBalance: document.getElementById("walletBalance"),
  status: document.getElementById("status"),
  resultSection: document.getElementById("resultSection"),
  txHash: document.getElementById("txHash"),
  txLink: document.getElementById("txLink"),
};

let account = null;
let publicClient = null;
let walletClient = null;

// Read-only client for checking balances etc — always talks to Arc RPC directly.
publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

function setStatus(message, kind = "") {
  els.status.textContent = message;
  els.status.className = "status " + kind;
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus(
      "No wallet found. Please install MetaMask (metamask.io) and reload this page.",
      "error"
    );
    return;
  }

  try {
    setStatus("Requesting wallet connection...");

    walletClient = createWalletClient({
      chain: arcTestnet,
      transport: custom(window.ethereum),
    });

    const [address] = await walletClient.requestAddresses();
    account = address;

    await ensureArcNetwork();
    await refreshBalance();

    els.walletAddress.textContent = account;
    els.walletSection.classList.remove("hidden");
    els.connectBtn.classList.add("hidden");
    els.payBtn.classList.remove("hidden");
    setStatus("Wallet connected on Arc Testnet.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Connection failed: " + (err.shortMessage || err.message), "error");
  }
}

// Make sure the wallet is switched to Arc Testnet, adding it if needed.
async function ensureArcNetwork() {
  const currentChainIdHex = await window.ethereum.request({ method: "eth_chainId" });

  if (currentChainIdHex.toLowerCase() === CONFIG.CHAIN_ID_HEX.toLowerCase()) {
    return;
  }

  setStatus("Switching wallet to Arc Testnet...");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // 4902 = the chain has not been added to the wallet yet
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CONFIG.CHAIN_ID_HEX,
            chainName: CONFIG.CHAIN_NAME,
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
            rpcUrls: [CONFIG.RPC_URL],
            blockExplorerUrls: [CONFIG.EXPLORER_URL],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

async function refreshBalance() {
  const balanceRaw = await publicClient.readContract({
    address: CONFIG.USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  });

  const balance = formatUnits(balanceRaw, CONFIG.USDC_DECIMALS);
  els.walletBalance.textContent = `${balance} USDC`;
  return Number(balance);
}

async function payNow() {
  els.payBtn.disabled = true;
  els.resultSection.classList.add("hidden");

  try {
    if (!account) {
      throw new Error("Connect your wallet first.");
    }

    if (
      !CONFIG.PROVIDER_WALLET_ADDRESS ||
      CONFIG.PROVIDER_WALLET_ADDRESS.includes("PUT_YOUR")
    ) {
      throw new Error(
        "Provider wallet address is not configured yet. Edit config.js."
      );
    }

    setStatus("Checking network...");
    await ensureArcNetwork();

    setStatus("Checking USDC balance...");
    const balance = await refreshBalance();

    if (balance < CONFIG.PRICE_USDC) {
      throw new Error(
        `Insufficient balance. You have ${balance} USDC, need ${CONFIG.PRICE_USDC} USDC.`
      );
    }

    const amount = parseUnits(String(CONFIG.PRICE_USDC), CONFIG.USDC_DECIMALS);

    setStatus("Please confirm the transaction in your wallet...");

    const hash = await walletClient.writeContract({
      account,
      address: CONFIG.USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [CONFIG.PROVIDER_WALLET_ADDRESS, amount],
    });

    setStatus("Transaction submitted. Waiting for confirmation...\n" + hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== "success") {
      throw new Error("Transaction failed on-chain.");
    }

    setStatus("Payment successful!", "success");
    els.txHash.textContent = hash;
    els.txLink.href = `${CONFIG.EXPLORER_URL}/tx/${hash}`;
    els.resultSection.classList.remove("hidden");

    await refreshBalance();
  } catch (err) {
    console.error(err);
    setStatus("Payment failed: " + (err.shortMessage || err.message), "error");
  } finally {
    els.payBtn.disabled = false;
  }
}

els.connectBtn.addEventListener("click", connectWallet);
els.payBtn.addEventListener("click", payNow);

// Fill in the static config values on page load.
document.getElementById("providerName").textContent = CONFIG.PROVIDER_NAME;
document.getElementById("serviceName").textContent = CONFIG.SERVICE_NAME;
document.getElementById("priceValue").textContent = `${CONFIG.PRICE_USDC} USDC`;
document.getElementById("networkValue").textContent = CONFIG.CHAIN_NAME;
