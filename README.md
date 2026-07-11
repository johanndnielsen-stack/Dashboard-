# Centru de Comandă — Bucharest Dashboard

A personal command-center dashboard, built around a Ford Explorer Electric,
with live weather, currency, and Romanian + tech news.

## What's live right now
- **Weather** (Bucharest) — Open-Meteo, no API key, runs in the browser.
- **Currency** (EUR/RON, USD/RON) — frankfurter.dev, no API key, runs in the browser.
- **News** (Romanian politics + tech/auto) — fetched by a Netlify serverless
  function (`netlify/functions/news.js`) so it isn't blocked by browser CORS.

## What's still placeholder
- The **car panel** (battery, range, charge, savings) — realistic mock numbers.
  This is the piece that needs Ford's developer API and your father-in-law's
  one-time authorization. Wire this up last.
- BET index, energy price, salt price, and the agenda — static for now.

## Deploy (Netlify + GitHub)
1. Create a new GitHub repo and add these files (keep the folder structure):
   ```
   index.html
   netlify.toml
   netlify/functions/news.js
   ```
2. In Netlify: **Add new site → Import an existing project → pick the repo.**
3. Leave build command empty; publish directory `.`. Deploy.
4. Your site goes live at `https://<name>.netlify.app`. The news function is
   automatically available at `/.netlify/functions/news`.

## Local preview
Open `index.html` directly to see weather + currency. The news panel only works
once deployed (or via `netlify dev` with the Netlify CLI), since it needs the function.

## Customize
- Greeting / title: top of `index.html`.
- Weather location: the `latitude`/`longitude` in `loadWeather()` (currently Bucharest).
- News sources: the `FEEDS` object in `netlify/functions/news.js` — add or swap RSS URLs.
