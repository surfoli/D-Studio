## D3 Studio — AI-powered Coding Studio

Beschreibe was du willst. D3 Studio plant, baut, testet und fixt es automatisch — und du kannst das Ergebnis visuell editieren.

### Modi

- **Plan Mode** — Projektplan erstellen via `.d3/` Karten (PAGES, STYLE, CONTENT, TECHSTACK)
- **Build Mode** — AI generiert Code, Monaco Editor, E2B Sandbox Preview, Agent Loop

### Features

- **Agent Loop** — Plan → Build → Test → Fix (max 3 Iterationen, vollautomatisch)
- **Inspect & Edit** — Element in der Preview klicken → Farbe, Font, Größe live ändern → AI schreibt Code um
- **1-Click Deploy** — Vercel Deploy direkt aus der Preview-Toolbar
- **AI Chat** — 9 Experten-Rollen, Anthropic Claude via SSE Streaming
- **E2B Sandbox** — Volle Linux VM, alle Sprachen, echte Preview-URLs
- **Auth** — Supabase Auth (E-Mail + GitHub OAuth)
- **GitHub Integration** — Repos laden/speichern
- **Liquid Glass UI** — Dark/Light/Auto Theme

## Setup

### 1) Env setzen

In `.env.local`:

```bash
ANTHROPIC_API_KEY=dein_anthropic_key
E2B_API_KEY=dein_e2b_key
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional: Vercel Deploy
VERCEL_TOKEN=dein_vercel_token
VERCEL_TEAM_ID=dein_team_id
```

### 2) Dev starten

```bash
npm install
npm run dev
```

Dann öffnen: [http://localhost:3000](http://localhost:3000)

## Usage

1. **Plan Mode**: Projekt beschreiben → AI füllt `.d3/` Karten automatisch
2. **Build Mode**: Chat nutzen oder **Agent Build** klicken → AI generiert komplettes Projekt
3. Live Preview im integrierten Browser, Terminal zeigt Build-Output
4. **Inspect**: 🖱️ Button in Preview-Toolbar → Element klicken → Farbe/Font/Größe ändern → "In Code übernehmen"
5. **Deploy**: 🚀 Button → 1-Click auf Vercel deployen
6. Iterieren per Chat, Inspect oder erneuter Agent Build
