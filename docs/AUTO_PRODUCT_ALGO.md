1 — Goals (requirements)

Primary objective: allocate the wave budget (dollars) across products to maximize believable, quality-weighted revenue for companies.

Never place a unit purchase where price > $50,000.

Favor medium-priced items (and medium-expensive), reduce share for very high-priced items.

Be fair, avoid exploitability (price manipulation, self-sells, collusion).

Minimize Convex bandwidth: reduce total reads, reduce write frequency and transaction size, batch operations, use snapshots/caching and cheap prefilters.

Provide robust logging, idempotency and easy audit/rollback.

2 — Inputs & data model (fields to read from Convex)

Minimize fields read. For each product read only the minimal required fields and use efficient precomputed materialized fields where possible.

Product record (minimum fields):

productId

companyId

price (in integer cents)

qualityRating (0..1)

stockAvailable (integer, or null for unlimited)

createdAt, lastUpdatedAt

totalSold (or recentSalesCount window)

isActive / isArchived

category / tags (optional, pre-hashed)

maxPerOrder (optional)

Company record (minimum fields):

companyId

reputationScore (0..1)

balance (integer cents)

flaggedStatus (bool / small enum)

Optional / materialized indices (to reduce scans):

candidateProductsIndex (list of productIds flagged for purchase waves — updated asynchronously)

priceHistogram or priceSummary per category (for computing medians without scanning entire catalog)

recentSalesSummary (sliding window per product) — precomputed periodically so wave reads few fields

productPenaltyFlags (binary flags for fast exclusion)

Global config (stored in small record):

globalBudgetPerWave, caps, thresholds, seed, tuning params

Telemetry log (append-only): write only once per executed purchase (see writes section).

3 — High-level pipeline (low-bandwidth, revenue-first)

Begin wave: scheduler obtains waveId and budget from config.

Load a small candidate set (cheap): read candidateProductsIndex (precomputed) or fetch a sampled set (top N by recent activity) instead of scanning whole products table.

Prefilter cheaply using small fields and in-memory heuristics (client-side): exclude archived, zero-stock, flagged. Compute summary statistics (median log-price, std) using precomputed price summaries when possible.

Pull detailed fields only for the filtered candidate set (e.g., top 1,000). Keep reads minimal: only the fields in Section 2.

Compute normalized scores and penalties in memory (TypeScript agent), producing rawAttractiveness per product.

Allocate dollars across products (desired spend per product) — revenue-first allocation.

Plan orders (quantity per product) given price and stock. Convert spends → tentative orders.

Compact execution plan: group orders into as few Convex transactions as possible while preserving atomicity guarantees (see Convex notes).

Execute grouped transactions with verification (price & stock). On partial failures, collect leftovers and perform small reallocation passes.

Write minimal updates per successful order: stock decrement, company balance credit, sale record append. Batch writes where safe.

Append telemetry for auditing (one small append per order or per batch).

Post-wave: update candidateProductsIndex or materialized summaries asynchronously as a background job (not in-wave) to avoid heavy writes.

4 — Scoring (revenue-attractiveness) — formula overview

We compute a normalized rawAttractiveness_p ∈ [0, 1] for each product p:

Components:

q = qualityRating ∈ [0,1].

demandScore = normalized recent sales (from recentSalesSummary).

recencyScore = decays with age.

companyScore = reputationScore (capped).

pricePreferenceScore = peak-at-medium-price bell (described below).

unitPricePenalty = multiplicative penalty that declines allocation as price grows.

combinedPenalty = anti-exploit flags compressed into a single scalar (0 no penalty → 1 block).

Compute:

base = w_q*q + w_pricePref*pricePreferenceScore + w_demand*demandScore + w_company*companyScore + w_recency*recencyScore.

rawAttractiveness = base * unitPricePenalty * (1 - combinedPenalty).

Keep rawAttractiveness in [0,1] (clamp).

Parameter suggestions (starting):

w_q = 0.40, w_pricePref = 0.20, w_demand = 0.20, w_company = 0.10, w_recency = 0.05 (sum < 1 — normalize in implementation).

Keep small randomness seedable for reproducibility.

4.1 Price preference (bell) — medium-prices favored

Work in log-price space to handle multiplicative price ranges:

logPrice = ln(price_in_cents + ε).

Compute medianLogPrice and stdLogPrice using precomputed histograms per candidate set or a small sample; avoid scanning all products.

Convert to z-score: priceZ = (logPrice - medianLogPrice) / stdLogPrice.

Use Gaussian bell centered at μ = -0.2 to bias slightly cheaper than median:

pricePreferenceScore = exp( - (priceZ - μ)^2 / (2 * σ^2) ) with σ ≈ 0.9.

Normalize pricePreferenceScore so max→1 across candidate set (optional).

4.2 Unit price penalty — reduce share as price increases

unitPricePenalty = 1 / (1 + (price / P_scale)^beta), where price is in dollars (or normalized).

Example P_scale = 5000, beta = 1.2 — these cause stronger penalty above several thousand dollars while not zeroing mid-range pricey but reasonable items.

This multiplicative factor ensures very high-priced products get much less allocation.

4.3 Combined penalty (exploit defenses)

Combine discrete flags (priceOutlierFlag, rapidCreationFlag, selfSellFlag, suspiciousStockFlag) into combinedPenalty using 1 - Π(1 - p_i) so multiple penalties compound.

Some flags may immediately set penalty ≈ 1 (blocked).

5 — Revenue allocation (primary change)

Allocate dollars (not quantities) as the first-class decision.

Steps:

Compute S = Σ rawAttractiveness_p across eligible products.

desiredSpend_p = (rawAttractiveness_p / S) * globalBudget.

Clamp: desiredSpend_p = clamp(desiredSpend_p, minSpendPerProduct, maxSpendPerProduct).

Example: minSpendPerProduct = $5, maxSpendPerProduct = min($globalBudget * 0.05, $25,000).

Convert to tentative quantity:

quantity_p = min( floor(desiredSpend_p / price_p), stockAvailableOrCap, productMaxPerOrder ).

actualSpend_p = quantity_p * price_p.

If actualSpend_p < desiredSpend_p (stock or caps), compute leftover L = desiredSpend_p - actualSpend_p.

Reallocate leftover L proportionally to remaining rawAttractiveness (excluding saturated products). Repeat until budget spent or no feasible recipients remain (iterative redistribution).

Keep budget and allocations in smallest currency unit (cents) to avoid floating errors.

6 — Execution plan & Convex bandwidth minimization

Design execution to minimize DB operations and avoid large numbers of tiny transactions.

Key strategies:

Plan in-memory first: do all scoring & allocation outside Convex, using only candidate reads (narrow).

Bulk verification step: before committing, do a single multi-read (per batch) to verify price and stock for the selected productIds. Use Convex to fetch only current price, stockAvailable, lastUpdatedAt.

Group writes by company where possible: execute purchases in grouped transactions that update multiple products and the company balance in one atomic Convex transaction. Grouping reduces transactions but ensure groups stay small to limit contention.

Batch size: choose batch sizes that balance throughput and lock contention (e.g., 10–50 orders per transaction depending on Convex performance).

Idempotency: attach a unique waveId + planHash + productId idempotency key for each planned purchase to prevent duplicate application on retries.

Optimistic verification & retry limits: For each transaction, verify stock and price; if verification fails, retry up to maxRetries with exponential backoff. Do not retry entire wave — only the failing batch.

Minimal writes:

For each successful purchase write: decrement stockAvailable (single integer write), append a condensed sale record (or increment totalSold and append a small audit entry), credit company.balance. Prefer increment operations rather than rewriting large objects.

Prefer aggregated company balance updates (sum per company in the wave) and apply one update per company rather than many small updates.

Append-only telemetry: write one small telemetry record per purchase or per grouped batch — kept minimal to reduce I/O.

Asynchronous materialized updates: expensive derived tables and indices (e.g., candidateProductsIndex, price histograms, recent sales summary) are updated asynchronously by background workers, not during the wave.

7 — Convex transaction design (practical pattern)

Transaction pre-check: read relevant price, stockAvailable, lastUpdatedAt for items in batch.

Compute deltas in-memory; verify constraints.

Commit transaction that atomically:

decrement multiple stockAvailable fields,

increment company.balance by aggregated batch amount,

increment per-product totalSold,

write a compact batch sale record (list of productId, qty, price, buyerId simulated).

Keep transactions compact (no heavy reads/joins inside transaction).

If transaction fails due to concurrency, the agent re-reads only the affected product fields and recomputes necessary reallocation (not re-scoring whole catalog).

8 — Anti-exploit rules (detailed)

Implement a layered defense, with many checks made cheaply before any DB writes.

Cheap prefilter checks (no heavy reads):

Exclude isArchived or flaggedStatus.

Price eligibility: exclude if price > 50,000 (hard block).

Exclude price == 0 unless platform allows donations (special-case).

Exclude products with productPenaltyFlags set (precomputed offline).

In-memory/edge checks (on candidate set):

Price-outlier detection: if price > medianPrice * OUTLIER_MULTIPLIER (e.g., 50×), apply heavy penalty or block unless sustained sales history exists.

Rapid creation hold: products created < newProductHold (e.g., 60 min) have limited spend allocations.

Stock manipulation: if stockAvailable is extremely large relative to historical norms or company balance, cap effective stock for allocation.

Self-sell detection: if owner of product equals any buyer identity used by the simulation (company-linked buyer accounts, shared ownerId), set penalty high or block.

Price spike detection: if price changed by > Y% in last T minutes, block or heavily penalize unless sales history prior to change justifies it.

Duplication & category spam: if a company has many near-identical listings created recently, reduce their companyScore temporarily.

Refund/chargeback heuristic: if company has high recent refund rates, reduce companyScore.

If any severe suspicious pattern detected (self-sell loop, collusion pattern), block purchases for those entities and flag for human review.

9 — Fairness & revenue levers

Primary bias: quality (w_q) is high so companies investing in quality earn more.

Price preference bell encourages medium-priced items. Unit price penalty reduces share for expensive items.

Per-company daily spend cap prevents a single company consuming too much budget.

Per-product max spend avoids a lone product monopolizing the wave.

Ensure buys derive from many simulated buyers: model buyer distribution when converting desiredSpend to quantity, but the buyer simulation is internal and need not be persisted in DB for bandwidth reasons — only store final buyerId per order (or a small hash).

10 — Edge cases (comprehensive) — and how to handle them

(A) Price & product edge cases

price <= 0: block large purchases; optionally buy a single unit if donation flows are desired.

price > $50,000: exclude by default; flag for ops if needed.

Extremely low price (e.g., $0.01): enforce minSpendPerProduct so algorithm does not buy millions of units; cap quantity to maxQuantityPerOrder.

Price changed between planning and execution: re-verify in pre-commit check; if price changed > 5%, recompute that product’s allocation or abort it and reallocate remaining funds.

Multi-currency: normalize to base currency in materialized field before wave (offline).

(B) Stock & availability
6. stockAvailable = 0: skip.
7. stock = unlimited (null): treat as capped by maxUnitsPerOrder and per-product spend cap.
8. Partial fills: if only part of planned quantity available, accept partial, compute actualSpend, reallocate leftover immediately.

(C) Exploit scenarios
9. Self-purchase / Sybil: block buys where buyer → company owner mapping detected; track links offline for quick flag checks.
10. Rapid create + price spam: apply newProductHold and price spike penalty.
11. Collusion / circular buys: detect loops in recent purchase graphs and block/reduce allocations.
12. Refund manipulation: if refund rate > threshold, freeze company purchases and flag.

(D) Numeric & system edge cases
13. Rounding / precision: use integer cents for all math.
14. Tiny leftover budget: if leftover < minSpendPerProduct keep as platform retained funds.
15. Large candidate catalog: sample or use candidateProductsIndex; don't read all product records every wave.
16. Wave concurrency: waves have unique IDs. If multiple waves run concurrently, ensure idempotency keys and per-product locks are small and local to batches to avoid global locks.

(E) DB bandwidth-specific edge cases
17. Very large product count: use indexed materialized candidateProductsIndex; precompute medians/histograms asynchronously.
18. Frequent waves: if waves are frequent, throttle waves or adaptively change globalBudget to keep DB usage in budget.
19. Failure mid-wave: keep small, atomic batch commits and a compact failure-recovery plan (reallocate only leftover funds).

11 — Logging, monitoring & auditing (minimal DB cost)

Telemetry per batch (rather than per unit): append a small structure per executed batch: { waveId, timestamp, companyId, totalSpent, items: [{productId, qty, price}], batchId }.

Sparse audit records: keep detailed logs only for flagged events. For normal purchases store compact batch records; expand details in separate archival storage if needed.

Key metrics (aggregate): % budget spent, spend per company, top N products by spend, flagged events. Compute aggregates asynchronously in background jobs (not during waves).

12 — Parameter defaults (revenue-first)

globalBudget: configurable by ops (start conservative).

price hard cap: $50,000.

minSpendPerProduct: $5.

maxSpendPerProduct: min(globalBudget * 0.05, $25,000).

perCompanySpendCap: min(globalBudget * 0.10, companyBalance * 0.5).

newProductHold: 60 minutes.

outlierMultiplier: 50.

P_scale (unitPricePenalty): $5,000, beta = 1.2.

price bell: μ = -0.2 (z-units), σ = 0.9.

batch size for Convex transactions: tune between 10–50 orders per transaction.

13 — Tests & QA scenarios (what to run)

Write these as plain-English test cases for CI:

Functional revenue behavior

Medium-price favoritism: create equal-quality products at low ($10), medium ($200), high ($8,000) prices — wave should allocate more spend to medium-range.

$50k cap test: items at $49,999 should be eligible; items at $50,001 must be excluded.

MaxSpendPerProduct: ensure one product cannot consume > configured max.

Reallocation: top product runs out mid-wave; leftover budget should reallocate to next products.

Exploit/defense tests

Price spike: change price of product by 500% < 1 minute before wave — ensure heavy penalty/block.

Self-sell: link buyer account to selling company → algorithm must not route purchases to that company.

Duplicate listings: company creates thousands of identical items — algorithm should cap company influence.

Scale & bandwidth tests

Large catalog: simulate 1M products but maintain candidate index of 5k — verify wave reads only candidate set.

Batching & transactions: run many waves concurrently and measure Convex read/write counts; ensure batched writes minimize calls.

Edge & numeric tests

Tiny leftover handling: final remainder < $5 should be retained by platform.

Price change during commit: if price changes between pre-check and commit, ensure transaction aborts and leftover reallocation occurs.

14 — Governance & manual controls

Admin UI flags: allow ops to blacklist products/companies, adjust globalBudget, toggle newProductHold.

Human review queue: wave-flagged suspicious events are pushed to a queue (not blocking normal waves).

Parameter override logs: any manual override should be logged with operator id.

15 — Learning & tuning (low-bandwidth approach)

Collect minimal telemetry and ship to an offline analytics pipeline (S3-like) for heavy analysis.

Use A/B waves (small fraction of waves) to test parameter changes, but keep A/B small to limit DB overhead.

Use simple bandit or hill-climb over weeks (not every wave) to tune P_scale, beta, and weights.

16 — Implementation checklist (functions / responsibilities)

(Compact list the AI agent or dev should implement; keep DB operations minimal)

prepareWave(waveId): read global config and candidateProductsIndex (small).

fetchCandidates(candidateIds): bulk read minimal product fields.

computeSummaries(candidates): compute medianLogPrice, std — use precomputed histogram where possible.

scoreProducts(candidates): compute rawAttractiveness (in-memory).

allocateBudget(rawAttractiveness[], globalBudget): produce desiredSpend per product and tentative quantities.

compactPlan(allocations): group into batch transactions by company (small groups).

verifyAndExecuteBatches(batches): for each batch, multi-read current price/stock, commit grouped transaction, handle partial failures and reallocate leftovers.

writeTelemetry(compactedBatches): append small batch-level telemetry records.

asyncPostWaveUpdates(waveId): trigger background jobs to update materialized indices and summaries (async).

17 — Final tradeoffs / notes

Revenue-first increases potential value to companies but elevates risk if per-product price or stock is manipulated — therefore quotas, holds, and penalties are heavier by design.

Minimizing Convex bandwidth requires careful architectural tradeoffs: maintain small, precomputed indices, do most heavy work in-memory, batch writes, and push heavy summarization to asynchronous workers.

Deterministic reproducibility is possible by seeding the random generator with waveId; log seeds for debugging.