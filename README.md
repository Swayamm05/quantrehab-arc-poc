# QuantRehab × Arc — Stage 1 Prototype

**What this repository is:** a minimal proof of concept for one narrow slice of QuantRehab —
wallet-based USDC payment on Arc, followed by a structured MSK intake and a research-stage
"QuantRehab Intelligence" screen. Built for the Arc Microgrant program. It is a demo, not
the product.

**Flow:** Home → Provider & USDC payment → Arc settlement confirmation → MSK assessment →
QuantRehab Intelligence (evidence profile + contributing factors + recommended next step) →
What's Next (roadmap). The assessment is reached only after a confirmed on-chain payment.

**What QuantRehab actually is:** a sport-specific musculoskeletal (MSK) clinical-intelligence
platform. The core idea: general-purpose AI can reason about an injury, but only if the person
already knows what information matters. QuantRehab instead systematically acquires the right
evidence — symptoms, sport, training load, technique, recovery, self-administered physical
tests, red-flag safety screening — and only then applies structured, source-traceable clinical
reasoning (partial Bayesian likelihood-ratio updating) to produce a ranked differential and
contributing-factor analysis, not a fabricated diagnosis.

## Why this matters beyond a questionnaire

The moat isn't "we use AI." It's controlling the evidence-acquisition pipeline: structured
intake + sport-specific context + clinical reasoning + a longitudinal, consented outcome
dataset. That combination is harder to copy than a UI or a generic risk score.

## Roadmap

| Stage | Focus |
|---|---|
| **1 — this repo** | Clinical foundation: structured assessment, reasoning-engine architecture, physiotherapist agreement research, Arc-based payment/settlement rail |
| **2** | Commercialization: academies, clubs, physiotherapists, corporates, early API pilots |
| **3** | Full ecosystem: athlete app, verified physiotherapist marketplace, bookings, events, academy/corporate dashboards, public API |
| **4** | Economic layer, only once real utility and network effects exist — professional credentials, reputation, marketplace incentives |

Crypto is deliberately the *last* layer, not the premise. Arc's role here is economic
infrastructure (USDC settlement between athlete, provider, and eventually agents acting on
their behalf) — sensitive health data itself stays off-chain.

## What this prototype does *not* claim

QuantRehab does not currently generate validated diagnostic probabilities, and this repo does
not either. The assessment page records structured intake and states plainly that its
reasoning engine isn't connected yet — that honesty is intentional, not a limitation to hide.

## This repo

- `index.html` — the full demo: home, payment, settlement, assessment, intelligence, roadmap, and vision screens, all in one page
- `app.js` — payment logic (viem + Arc Testnet) and the screen-to-screen flow
- `config.js` — public configuration: provider wallet, price, Arc network parameters
- `style.css` — shared styling

