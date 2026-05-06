# AlphaStream — Complete Business Plan & v0 Build Specs

## What AlphaStream Is

ML-powered trading signal service. You already built the engine:
- 200+ technical indicators (pandas-ta + custom)
- 5 ML models (XGBoost, LightGBM, LSTM, Random Forest, Ensemble)
- 73% prediction accuracy
- Walk-forward validation (no look-ahead bias)
- FastAPI + WebSocket backend
- Redis caching
- Backtesting with quantstats/empyrical

---

## COMPETITIVE LANDSCAPE

| Competitor | Price | Weakness | Our Edge |
|-----------|-------|----------|----------|
| TradingView Signals | Free-$60/mo | User-generated, no ML, inconsistent quality | ML-validated, confidence scores, walk-forward tested |
| QuantConnect | Free-$20/mo | Developer-focused, steep learning curve | Dashboard-first, no coding required for end users |
| Trade Ideas | $118-$228/mo | Expensive, US equities only, closed source | Cheaper, multi-asset, open-source core |
| Kavout | Enterprise only | No retail offering | Affordable retail tiers starting at $49 |
| Signal Stack | $50-100/mo | Forwarding only, no ML | Full ML pipeline, custom models |

---

## HOW IT MAKES $10-30K/month

### Revenue Tiers

| Tier | Price | Target | What They Get |
|------|-------|--------|---------------|
| **Free** | $0 | GitHub community | Open-source framework, docs, examples |
| **Starter** | $49/mo | Hobbyist traders | 5 symbols, daily signals via email, dashboard access |
| **Pro** | $149/mo | Active traders | 25 symbols, real-time signals, API access, SMS alerts |
| **Premium** | $299/mo | Serious traders | Unlimited symbols, WebSocket streaming, backtesting tools, priority support |
| **Enterprise** | $2,500+/mo | Funds, firms | Custom models, dedicated infra, consulting hours |

### Revenue Math

- 100 Starter users x $49 = $4,900/mo
- 50 Pro users x $149 = $7,450/mo
- 20 Premium users x $299 = $5,980/mo
- 2 Enterprise clients x $2,500 = $5,000/mo
- **Total: $23,330/mo** with just 172 paying users

### Unit Economics
- CAC (estimated): $30-50 per user via content marketing
- LTV (estimated): $49 x 8 months avg retention = $392 (Starter)
- LTV/CAC ratio: 8-13x (healthy)
- Churn assumption: 10-15% monthly (signal services run high)
- Break-even: ~40 paying users at blended $120 avg

### Infrastructure Costs
- Vercel Pro: $20/mo
- Supabase Pro: $25/mo
- Redis (Upstash): $10/mo
- Market data API (Alpaca free tier + Polygon.io): $100/mo
- AWS Lambda for ML inference: ~$50/mo at scale
- Sentry error monitoring: $0 (free tier)
- Resend email: $0 (free tier up to 3K/mo)
- **Total: ~$205/mo**

**Margin: 99%**

---

## THE APP — 5 PAGES

1. **Landing Page** — marketing, pricing, signup CTA
2. **Dashboard** — live signals, model performance, charts
3. **Backtester** — run backtests on historical data
4. **API Docs** — for developers who want programmatic access
5. **Account** — billing (Stripe), API keys, alert settings

---

## DESIGN SYSTEM

### Colors
- Background: #09090B
- Card: #18181B
- Border: #27272A
- Hover border: #3F3F46
- Text primary: #FAFAFA
- Text secondary: #A1A1AA
- Text muted: #71717A
- Accent teal: #06B6D4
- Accent violet: #8B5CF6
- Success/Long: #10B981
- Danger/Short: #EF4444
- Warning: #F59E0B
- Neutral signal: #71717A

### Typography
- Body: Inter (system fallback: -apple-system, sans-serif)
- Code/Data: JetBrains Mono
- Heading sizes: 48px (h1), 36px (h2), 24px (h3), 18px (h4)
- Body: 16px, line-height 1.6
- Data/numbers: 14px JetBrains Mono

### Spacing
- Base unit: 4px
- Card padding: 24px
- Section gap: 64px (desktop), 40px (mobile)
- Card gap: 16px
- Border radius: 12px (cards), 8px (buttons/inputs), 6px (badges)

### Components
- Icon library: Lucide React
- UI library: shadcn/ui (Radix primitives)
- Charts: Recharts
- Animations: Framer Motion (fade-in on scroll, 0.6s duration)
- Toasts: sonner
- Buttons: teal fill (primary), outline (secondary), ghost (tertiary)
- Hover states: border → teal/50%, slight scale(1.02), shadow glow

### Responsive Breakpoints
- Mobile: < 768px (stack everything, sidebar becomes bottom nav or hamburger)
- Tablet: 768-1024px (2-column grids)
- Desktop: > 1024px (full layout, sidebar visible)

---

## v0 PROMPT — PAGE 1: LANDING PAGE

Paste this into v0.dev:

```
Build a SaaS landing page for "AlphaStream" — an ML-powered trading signal platform.

DESIGN SYSTEM:
- Dark theme: background #09090B, cards #18181B, borders #27272A
- Text: primary #FAFAFA, secondary #A1A1AA, muted #71717A  
- Accent: teal #06B6D4, violet #8B5CF6, green #10B981, red #EF4444
- Font: Inter for body, JetBrains Mono for code/data/numbers
- Border radius: 12px cards, 8px buttons, 6px badges
- Use shadcn/ui components and Lucide React icons
- All sections fade in on scroll

SECTIONS (top to bottom):

1. NAVIGATION BAR (sticky):
   - Left: "AlphaStream" logo text in bold
   - Center: Features, Pricing, Docs, GitHub (links)
   - Right: "Login" (ghost button) + "Start Free Trial" (teal fill button)
   - Blur background on scroll

2. HERO:
   - Top badge: "200+ Indicators · 5 ML Models · 73% Accuracy" (small, bordered pill)
   - Headline: "Trading Signals Powered by Machine Learning" (48px, bold, white)
   - Subheadline: "XGBoost, LightGBM, and LSTM models analyze 200+ technical indicators to generate high-confidence trading signals. Walk-forward validated. No look-ahead bias." (18px, #A1A1AA)
   - Two CTAs: "Start Free Trial" (teal #06B6D4 button, large) and "View Live Demo" (outline button)
   - Below CTAs: "No credit card required · Cancel anytime" (small, #71717A)
   - Subtle grid pattern background behind hero

3. LIVE SIGNAL PREVIEW:
   Section title: "Live Signal Preview" with a green pulsing dot
   Card grid (4 across on desktop, 2 on tablet, 1 on mobile):
   
   Card 1: NQ (Nasdaq Futures)
   - Direction: LONG (green #10B981 badge)
   - Confidence: 87% (with teal progress bar)
   - Model: XGBoost
   - Updated: 2m ago
   
   Card 2: ES (S&P 500 Futures)  
   - Direction: NEUTRAL (gray #71717A badge)
   - Confidence: 52%
   - Model: Ensemble
   - Updated: 5m ago
   
   Card 3: CL (Crude Oil)
   - Direction: SHORT (red #EF4444 badge)
   - Confidence: 91%
   - Model: LightGBM
   - Updated: 1m ago
   
   Card 4: GC (Gold)
   - Direction: LONG (green badge)
   - Confidence: 78%
   - Model: LSTM
   - Updated: 3m ago
   
   Each card: #18181B background, #27272A border, hover → border teal/50%
   Confidence numbers have a subtle pulse animation

4. SOCIAL PROOF BAR:
   Row of stats on dark background:
   "200+ Indicators" · "5 ML Models" · "73% Accuracy" · "Walk-Forward Validated"
   
5. HOW IT WORKS (3 steps):
   Step 1: Database icon → "Data Ingestion" → "We pull OHLCV data from multiple sources and compute 200+ technical indicators across timeframes."
   Step 2: Brain icon → "ML Analysis" → "5 independent models analyze the feature space. Walk-forward validation ensures no overfitting."  
   Step 3: Zap icon → "Signal Delivery" → "Receive signals via dashboard, API, WebSocket, email, or SMS. Act on high-confidence opportunities."
   Connect steps with a subtle dotted line
   Each step: numbered circle (1, 2, 3) in teal

6. MODEL PERFORMANCE:
   Section title: "Transparent Performance"
   Subtitle: "Every model, every metric. No black boxes."
   
   Table with 5 rows:
   | Model | Accuracy | Sharpe Ratio | Win Rate | Signals/Day |
   | XGBoost | 74.2% | 1.62 | 58.3% | 12 |
   | LightGBM | 72.8% | 1.48 | 56.1% | 14 |
   | LSTM | 71.5% | 1.35 | 54.8% | 8 |
   | Random Forest | 69.3% | 1.21 | 53.2% | 15 |
   | Ensemble | 73.1% | 1.72 | 59.5% | 10 |
   
   Table styled: #18181B bg, #27272A borders, header row slightly darker
   Footnote: "Performance based on walk-forward validation on out-of-sample data. Past results do not guarantee future performance."

7. TESTIMONIALS (2 cards):
   Card 1: "AlphaStream's ensemble model caught the NQ reversal at 18,200 that I completely missed. The confidence scoring helps me size positions intelligently." — Active Futures Trader
   Card 2: "Finally a signal service that shows its methodology. I can see the walk-forward validation results and actually trust the numbers." — Algorithmic Trader
   Quote icon in teal, cards with subtle glow on hover

8. PRICING (3 tiers):
   Section title: "Simple, Transparent Pricing"
   Annual/Monthly toggle at top ("Save 20% annually")
   
   Tier 1 - Starter ($49/mo):
   - 5 symbols
   - Daily signals
   - Email alerts  
   - Dashboard access
   - 30-day signal history
   - Community support
   CTA: "Start Free Trial"
   
   Tier 2 - Pro ($149/mo) — "Most Popular" badge in violet:
   - 25 symbols
   - Real-time signals
   - API access (REST)
   - SMS + email alerts
   - 90-day signal history
   - Backtesting tools
   - Priority support
   CTA: "Start Free Trial" (highlighted, teal)
   
   Tier 3 - Premium ($299/mo):
   - Unlimited symbols
   - WebSocket streaming
   - Full API access
   - All alert channels
   - Unlimited history
   - Advanced backtesting
   - Custom model requests
   - Dedicated support
   CTA: "Start Free Trial"
   
   Below pricing: "All plans include 14-day free trial. No credit card required."

9. TECH STACK / TRANSPARENCY:
   "Open-Source Core"
   "Our models are transparent. Our methodology is published. We don't hide behind a black box."
   Row of tech badges: Python, scikit-learn, XGBoost, PyTorch, FastAPI, Redis
   Two CTAs: "View on GitHub" (outline) + "Read the Docs" (ghost)

10. FAQ (accordion, 6 questions):
    - "How are signals generated?" → Brief explanation of ML pipeline
    - "What markets do you cover?" → Futures (NQ, ES, CL, GC, YM, RTY), Crypto (BTC, ETH), expanding
    - "Can I use the API programmatically?" → Yes, REST and WebSocket, Python/JS SDKs coming
    - "How often are models retrained?" → Weekly on rolling windows
    - "Is this financial advice?" → No. Educational/informational tool only. See disclaimer.
    - "Can I cancel anytime?" → Yes. No contracts, no commitment.

11. FOOTER CTA:
    "Ready to trade smarter?"
    Email input + "Start Free Trial" button (inline form)
    Below: GitHub · Twitter · Discord · Docs · Privacy · Terms
    
12. LEGAL DISCLAIMER (always visible in footer):
    "AlphaStream provides algorithmic trading signals for educational and informational purposes only. This is not financial advice. Trading involves substantial risk of loss. Past performance does not guarantee future results. AlphaStream is not a registered investment advisor. Always do your own research."

Make it fully responsive (mobile stack, tablet 2-col, desktop full).
Single page, modern SaaS design. No auth needed for this page.
```

---

## v0 PROMPT — PAGE 2: SIGNAL DASHBOARD

```
Build a trading signal dashboard for "AlphaStream".

DESIGN SYSTEM:
- Dark theme: background #09090B, cards #18181B, borders #27272A
- Accent: teal #06B6D4, green #10B981 (LONG), red #EF4444 (SHORT), gray #71717A (NEUTRAL)
- Font: Inter body, JetBrains Mono for data/numbers
- Border radius: 12px cards, 8px buttons, 6px badges
- Use shadcn/ui components, Lucide React icons, recharts for charts

LAYOUT: Sidebar navigation (left) + main content area

SIDEBAR (240px wide, collapsible on mobile → hamburger menu):
   - Logo: "AlphaStream" bold text + lightning bolt icon
   - Nav items (with Lucide icons):
     - LayoutDashboard → Dashboard (active state: teal bg/10%, teal text)
     - Signal → Signals
     - BarChart3 → Backtester
     - Key → API Keys
     - Settings → Settings
   - Divider line
   - Bottom section:
     - User avatar circle (placeholder) + "Jason T." + "Pro Plan" badge
     - "Upgrade" button (violet #8B5CF6)
   - Sidebar background: #0A0A0B, border-right: #27272A

MAIN CONTENT:

1. TOP BAR (sticky):
   - Left: "Dashboard" page title
   - Center: Connection status indicator (green dot + "Connected" or red dot + "Disconnected")
   - Right: timeframe selector (1D / 1W / 1M / 3M buttons, 1D active), notification bell (with red badge "3"), user avatar

2. PORTFOLIO SUMMARY (row of 4 metric cards):
   Each card: #18181B bg, #27272A border, icon top-left, value large, label small
   - TrendingUp icon → Active Signals: 8 (green up arrow + "+3 today")
   - Target icon → Win Rate (30d): 61.2% (green)
   - Gauge icon → Avg Confidence: 79.4% (teal)
   - BarChart icon → Signals Today: 14 (neutral)

3. SIGNAL FILTER BAR:
   Row of filter buttons: All | Long Only | Short Only | High Confidence (>80%)
   Active filter: teal background
   Right side: search input "Search symbols..." + sort dropdown

4. LIVE SIGNALS TABLE (main content, full width):
   Table header: #0A0A0B bg, sticky
   Columns: Symbol | Direction | Confidence | Model | Entry Price | Stop Loss | Take Profit | Time
   
   12 rows of realistic data:
   Row 1: NQ | LONG (green badge) | 91% (teal progress bar) | XGBoost | 18,245.50 | 18,180.00 | 18,375.00 | 09:31:02
   Row 2: ES | LONG (green) | 84% | Ensemble | 5,432.75 | 5,410.00 | 5,470.00 | 09:31:15  
   Row 3: CL | SHORT (red badge) | 88% | LightGBM | 78.42 | 79.10 | 77.20 | 09:32:01
   Row 4: GC | NEUTRAL (gray) | 51% | LSTM | 2,345.80 | — | — | 09:30:45
   Row 5: BTC | LONG | 76% | XGBoost | 67,234.00 | 66,500.00 | 68,100.00 | 09:33:10
   Row 6: ETH | SHORT | 82% | LightGBM | 3,456.20 | 3,510.00 | 3,380.00 | 09:33:45
   Row 7: RTY | LONG | 69% | RandomForest | 2,087.40 | 2,075.00 | 2,105.00 | 09:34:02
   Row 8: YM | NEUTRAL | 48% | Ensemble | 38,942.00 | — | — | 09:34:15
   Row 9: NQ | SHORT | 85% | LSTM | 18,310.25 | 18,375.00 | 18,210.00 | 10:15:30
   Row 10: CL | LONG | 73% | XGBoost | 77.85 | 77.20 | 78.90 | 10:22:01
   Row 11: GC | LONG | 80% | Ensemble | 2,352.40 | 2,340.00 | 2,372.00 | 10:30:15
   Row 12: ES | SHORT | 77% | LightGBM | 5,445.50 | 5,465.00 | 5,415.00 | 10:45:02
   
   Table rows: hover → #27272A bg. Alternating subtle stripe.
   Confidence column: shows both progress bar and percentage
   Clicking a row could expand to show more details (optional)
   
   Empty state (when no signals): illustration + "No signals yet. Models are analyzing market data." + subtle loading animation

5. EQUITY CURVE CHART (below table):
   Title: "Strategy Performance" with timeframe tabs (1W / 1M / 3M / 1Y / All)
   Recharts AreaChart:
   - Teal line + gradient fill: AlphaStream strategy
   - Gray dashed line: Buy & Hold benchmark (S&P 500)
   - X axis: dates (last 90 days default)
   - Y axis: cumulative return %
   - Tooltip on hover: date, strategy return, benchmark return
   - Crosshair on hover
   Stats row below chart:
   - Total Return: +18.4% (green)
   - Max Drawdown: -6.2% (red)  
   - Sharpe: 1.72 (teal)
   - Best Day: +3.1%
   - Worst Day: -1.8%

6. MODEL BREAKDOWN (row of 5 small cards below chart):
   Each card shows:
   - Model name (bold)
   - Circular progress ring showing accuracy (colored by performance)
   - "12 signals today" (small text)
   - "Retrained: Apr 28" (muted text)
   Cards for: XGBoost (74.2%), LightGBM (72.8%), LSTM (71.5%), RandomForest (69.3%), Ensemble (73.1%)
   
7. RECENT ACTIVITY FEED (scrollable, max height 300px):
   Title: "Activity" with a live green dot
   Feed items (most recent first):
   - Signal icon (teal) → "NQ LONG signal — 91% confidence (XGBoost)" — 2m ago
   - CheckCircle (green) → "ES LONG closed — +$425.00 profit" — 15m ago
   - Signal icon (red) → "CL SHORT signal — 88% confidence (LightGBM)" — 18m ago
   - AlertTriangle (amber) → "GC confidence dropped below 60% — monitoring" — 32m ago
   - RefreshCw (teal) → "Models retrained on latest data" — 2h ago
   - CheckCircle (green) → "NQ SHORT closed — +$312.50 profit" — 3h ago
   Each item: small icon, text, relative timestamp right-aligned

8. LOADING STATES:
   - Initial page load: skeleton cards (gray shimmer) for all sections
   - Chart loading: centered spinner with "Loading performance data..."
   - Table loading: 5 shimmer rows

Make it responsive:
- Desktop: sidebar + main content
- Tablet: sidebar collapses to icons only
- Mobile: sidebar becomes hamburger menu, cards stack vertically, table scrolls horizontally

Use mock/static data. No real API calls needed.
```

---

## v0 PROMPT — PAGE 3: BACKTESTER

```
Build a backtesting interface for "AlphaStream".

DESIGN SYSTEM:
- Dark theme: #09090B background, #18181B cards, #27272A borders
- Accent: teal #06B6D4, green #10B981, red #EF4444
- Font: Inter body, JetBrains Mono for numbers
- Use shadcn/ui components, Lucide React icons, recharts for charts

Use the same sidebar navigation as the Dashboard page (Dashboard, Signals, Backtester active, API Keys, Settings).

MAIN CONTENT:

1. PAGE HEADER:
   Title: "Backtester" 
   Subtitle: "Test strategies against historical data. No look-ahead bias."

2. CONFIGURATION PANEL (card, #18181B):
   Two-column form layout:
   
   Left column:
   - "Symbols" label → multi-select dropdown with checkboxes: NQ, ES, CL, GC, BTC, ETH, YM, RTY
   - "Date Range" label → two date pickers: Start Date (default: 1 year ago) / End Date (default: today)
   - "Initial Capital" label → text input with $ prefix (default: $100,000)
   
   Right column:
   - "Models" label → checkboxes: XGBoost, LightGBM, LSTM, Random Forest, Ensemble (all checked by default)
   - "Position Size" label → dropdown: 1%, 2%, 5%, 10% of capital (default: 2%)
   - "Min Confidence" label → slider from 50% to 95% (default: 70%)
   
   Bottom: "Run Backtest" button (teal, large, full width of card) with Play icon
   Below button: "Estimated time: ~5 seconds" muted text

3. LOADING STATE (shown after clicking Run Backtest):
   Full-width card with:
   - Progress bar (teal, animating from 0 to 100% over 3 seconds)
   - "Running backtest..." text
   - Steps showing: "Loading data..." → "Computing indicators..." → "Running models..." → "Calculating results..."
   After 3 seconds, fade in the results below

4. RESULTS SUMMARY (row of 6 metric cards, appears after loading):
   Each card: large number, label below, colored by good/bad
   - Total Return: +47.3% (green)
   - Sharpe Ratio: 1.72 (teal)
   - Max Drawdown: -12.1% (red)
   - Win Rate: 59.5% (green)
   - Total Trades: 342 (neutral)
   - Profit Factor: 1.85 (green)
   
   Below cards: "Export Results" button (outline) + "Save Backtest" button (ghost) + "Share" button (ghost)

5. EQUITY CURVE (large chart, full width):
   Title: "Portfolio Value Over Time"
   Recharts AreaChart:
   - Teal area (gradient fill): Strategy equity curve starting at $100,000 ending at ~$147,300
   - Gray dashed line: Buy & Hold benchmark
   - Red semi-transparent overlay on drawdown periods
   - X axis: dates (monthly labels)
   - Y axis: portfolio value in dollars
   - Tooltip: date, portfolio value, benchmark value, drawdown %
   - Crosshair on hover

6. DRAWDOWN CHART (below equity curve, half width left):
   Title: "Drawdown"
   Recharts AreaChart (red gradient, inverted):
   - Shows drawdown % from peak over time
   - X axis: dates, Y axis: negative percentages (0% to -15%)
   - Worst drawdown highlighted with annotation

7. MONTHLY RETURNS HEATMAP (half width right, next to drawdown):
   Title: "Monthly Returns"
   Grid: 12 columns (Jan-Dec) x 2-3 rows (years)
   Each cell: monthly return percentage
   Color coding:
   - Strong green (#10B981): > +5%
   - Light green: +1% to +5%
   - Gray: -1% to +1%
   - Light red: -1% to -5%
   - Strong red (#EF4444): < -5%
   Cell text: percentage value (e.g., "+3.2%", "-1.1%")

8. RISK METRICS TABLE (full width card):
   Title: "Risk Analysis"
   Two columns of metrics:
   Left: Sharpe Ratio: 1.72 | Sortino Ratio: 2.14 | Calmar Ratio: 3.91 | Information Ratio: 0.89
   Right: Max Drawdown: -12.1% | Avg Drawdown: -4.3% | Max Drawdown Duration: 18 days | Recovery Time: 12 days
   Each metric: label (muted) + value (white, mono font)

9. TRADE LOG (full width table):
   Title: "Trade History" with count badge "(342 trades)"
   Filter tabs: All | Winners | Losers
   Sort dropdown: Date | P&L | Duration | Confidence
   
   Columns: # | Date | Symbol | Direction | Entry | Exit | P&L ($) | P&L (%) | Duration | Model | Confidence
   
   20 sample rows with realistic data, e.g.:
   1 | 2025-07-15 | NQ | LONG | 18,245.50 | 18,375.00 | +$2,590.00 | +0.71% | 4h 22m | XGBoost | 91%
   2 | 2025-07-15 | CL | SHORT | 78.42 | 77.20 | +$1,220.00 | +1.56% | 2h 10m | LightGBM | 88%
   (mix of winners and losers, various durations)
   
   Winners: P&L in green. Losers: P&L in red.
   Pagination: "Showing 1-20 of 342" with page controls

10. COMPARISON MODE (optional toggle at top):
    Button: "Compare Strategies" 
    When clicked, shows a second configuration panel so user can run two backtests side by side
    Results show as overlapping equity curves in different colors

Make it responsive. Loading states and empty states for all sections.
Use mock data throughout — no real computation.
```

---

## v0 PROMPT — PAGE 4: API DOCS

```
Build an API documentation page for "AlphaStream".

DESIGN SYSTEM:
- Dark theme: #09090B background, #18181B cards, #27272A borders
- Accent: teal #06B6D4
- Code blocks: #0A0A0B background with syntax highlighting
- Font: Inter body, JetBrains Mono for all code
- Use shadcn/ui components

Use the same sidebar navigation as Dashboard (API Keys is active state).

MAIN CONTENT:

1. PAGE HEADER:
   Title: "API Documentation"
   Subtitle: "Integrate AlphaStream signals into your trading systems"
   Badge: "REST API v1" + "WebSocket" 
   Right side: "Get API Key" button (teal)

2. QUICK START (card):
   Title: "Quick Start"
   Three tabs: cURL | Python | JavaScript
   
   cURL tab:
   ```
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.alphastream.io/v1/signals
   ```
   
   Python tab:
   ```python
   import requests
   
   headers = {"Authorization": "Bearer YOUR_API_KEY"}
   response = requests.get("https://api.alphastream.io/v1/signals", headers=headers)
   signals = response.json()
   
   for signal in signals["data"]:
       print(f"{signal['symbol']}: {signal['direction']} ({signal['confidence']}%)")
   ```
   
   JavaScript tab:
   ```javascript
   const response = await fetch("https://api.alphastream.io/v1/signals", {
     headers: { "Authorization": "Bearer YOUR_API_KEY" }
   });
   const { data } = await response.json();
   data.forEach(s => console.log(`${s.symbol}: ${s.direction} (${s.confidence}%)`));
   ```
   
   "Copy" button on each code block

3. AUTHENTICATION:
   Explain API key authentication
   Show header format: `Authorization: Bearer sk_live_...`
   Note about rate limits: Starter (100/hr), Pro (1000/hr), Premium (unlimited)

4. ENDPOINTS (accordion or section list):

   GET /v1/signals
   - Description: "Get latest signals for all subscribed symbols"
   - Parameters: symbol (optional filter), min_confidence (optional, 0-100), model (optional)
   - Response example (JSON, syntax highlighted):
   ```json
   {
     "data": [
       {
         "id": "sig_abc123",
         "symbol": "NQ",
         "direction": "LONG",
         "confidence": 91,
         "model": "xgboost",
         "entry_price": 18245.50,
         "stop_loss": 18180.00,
         "take_profit": 18375.00,
         "created_at": "2025-04-30T09:31:02Z"
       }
     ],
     "meta": { "total": 8, "page": 1 }
   }
   ```

   GET /v1/signals/:id
   - Single signal detail

   GET /v1/models
   - List all models with performance metrics

   GET /v1/backtest
   - Parameters: symbols, start_date, end_date, models, initial_capital
   - Returns backtest results

   WebSocket: wss://api.alphastream.io/v1/stream
   - Real-time signal streaming
   - Show connection example in Python and JavaScript

5. RESPONSE CODES:
   Table: 200 OK, 401 Unauthorized, 403 Forbidden (plan limit), 429 Rate Limited, 500 Server Error

6. SDKs (coming soon):
   Cards for: Python SDK, JavaScript SDK, NinjaTrader Plugin
   Each with "Coming Soon" badge and email signup for notification

Make it clean, readable, developer-friendly. Use code syntax highlighting.
```

---

## v0 PROMPT — PAGE 5: ACCOUNT & SETTINGS

```
Build an account settings page for "AlphaStream".

DESIGN SYSTEM:
- Dark theme: #09090B background, #18181B cards, #27272A borders
- Accent: teal #06B6D4, violet #8B5CF6
- Use shadcn/ui components, Lucide React icons

Use the same sidebar navigation (Settings is active state).

MAIN CONTENT — tabbed layout with 4 tabs:

TAB 1: PROFILE
   - Avatar upload circle (placeholder with camera icon overlay)
   - Name input (default: "Jason Teixeira")
   - Email input (default: "jason@example.com", with "Verified" green badge)
   - Timezone dropdown (default: America/New_York)
   - "Save Changes" button

TAB 2: SUBSCRIPTION
   Current plan card:
   - "Pro Plan" with violet badge
   - "$149/month · Renews May 30, 2025"
   - Usage bar: "18 of 25 symbols used"
   - "Manage Subscription" button → links to Stripe Customer Portal
   - "Cancel Plan" text link (red, small)
   
   Plan comparison below (same 3 tiers as landing page but compact):
   Starter / Pro (current) / Premium
   "Upgrade" buttons on non-current plans

TAB 3: API KEYS
   Title: "API Keys"
   Subtitle: "Manage your API keys for programmatic access"
   
   Table of keys:
   | Name | Key (masked) | Created | Last Used | Status | Actions |
   | Production | sk_live_...4f2a | Apr 15, 2025 | 2 min ago | Active | Copy / Revoke |
   | Development | sk_test_...8b1c | Apr 20, 2025 | 3 days ago | Active | Copy / Revoke |
   
   "Create New Key" button (teal)
   When clicked: modal with name input + "Create" button
   Show full key ONCE after creation with "Copy" button and warning: "This key will only be shown once."
   
   Rate limit display: "Pro Plan: 1,000 requests/hour" with usage bar

TAB 4: ALERTS & NOTIFICATIONS
   Toggle switches for:
   - Email alerts: ON/OFF + email address input
   - SMS alerts: ON/OFF + phone input (Pro+ only, show upgrade prompt for Starter)
   - Webhook URL: text input for webhook endpoint
   - Discord webhook: text input
   
   Alert preferences:
   - Minimum confidence threshold: slider (50-95%, default 70%)
   - Symbols to alert on: multi-select checkboxes
   - Alert on: New signals / Signal closed / Model retrained (checkboxes)
   - Quiet hours: two time pickers (e.g., 10pm - 6am)
   
   "Save Preferences" button
   "Test Alert" button (sends a test notification)

Make it responsive. Form validation on all inputs.
Use mock data. No real API calls.
```

---

## USER FLOWS

### Flow 1: New User Signup
1. Lands on landing page → clicks "Start Free Trial"
2. Signup form: Name, Email, Password (or "Sign up with Google")
3. Email verification (click link)
4. Onboarding: "What do you trade?" (checkboxes: Futures, Crypto, Stocks)
5. Onboarding: "Pick your symbols" (select from list)
6. Redirect to Dashboard with first signals loading
7. Toast: "Welcome! Your 14-day free trial is active."

### Flow 2: Upgrade to Paid
1. User on Starter plan clicks "Upgrade" in sidebar or settings
2. Plan comparison modal shows Pro and Premium
3. Clicks "Upgrade to Pro"
4. Stripe Checkout session opens
5. Payment completes → redirect back to dashboard
6. Toast: "Upgraded to Pro! You now have access to 25 symbols and API access."

### Flow 3: API Key Creation
1. User goes to Settings → API Keys tab
2. Clicks "Create New Key"
3. Modal: enters key name (e.g., "Production")
4. Key generated, shown once with copy button
5. Warning: "Save this key. It won't be shown again."
6. Key appears in table (masked)

### Flow 4: First Backtest
1. User goes to Backtester page
2. Selects symbols, date range, models
3. Clicks "Run Backtest"
4. Loading state with progress steps
5. Results fade in: equity curve, metrics, trade log
6. User clicks "Save Backtest" → saved to account history
7. User clicks "Export" → downloads CSV

---

## DATABASE SCHEMA (Supabase)

```sql
-- Users (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  avatar_url text,
  timezone text default 'America/New_York',
  plan text default 'free' check (plan in ('free', 'starter', 'pro', 'premium', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- API Keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  key_hash text not null,
  key_prefix text not null, -- first 8 chars for display
  last_used_at timestamptz,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

-- Alert Preferences
create table alert_preferences (
  user_id uuid references profiles(id) primary key,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  phone_number text,
  webhook_url text,
  discord_webhook text,
  min_confidence integer default 70,
  symbols text[] default '{}',
  quiet_start time,
  quiet_end time,
  alert_on_new_signal boolean default true,
  alert_on_close boolean default true,
  alert_on_retrain boolean default false
);

-- Saved Backtests
create table backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text,
  config jsonb not null, -- symbols, date range, models, params
  results jsonb, -- metrics, equity curve data, trade log
  created_at timestamptz default now()
);

-- Signal History (populated by Python backend)
create table signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  direction text not null check (direction in ('LONG', 'SHORT', 'NEUTRAL')),
  confidence integer not null,
  model text not null,
  entry_price decimal,
  stop_loss decimal,
  take_profit decimal,
  closed_at timestamptz,
  close_price decimal,
  pnl decimal,
  created_at timestamptz default now()
);
```

---

## STRIPE SETUP

Products to create in Stripe:
- `alphastream_starter` — $49/mo, $470/year
- `alphastream_pro` — $149/mo, $1,430/year  
- `alphastream_premium` — $299/mo, $2,870/year

Webhook events to handle:
- `checkout.session.completed` → create/upgrade subscription
- `customer.subscription.updated` → update plan in profiles table
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → send email, grace period

---

## WIRING PLAN (After v0 Build)

Once you bring me the v0 code for each page:

1. **Create the Next.js project** — `alphastream-app`
2. **Install dependencies** — shadcn/ui, recharts, framer-motion, lucide-react, sonner
3. **Wire up Supabase** — auth (magic link + Google), profiles, API keys, backtests
4. **Wire up Stripe** — checkout, customer portal, webhooks
5. **Connect Python backend** — FastAPI endpoints for real signals via API route proxies
6. **Deploy to Vercel** — alphastream.sageideas.dev or buy alphastream.io domain
7. **Update portfolio** — add live URL to sageideas.dev project data

---

## LEGAL (Required on Every Page)

**Footer disclaimer:**
"AlphaStream provides algorithmic trading signals for educational and informational purposes only. This is not financial advice. AlphaStream is not a registered investment advisor, broker-dealer, or financial planner. Trading futures, options, and cryptocurrencies involves substantial risk of loss and is not suitable for all investors. Past performance, whether actual or indicated by historical tests of strategies, is not indicative of future results. Always do your own research before making trading decisions."

**Terms of Service** and **Privacy Policy** pages needed before accepting payments.

---

## GO-TO-MARKET CHECKLIST

### Pre-Launch (before accepting money)
- [ ] Landing page live with waitlist/email signup
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Stripe test mode working
- [ ] 5 beta testers using the dashboard for free
- [ ] Legal review of disclaimer language

### Launch Week
- [ ] Stripe live mode enabled
- [ ] Post on Reddit r/algotrading, r/trading
- [ ] Post on Hacker News (Show HN)
- [ ] Tweet thread about the build + open-source story
- [ ] LinkedIn post about AlphaStream
- [ ] Email waitlist with launch announcement

### Month 1-3
- [ ] YouTube demo video (5 min walkthrough)
- [ ] 3 blog posts about ML trading methodology
- [ ] Discord community server
- [ ] Monthly performance report (public)
- [ ] First 50 paying users target
- [ ] Collect testimonials from beta users

---

## IMMEDIATE NEXT STEPS

1. Go to v0.dev
2. Paste the **Landing Page prompt** (Page 1) first
3. Iterate in v0 until it looks good
4. Bring me the code
5. I wire it up with Supabase + Stripe
6. We deploy
7. Repeat for Dashboard, Backtester, API Docs, Account pages
