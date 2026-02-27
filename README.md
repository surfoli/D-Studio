## D³ Studio – Prompt-to-Website Vibe Coding

D³ Studio ist jetzt eine Prompt-basierte Website-Builder-App:

1. Prompt eingeben (oben in der App)
2. Website per Anthropic generieren
3. Blöcke und Texte direkt im Canvas bearbeiten

## Setup

### 1) Env setzen

In `.env.local`:

```bash
ANTHROPIC_API_KEY=dein_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

> Falls du den Key änderst: Dev-Server neu starten.

### 2) Dev starten

```bash
npm install
npm run dev
```

Dann öffnen: [http://localhost:3000](http://localhost:3000)

## Usage

- Oben im Prompt-Feld die gewünschte Website beschreiben.
- `Website erstellen` klicken (oder `Cmd/Ctrl + Enter`).
- Im Canvas Text anklicken, danach im Toolbar-Panel direkt ändern.
- Über Block/Style/Layout kannst du Varianten und Design weiter anpassen.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
