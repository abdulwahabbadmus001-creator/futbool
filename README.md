# World Soccer: Winning Eleven 2012 (PES 2012) — 16:9 Widescreen UI/UX & 3D Football System

A high-fidelity interactive UI/UX and playable 3D football broadcast experience inspired by **World Soccer: Winning Eleven 2012 (PES 2012)** for a 16:9 widescreen (`1920×1080`) display. Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Three.js**.

---

## Visual & Structural Specifications

### 1. Color Palette & Theme
- **Primary Background**: Deep midnight navy (`#061229`) to royal electric blue (`#0B3B8C`) radial gradients.
- **Accents**: Glowing cyan (`#00E5FF`) selection borders, glossy white glassmorphism highlights, and stadium floodlight anamorphic lens flares.
- **Typography**: Bold, uppercase geometric sans-serif headers (`Chakra Petch`, `Rajdhani`, `Barlow Condensed`) with tight letter spacing and clean tabular numerals (`JetBrains Mono`) for clocks, scores, and player stats.

### 2. Main Menu Layout (Ribbon UX)
- **Background**: Full-screen blurred stadium pitch with animated floating light particles, floodlight lens flares, and a dark midnight-navy vignette overlay.
- **Top Bar**: Minimalist broadcast header featuring the **World Soccer: Winning Eleven 2012** crest emblem on the top-left, interactive **View Toggle Switcher** (`Main Menu`, `In-Match HUD`, `Game Plan / Tactics`), and a sleek **User Profile Pill** (avatar icon, username, online indicator, and `GP` currency) on the top-right.
- **Centerpiece Navigation**: Arching, curved horizontal ribbon carousel of 7 glossy rectangular mode tiles:
  1. `Exhibition`
  2. `UEFA Champions League`
  3. `Master League`
  4. `Become a Legend`
  5. `Football Life`
  6. `Edit`
  7. `System Settings`
- **Active Tile State**: The center selected tile scales up along the apex of the arch, features a vibrant glowing cyan (`#00E5FF`) border with targeting brackets, a glossy diagonal sheen, and displays a concise 1-line mode description bar underneath.
- **Bottom Bar**: Console-style button prompt legend (`[X] Select`, `[O] Back`, `[L1/R1] Switch Category`, `[△] Game Plan`, `[□] In-Match HUD`) inside a translucent dark navy footer bar.

### 3. Second View Toggle (`In-Match Broadcast HUD` & `Game Plan / Tactics`)
- **Top-Left Scoreboard**: Compact TV-style broadcast bug with team color swatches, 3-letter team abbreviations (`BAR` vs `RMA`), glossy white score box (`2 - 1`), and a green/black match timer with stoppage time (`45:00 +2`).
- **Bottom-Center Radar**: Semi-transparent 2D pitch mini-map showing live animated player dots and ball position.
- **Bottom-Left & Bottom-Right Player Plates**: Active player number, position tag, condition arrow, uppercase player name, stamina bar (`green-to-yellow` gradient), and a **curved SVG shot/pass power gauge**.
- **Game Plan / Tactics View**: Interactive PES 2012 squad lineup swapper, 2D formation board (`4-3-3`, `4-2-3-1`, `3-4-3`), 6-axis hexagonal player ability radar, and team strategy sliders.

---

## Scripts & Deployment

```powershell
# 1. Install dependencies
npm install

# 2. Type-check / Lint
npm run lint

# 3. Run unit test suite
npm test

# 4. Build production bundle (outputs to dist/)
npm run build

# 5. Start development server
npm run dev
```
