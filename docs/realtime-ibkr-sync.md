# Design doc — Real-time IBKR trade sync

**Status:** Proposed · **Owner:** Marwan · **Date:** 2026-06-18

Goal: a trade should appear in Cuequill **within seconds of the fill**,
not on the nightly Flex cron. This document scopes what that actually
takes, because it is a much larger change than the current sync — it
needs infrastructure Cuequill does not have today.

---

## 1. Why this isn't a small change

Today's sync uses the **IBKR Flex Web Service** (`src/lib/ibkrSync.ts`):

- It is a **batch reporting** API — you request a statement, poll until
  it's generated, parse the CSV.
- It is **rate-limited to ~1 request / 15 min per query**.
- It has **no event/webhook** — IBKR never pushes to you. There is no
  "a trade just happened" signal anywhere in Flex.

So real-time is not a tweak to the existing path. It requires a
**different IBKR API** *and* a **process that stays connected**, which a
serverless Vercel deployment (where the Next.js app + cron live) cannot
host — serverless functions are short-lived and can't hold an open
socket or a long-lived authenticated session.

---

## 2. The two IBKR APIs that expose fills in real time

### Option A — TWS API (socket to IB Gateway / TWS)

- Connect over a socket to a running **IB Gateway** (headless) or **TWS**
  (desktop). Default ports: Gateway `4001` live / `4002` paper, TWS
  `7496` / `7497`.
- Subscribe with `reqExecutions`; IBKR fires:
  - `execDetails` — one callback **per fill**, in real time, while the
    session is up.
  - `commissionReport` — the matching commission for each fill (arrives
    a moment after the exec).
- Libraries: `ib_insync` / `ibapi` (Python, most mature) or
  `@stoqey/ib` (TypeScript).
- **Requires Gateway running and logged in.** IBKR forces a **daily
  re-login** and **2FA via IBKR Mobile**. Automating restarts needs
  **IBC** (IB Controller) and a 2FA strategy.

### Option B — Client Portal Web API (CPAPI)

- REST + **WebSocket** via a **Client Portal Gateway** (a Java process
  you run) or IBKR's **OAuth 1.0a** program for hosted access.
- Relevant endpoints:
  - `GET /iserver/account/trades` — executions from the last ~7 days
    (poll every few seconds), or
  - WebSocket subscription for order/PnL updates.
  - `POST /tickle` — keepalive; the session dies without it.
- Still needs a **persistent host** for the gateway and **periodic
  re-auth** (2FA on login).

**Recommendation:** **Option A (IB Gateway + TWS API)** for a single
trader. `execDetails` + `commissionReport` is the cleanest real-time fill
feed IBKR offers, and `ib_insync` makes it a few lines. Option B only
wins if you specifically want to avoid the desktop Gateway, and it isn't
actually less infrastructure.

---

## 3. The multi-tenant problem (read this before committing)

IBKR's real-time APIs are built around **one authenticated session per
IBKR account**, gated behind a desktop login + 2FA. That has a sharp
consequence for Cuequill as a *product*:

- **Single user (you, self-hosted):** very feasible. One Gateway logged
  into your account, one worker. This is the realistic near-term target.
- **Many users (SaaS):** each user's account needs its own authenticated
  Gateway session. The only sanctioned ways are:
  1. Each user **self-hosts** their own Gateway + worker (unrealistic for
     most customers), or
  2. Cuequill joins IBKR's **OAuth / third-party access** program (a
     formal application, heavier compliance).

The Flex token model used today is the *only* thing IBKR offers that is
truly headless and multi-account-friendly for a third party without
their OAuth program. **This is the core reason the product defaults to
Flex.** Real-time should therefore be positioned first as a
**self-hosted / power-user** capability, not a flip-a-switch SaaS
feature.

---

## 4. Proposed architecture (Option A, single-tenant first)

```
┌─────────────────┐   socket    ┌──────────────────────┐
│  IB Gateway     │◀───────────▶│  cuequill-sync worker │
│  (always on,    │  execDetails│  (always-on Node/Py   │
│   logged in)    │  commission │   process on a VPS)   │
└─────────────────┘             └───────────┬──────────┘
                                            │ writes fills + matched trades
                                            ▼
                                   ┌──────────────────┐
                                   │  MongoDB (shared) │◀── Next.js app reads
                                   └──────────────────┘         (as today)
```

### New always-on worker service (separate repo/deploy)

- Host: a small **always-on container/VM** — Fly.io, Railway, Render
  background worker, or a cheap VPS. **Not Vercel.**
- Runs alongside (or supervises, via **IBC**) the IB Gateway.
- On `execDetails` + `commissionReport`:
  1. Persist the **raw fill** to a new `ibkrFills` collection (idempotent
     on `execId`, which IBKR guarantees unique per fill).
  2. Run the **FIFO matcher** to build/close `Trade` documents.
  3. Write to the **same MongoDB** the app already uses.

### Refactor to share logic with the existing sync

The FIFO open-queue matching in `ibkrSync.ts` (lines ~165–257) is good
and must not be duplicated. Extract it into a pure function:

```ts
// src/lib/ibkr/match.ts
export function matchFills(fills: NormalizedFill[]): TradeDraft[]
```

Both the nightly Flex path **and** the real-time worker call
`matchFills`. The dedupe guarantees already in place carry over:

- `Trade.ibkrTradeId` (sparse unique) — extend the convention to store
  `execId` so a fill can never double-insert.
- The natural-key multiset dedupe still protects against manual-entry
  overlap.

Real-time fills arrive **one at a time**, so matching must be
**incremental**: keep the per-contract open lots in `ibkrFills` (or a
small `openLots` collection) and match each new sell against stored buys,
rather than re-grouping a whole CSV each run.

### Getting it to the browser live (optional polish)

The trades table already uses React Query. Cheapest win: **refetch on
focus + a short interval** while the market is open. For true push, add
an **SSE endpoint** (`/api/ibkr/stream`) the worker notifies via a
MongoDB change stream → the client revalidates. Do this only after the
worker is solid.

---

## 5. Data model changes

- **New `ibkrFills` collection:** `{ execId (unique), userID, conId,
  symbol, right, strike, expiry, side, qty, price, commission, taxes,
  time, matched: bool }`. The durable raw record; the matcher is
  re-runnable from it.
- **`Trade`:** reuse `ibkrTradeId` to also hold the close `execId`
  (`<buyExecId>-<sellExecId>`), mirroring today's `<buyTradeId>-<sellTradeId>`.
- **`User`:** add `ibkrRealtimeEnabled: bool` and `ibkrGatewayStatus`
  (`connected | disconnected | reauth_required | error`) + `lastHeartbeat`
  so the UI can show a live "connected" pill and nudge re-auth.

---

## 6. Security & reliability

- The worker holds **live brokerage credentials** — it must live in a
  hardened, access-controlled host, secrets in a vault, never in the
  Next.js bundle or the repo.
- **Re-auth / 2FA:** plan for the daily Gateway re-login. IBC can restart
  it; 2FA still needs a strategy (IBKR Mobile approval, or a second-factor
  device exemption). Surface `reauth_required` in the app.
- **Reconnect/backfill:** on worker restart or socket drop, run a Flex
  (or `reqExecutions` history) **backfill** so no fill is lost during
  downtime. The `execId` idempotency makes this safe.
- **Heartbeat & alerting:** if no heartbeat for N minutes during market
  hours, alert — silent real-time failure is worse than a known nightly
  cron.

---

## 7. Cost

- Always-on worker + Gateway: roughly **$5–15/mo** on a small VPS / Fly
  machine (Gateway wants ~1–2 GB RAM).
- Engineering: the worker + matcher refactor + reconnect/backfill +
  re-auth handling is the bulk of the work; the UI bits are small.

---

## 8. Phased plan

1. **Refactor** `matchFills` out of `ibkrSync.ts`; cover with unit tests
   against current CSV fixtures (no behaviour change — proves parity).
2. **Worker spike:** `ib_insync`/`@stoqey/ib` against a **paper** account;
   log `execDetails` + `commissionReport`; confirm fields map cleanly.
3. **Persist fills** to `ibkrFills` (idempotent on `execId`); run
   incremental `matchFills`; write `Trade`s to a dev DB.
4. **Reconnect + backfill** on startup; **heartbeat** to `User`.
5. **App surface:** "Real-time connected" pill, `reauth_required` nudge,
   live refetch on the trades table.
6. **(If SaaS later)** evaluate IBKR OAuth / third-party access for
   multi-tenant, or ship this as a documented **self-hosted** add-on.

---

## 9. Recommendation

Build it **single-tenant / self-hosted first** — it's genuinely useful
for you immediately and proves the worker + matcher. Treat multi-tenant
real-time as a later, separate decision gated on IBKR's OAuth program,
and keep **Flex intraday polling** (every ~15 min) as the supported path
for everyone else, since it needs no extra infrastructure.
