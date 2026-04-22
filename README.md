# SlateTrack — UK Film Crew Hours Tracker

Local-first web app for UK film crew to log daily call/wrap times, calculate overtime (1.5x / 2x), night premiums, and produce a production charge summary.

## Folder structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages CI
├── public/                        # static assets (incl. 404.html SPA fallback)
├── src/
│   ├── components/                # EntryForm, RecentLog, Summary, RatesPanel, ui/
│   ├── hooks/                     # useEntries (localStorage)
│   ├── lib/                       # calc.ts (hours + charges)
│   ├── pages/                     # Index, NotFound
│   ├── App.tsx
│   ├── index.css                  # OLED dark design tokens
│   └── main.tsx
├── index.html
├── tailwind.config.ts
└── vite.config.ts
```

## Run locally

```bash
npm install && npm run dev
```

## Deploy to GitHub Pages

1. Push to GitHub.
2. **Settings → Pages → Source = GitHub Actions**.
3. The included workflow builds with `VITE_BASE=/<repo-name>/` and publishes `dist/`.
4. Live at `https://<user>.github.io/<repo>/`.

Click the gear icon in the app to configure hourly rate, basic hours/day, OT 1.5x window, night premium, VAT and kit rental. All data stored in `localStorage` — nothing leaves the browser.
