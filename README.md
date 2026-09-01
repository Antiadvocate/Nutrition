# Nutrition

A meal tracker that runs entirely in the browser. Photograph a plate or describe it,
and an OpenRouter model estimates calories and macros. No backend, no build step,
no npm install — it is plain HTML, CSS and ES modules, so GitHub Pages can serve it
as is.

## Publish it on GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` publishes the site.
4. Open `https://<your-username>.github.io/<repo-name>/`.

If you would rather not use Actions, set **Source** to *Deploy from a branch*, pick
`main` and `/ (root)`. The `.nojekyll` file is already there so the `js/` folder is
served untouched.

## First run

Open the site, go to **Settings** and paste an OpenRouter API key from
[openrouter.ai/keys](https://openrouter.ai/keys). The key is saved in that browser's
local storage and is sent only to `openrouter.ai` when you ask for an estimate. It is
never committed anywhere and never reaches a server of ours, because there isn't one.

Anyone who visits your published URL uses their own key. Do not hardcode yours into
the source if the repository is public.

## Choosing models

The **Settings** tab pulls the live model catalogue from OpenRouter and gives you two
dropdowns:

- **Vision model** — used for photos. The list is filtered to models that actually
  accept image input, so you cannot pick one that will fail.
- **Text model** — used for typed descriptions and the daily insight. Tick *use the
  vision model for text too* if you would rather run one model for everything.

Each dropdown has a filter box, so typing `free`, `gemini`, `claude` or `qwen` narrows
a few hundred entries down fast. Models marked `[free]` cost nothing per token.
If the catalogue cannot be fetched, a short built-in list is used instead.

## What the app does

| Feature | How it works |
| --- | --- |
| Photo logging | Image is downscaled to 1024 px, sent as a data URL, parsed into per-food macros |
| Description logging | Free text goes to the text model, same JSON shape back |
| Manual entry | No model call at all |
| Review step | Every estimate is editable before it lands in the log |
| Daily insight | Short read on the day against your targets |
| History | 14-day calorie chart plus the full entry list |
| Export / import | JSON in and out, so the data is yours |

Estimates are estimates. The review step exists because models guess portion sizes,
and you know what was on the plate better than they do.

## Local development

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. ES modules need a real HTTP server, so opening
`index.html` from the filesystem will not work.

## Layout

```
index.html            markup and views
styles.css            all styling, light and dark
js/app.js             UI wiring and state
js/analysis.js        prompts, reply normalisation, image resizing
js/openrouter.js      API client and model catalogue
js/store.js           local storage
```
