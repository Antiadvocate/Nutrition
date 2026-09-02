# Nutrition

A nutrition tracker that describes rather than grades. Photograph a plate or
describe a meal and get macros, micronutrients and NOVA processing detail, plus
a reflection on the day and a pause to use before eating. React + TypeScript +
Vite, all data kept in the browser.

Every AI call runs through [OpenRouter](https://openrouter.ai), so you pick the
models yourself instead of being tied to one provider.

## How it's meant to work

The app deliberately has no score, no streak and no deficit carried between
days. A reference number is a description of an intention, not a standard to
pass, and a day that sits far from one is not a failure. Nothing is coloured
like an alarm.

The habit part is **the pause**: a beat between the impulse and the eating,
offered before anything is logged. Name what is actually there — body hunger, a
mood, habit, boredom — optionally sit with it for thirty seconds, then carry on
and log, or notice that it passed. An urge that gets looked at often unties
itself, and no rule was needed. Over time the interesting record is not the
macros; it's which urges release when you simply see them.

It also accepts **"ate it, didn't measure"**. A log that only takes precision
teaches you to abandon it the moment you can't be precise.

Turn the pause off in Reference → The pause if you would rather just track.

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

## What's in it

- **The pause** — offered before anything is logged, records whether the urge passed
- **Photo logging** — downscaled to 1024 px, read by your vision model
- **Description logging** — plain words in, an estimate out
- **Manual entry**, and **"ate it, didn't measure"** for meals not worth counting
- **Water** tracked per glass against a goal you set
- **Reflection** on the day and across recent days, generated only when you ask
- **Micronutrients and NOVA detail**, described rather than scored
- **Backup and restore** the whole log as JSON
- **Installable PWA** — the shell works offline

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
