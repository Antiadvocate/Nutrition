# Nutrition

A nutrition tracker with AI food analysis: photograph a plate or describe a meal
and get macros, micronutrients, NOVA processing scores, coach briefings and
smart day pre-fill. React + TypeScript + Vite, all data kept in the browser.

Every AI call runs through [OpenRouter](https://openrouter.ai), so you pick the
models yourself instead of being tied to one provider.

## Publish it on GitHub Pages

1. Push to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` builds and
   deploys, and Pages gives you `https://<user>.github.io/<repo>/`.

The Vite build uses relative asset paths (`base: './'`), so it works from a
project subpath, a user page, or any static host without further configuration.

## First run

Open the app. The **AI Engine** panel opens automatically when no key is stored,
or reach it any time from the gear icon in the header or the *AI Engine* button
on the dashboard.

Paste an OpenRouter key from [openrouter.ai/keys](https://openrouter.ai/keys).
It is kept in that browser's local storage and sent only to `openrouter.ai`.
Nothing is baked into the build, so a public URL is safe to share and every
visitor uses their own key.

## Choosing models

The panel pulls the live OpenRouter catalogue and offers two dropdowns, each
with a filter box (try `free`, `gemini`, `claude`, `qwen`):

- **Vision model** — plate photo scans. The list only contains models that
  accept image input, so you cannot pick one that will fail.
- **Text model** — search, AI logging, coach briefings, satiety notes and smart
  pre-fill. Untick *use the vision model for everything else too* to set it
  separately, which is handy for pairing an expensive vision model with a cheap
  text one.

Requests that need JSON ask for strict structured output first. Models that do
not support it are detected on the first failure and fall back to prompt-guided
JSON with lenient parsing, so most of the catalogue works.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build into dist/
npm run lint     # tsc --noEmit
```

Windows users can double-click `start-server.bat`, or run
`setup-windows-autostart.bat` once to start it on login.

## Where things live

```
src/lib/openrouter.ts    API client, model catalogue, key storage, JSON handling
src/lib/ai.ts            The prompts: food analysis, briefings, meal planning
src/components/AISettings.tsx   Key entry and model pickers
src/store/StoreContext.tsx      All app state, persisted to local storage
```
