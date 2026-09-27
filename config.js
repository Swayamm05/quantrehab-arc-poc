// ============================================================
// QuantRehab x Arc — Configuration
// This file holds PUBLIC configuration only.
// Never put a private key in this file or anywhere in the frontend.
// ============================================================

export const CONFIG = {
  // The wallet that should RECEIVE the 5 USDC payment.
  // This is a public address (like a bank account number) — safe to expose.
  // Replace this with your Wallet B address (the one you already tested with).
  PROVIDER_WALLET_ADDRESS: "0x9204bF9d48aeD503Ce7f360aCAc707d4780B8C26",

  PROVIDER_NAME: "QuantRehab Test Provider",
  SERVICE_NAME: "Initial MSK Physiotherapy Consultation",
  PRICE_USDC: 5,

  // Arc Testnet network parameters (from official Arc docs)
  CHAIN_ID: 5042002,
  CHAIN_ID_HEX: "0x4CEF52",
  CHAIN_NAME: "Arc Testnet",
  RPC_URL: "https://rpc.testnet.arc.network",
  EXPLORER_URL: "https://testnet.arcscan.app",

  // USDC ERC-20 contract on Arc Testnet (6 decimals)
  USDC_ADDRESS: "0x3600000000000000000000000000000000000000",
  USDC_DECIMALS: 6,
};
