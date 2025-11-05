Quickbuck Stock Market Algorithm — Spec
Goals (what this design must achieve)

Produce realistic, explainable valuations (fundamentals-driven) while allowing short-term price dynamics from order flow.

Auto-update whole market every 5 minutes (game tick).

Avoid exploitability (no infinite-money pumps, no wash trade loop).

Support many companies, market makers, retail / algo traders, and news events.

Tuneable parameters so you can bias “growthy tech” vs “stable utility” companies.

High-level architecture

Fundamental model (slow-moving, updated per tick): computes each company’s fundamental market cap using revenue/earnings, multiples, growth, and sentiment.

Order flow simulator (per tick): generates buy/sell orders from agents (retail, institutions, market makers, insiders, bots).

Price formation engine (per tick): matches orders against an order book or uses price impact function to derive trades & new market price.

Post-trade updates (per tick): update realized volumes, implied volatility, liquidity, market cap, and record history.

Anti-exploit & constraints module: enforces caps, fees, and detection rules.

Everything runs once per tick (every 5 minutes). You can run intra-tick microsteps if you want sub-minute realism, but keep the visible updates every 5 minutes.

Key concepts & data model

Each company C stores:

revenue_annual (latest yearly revenue, USD)

ebitda_annual (optional)

profit_margin (%)

growth_rate (annualized %)

sector (growth vs value)

fundamental_multiple (baseline revenue or earnings multiple)

shares_outstanding (integer)

market_cap (derived)

price (derived)

liquidity_score (0..1)

volatility_est (annualized)

sentiment (-1..1)

news_score (short-term modifier)

last_tick_timestamp

Player-visible:

price shown, market_cap, volume_5min, 52w_high, 52w_low.

Fundamental valuation formula (core)

We want valuations that make sense: MarketCap ≈ Revenue × RevenueMultiple, with modifiers. Example target: $150,000,000 revenue → $1,000,000,000 market cap. Show arithmetic:

revenue_annual = $150,000,000.

Choose baseline revenue multiple M_base = 6.6666667 (approx).
Multiply: MarketCap = revenue_annual × M_base.
Step-by-step:

150,000,000 × 6 = 900,000,000

150,000,000 × 0.6666667 ≈ 100,000,000 (precisely 150,000,000 × 2/3 = 100,000,000)

Sum = 900,000,000 + 100,000,000 = 1,000,000,000 → $1B.

If using earnings/EBITDA instead, equivalent formula: MarketCap = EBITDA × EV/EBITDA_multiple.

Full fundamental market cap formula:
M_base = lookup_base_multiple(sector, company_size)
multiple = M_base × (1 + growth_factor + margin_factor + sentiment_factor) × (1 + news_score)
fundamental_market_cap = revenue_annual × multiple


Where:

growth_factor = f_growth(growth_rate) e.g. 0.5 × normalized_growth (bounded)

margin_factor = f_margin(profit_margin)

sentiment_factor = clamp(sentiment * 0.2, -0.4, +0.6) (tunable)

news_score is short-term fractional multiplier (±20% cap).

Examples of M_base:

Mature value company: 1.0–3.0

Mid-sized steady: 3.0–6.0

High-growth tech: 6.0–20.0

Share price calculation
price = fundamental_market_cap / shares_outstanding


If you want price to be human-friendly, round to 2 decimal places and enforce tick size (e.g., $0.01 or $0.05 depending on price level).

Example
If fundamental_market_cap = $1,000,000,000 and shares_outstanding = 100,000,000:

price = 1,000,000,000 / 100,000,000 = $10.00 per share.

Arithmetic shown digit-by-digit:

1,000,000,000 ÷ 100,000,000 = 10.

Short-term price formation (how trades move price)

We blend fundamentals with order-driven price movement. On each tick:

Compute V_fund = fundamental_market_cap.

Simulate order flow: aggregate buy_volume B and sell_volume S (shares).

Compute net order imbalance I = (B - S) / (B + S + ε) (range -1..1).

Compute price impact: impact_pct = λ * I * (1 / liquidity_factor), where λ is base sensitivity (e.g., 0.5% per imbalance unit), and liquidity_factor scales by company liquidity and market cap (higher market cap = lower impact).

Target price before mean-reversion: price_targ = price_prev × (1 + impact_pct).

Mean reversion toward fundamental: price_new = price_targ * (1 - α) + price_fundamental * α, where α is reversion weight per tick (small, e.g., 0.05–0.2).

Add stochastic noise via geometric Brownian step: price_new *= exp(σ_tick * Z) where Z ~ Normal(0,1) and σ_tick = annual_volatility * sqrt(5min/1year).

Set ε = tiny number to avoid division by zero. Enforce price bounds (no negative prices), and minimum tick rounding.

Order book or aggregated matching?

You can implement either:

Full order book (limit orders, matching) — more realistic & complex.

Aggregated matching — simpler: simulate net buy/sell and apply a price impact function (sufficient for game).

Recommendation: start with aggregated matching for server scale; implement a simplified limit-book for high-fidelity later.

Agents (order flow generators)

Create a diverse set of agents to produce realistic order flow:

Retail traders — tendency to follow momentum & sentiment, noisy, small orders.

Behavior: 60% small buy/sell, 40% occasional large buy based on news.

Institutional funds — base on fundamentals, slower to trade, larger sizes, reduce exploitation.

Behavior: compare price to fundamental, trade towards fundamental gradually.

Market makers — keep spreads, provide liquidity, rebalance inventory; profit from spread and rebates.

Algo traders — momentum, mean-reversion, arbitrage between related tickers.

Insiders / corporate actions — large trades when corporate events occur (IPOs, buybacks).

Bots / manipulators — for adversary testing (should be rate-limited).

Each agent type has tunable parameters: order frequency, typical order size distribution, sensitivity to news, latency, capital limits.

Liquidity & volatility modeling

liquidity_score (0..1) derived from market_cap, shares_outstanding, and a sector liquidity factor.

Price impact inversely proportional to liquidity.

Volatility: maintain volatility_est as EWMA of tick returns. Convert annual vol to per-tick as needed.

Example annual vol → tick vol conversion:

For 5-minute ticks, there are N = 252 trading days × 6.5 hours/day × 12 ticks/hour = 252 × 6.5 × 12 ≈ 19656 ticks/year (approx). Simpler: σ_tick = σ_annual / sqrt(N). Use a more conservative number if market hours differ.

News & events

Each tick, randomly select whether a company gets a news_event with prob based on company size.

News types: positive earnings beat, guidance up/down, partnership, product launch, scandal, regulatory fine.

Each news provides news_score (e.g., +0.05 to +0.5) applied to multiple or sentiment for short-term (1–48 ticks) effects.

Larger companies: smaller magnitude but lower frequency; small caps: larger swings but more frequent.

Corporate actions

IPOs: initialize shares_outstanding, set initial market_cap via IPO pricing algorithm (based on fundamentals plus initial demand).

Buybacks: reduce shares, increase price via supply shock.

Secondary issuance: increase shares, dilute existing holders.

Dividends: minor effect on fundamentals and investor types.

Anti-exploit rules

Order size caps: limit single order to max_pct_of_float (e.g., 2% of free float), daily limits.

Market impact & slippage: large orders face increasing price impact to prevent price manipulation.

Wash trade detection: detect accounts that alternate buy/sell the same shares to generate fake volume; flag and penalize (fees, cancel trades).

Latency & throttling: cap orders per account per minute.

Insider event locks: during corporate action windows, restrict certain trades or apply larger spreads to reduce arbitrage.

Margin & capital constraints: orders only executed if agent has funds / collateral.

Anti-roundtrip fee: processing fees applied to large frequent trades to disincentivize gaming.

Fees & economics

Trading fee per trade: fixed + percentage (tunable). Fees dampen wash trading exploits.

Market maker rebates: small rebate to encourage liquidity provision.

Transaction taxes for very short-term flips (optional).

Five-minute update loop (detailed step-by-step)

Run every 5 minutes for all tickers:

Tick start — stamp t.

Update fundamentals:

Recompute fundamental_market_cap per company using revenue, growth, sentiment, news modifiers.

Compute fundamental_price = market_cap / shares_outstanding.

Generate news:

With probability p_news(company), spawn news_event → update news_score and sentiment.

Agent order generation:

For each agent, sample whether it places an order this tick. Generate order with type (market/limit), side, size.

Compute aggregate B and S per company.

Compute imbalance: I = (B - S) / (B + S + ε).

Price impact computation:

impact_pct = λ * I / liquidity_adjustment.

price_targ = price_prev * (1 + impact_pct).

Mean reversion to fundamental:

price_after_reversion = price_targ * (1 - α) + fundamental_price * α.

Add stochastic movement:

price_new = price_after_reversion * exp(σ_tick * Z).

Execute trades:

Determine number of shares executed limited by liquidity and order book depth (or use a slippage model).

Apply fees and update agents’ balances/positions.

Update derived metrics:

market_cap = price_new × shares_outstanding

Update EWMA volatility, liquidity_score, 52wk high/low, volumes.

Record tick: persist price, volume, news, and metric snapshots.

Enforce constraints: round price to tick size, enforce price floor/ceil, cancel suspicious trades.

No external waiting — all done synchronously within the tick.

Parameters (defaults & suggestions)

General:

tick_interval = 5 minutes

α (reversion) = 0.08 (8% reversion per tick)

λ (impact scale) = 0.025 (2.5% per full imbalance in base liquidity)

ε = 1e-6

max_order_size_pct_of_float = 0.02 (2%)

transaction_fee = $0.01 + 0.02% per trade

market_hours = 09:30–16:00 (or 24/7 for fictional markets)

N_ticks_per_year ≈ 19656 (for volatility scaling) — tune to your market-hours model.

Liquidity scaling:

liquidity_adjustment = (market_cap / 1e8)^0.5 × (1 / liquidity_score) — so larger market caps are harder to move.

Volatility:

Initial σ_annual defaults by sector: utility 20%, tech 60%, crypto-like 120% (game choice).

Agent defaults:

Retail count: high, small size distribution (lognormal, median 100 shares).

Institutions: fewer, larger sizes (median several thousands).

Market makers: present on every ticker with spread base = 0.01% + 0.02 / sqrt(liquidity_score).

Example: Full worked example (numbers + arithmetic)

Company A

revenue_annual = $150,000,000

Sector: high-growth tech → M_base = 6.6666667

growth_rate = 25% → growth_factor = 0.25 * 0.5 = 0.125 (example mapping)

profit_margin = 10% → margin_factor ≈ 0.03

sentiment = 0.2 → sentiment_factor = 0.2 * 0.2 = 0.04

news_score = 0.0 (no news)

Compute multiple:

Start: M_base = 6.6666667

Add modifiers: 1 + 0.125 + 0.03 + 0.04 = 1.195

multiple = 6.6666667 × 1.195 ≈ 7.9666667

Fundamental market cap:

150,000,000 × 7.9666667

150,000,000 × 7 = 1,050,000,000

150,000,000 × 0.9666667 ≈ 145,000,000 (precisely 150,000,000 × 29/30 = 145,000,000)

Sum ≈ 1,195,000,000 → $1.195B

shares_outstanding = 100,000,000

fundamental_price = 1,195,000,000 / 100,000,000 = $11.95

Tick update example (given order imbalance)

Previous price price_prev = $12.20 (market was above fundamental)

Simulated B = 300k shares, S = 100k shares → I = (300k-100k)/(400k) = 0.5

liquidity_adjustment for this company ≈ sqrt(1,195,000,000 / 100,000,000) ≈ sqrt(11.95) ≈ 3.456

impact_pct = λ * I / liquidity_adjustment = 0.025 * 0.5 / 3.456 ≈ 0.00362 → 0.362% up

price_targ = 12.20 * (1 + 0.00362) ≈ 12.244

Mean-revert α = 0.08: price_after_reversion = 12.244*(1-0.08) + 11.95*0.08 = 12.244*0.92 + 11.95*0.08 = 11.267 + 0.956 = 12.223

Add noise: assume σ_annual = 60% → σ_tick = 0.60 / sqrt(19656) ≈ 0.60 / 140.19 ≈ 0.00428

draw Z = 0.5 (example) → multiplier ≈ exp(0.00428 * 0.5) ≈ exp(0.00214) ≈ 1.00214

price_new = 12.223 * 1.00214 ≈ 12.249

Round to tick $0.01 → $12.25

New market_cap = 12.25 × 100,000,000 = $1,225,000,000

This demonstrates movement toward fundamentals while allowing order-driven swings.

Pseudocode (core loop)
for each tick (every 5 minutes):
    for each company C:
        update_news_and_sentiment(C)
        M_base = get_base_multiple(C.sector, C.size)
        multiple = M_base * (1 + f_growth(C.growth) + f_margin(C.margin) + clamp(C.sentiment*0.2, -0.4,0.6))
        fundamental_cap = C.revenue_annual * multiple
        fundamental_price = fundamental_cap / C.shares_outstanding

        orders = simulate_orders_for_company(C)  # returns list of orders
        B, S = aggregate_buy_sell(orders)
        I = (B - S) / (B + S + eps)
        liquidity_adj = compute_liquidity_adj(C)
        impact_pct = lambda_ * I / liquidity_adj
        price_targ = C.price_prev * (1 + impact_pct)
        price_after_revert = price_targ * (1 - alpha) + fundamental_price * alpha
        sigma_tick = C.vol_est / sqrt(N_ticks_per_year)
        Z = normal_random()
        price_new = price_after_revert * exp(sigma_tick * Z)
        price_new = round_to_tick(price_new)
        execute_trades(orders, price_new, liquidity_limits)
        update_metrics(C, price_new, volume_executed)
        persist_tick(C)

Testing & validation checklist

Unit test fundamentals → check known inputs produce expected market caps (use the $150M → $1B test).

Sensitivity tests: vary λ, α, liquidity_score to check reasonable price moves.

Stress tests: simulate bursty news on small cap tickers to confirm no negative prices / runaway growth.

Exploit tests: craft accounts trying wash trades and verify anti-exploit flags.

Historical replay: seed the simulator with synthetic order flows and ensure emergent spreads, volumes, and volatilities are reasonable.

Metrics to monitor:

Realized volatility vs target by sector.

Average spread by liquidity band.

% of ticks hitting anti-exploit rules.

Distribution of daily returns (should be leptokurtic for small caps).

Tuning guidance (quick knobs)

Increase α → prices snap faster to fundamentals (less momentum).

Increase λ → trades have larger immediate impact (more volatile).

Increase liquidity_score → less impact for same order size.

Raise transaction_fee or max_order_size_pct_of_float → reduce manipulation.

Extensions (future features)

Limit order book with depth & visible levels.

Derivatives: options pricing with implied volatility surface.

Cross-listing arbitrage (pairs trading).

Lending / short selling + borrow rates.

Player markets: let players act as market makers and run their own algos.