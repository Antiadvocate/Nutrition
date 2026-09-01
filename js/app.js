import {
  loadSettings, saveSettings, loadEntries, saveEntries,
  cacheModels, readCachedModels, clearEntries, newId,
} from './store.js';
import { fetchModels, FALLBACK_MODELS } from './openrouter.js';
import { analyzePhoto, analyzeText, dailyInsight, fileToDataUrl, makeThumb } from './analysis.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  settings: loadSettings(),
  entries: loadEntries(),
  date: todayKey(),
  models: [],
  photoDataUrl: '',
  review: null,
  busy: false,
};

function todayKey(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return todayKey(date);
}
function prettyDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (key === todayKey()) return 'Today';
  if (key === shiftDay(todayKey(), -1)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function entriesFor(key) {
  return state.entries.filter((e) => e.date === key);
}
function sumMacros(list) {
  return list.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
const round = (n) => Math.round(n * 10) / 10;

/* ------------------------------- rendering ------------------------------- */

function renderToday() {
  $('#dayPicker').value = state.date;
  const list = entriesFor(state.date).sort((a, b) => b.ts - a.ts);
  const totals = sumMacros(list);
  const g = state.settings.goals;

  $('#totKcal').textContent = Math.round(totals.calories);
  $('#goalKcal').textContent = '/ ' + g.calories + ' kcal';
  setBar('#barKcal', totals.calories, g.calories);
  $('#totP').textContent = round(totals.protein) + ' g';
  $('#totC').textContent = round(totals.carbs) + ' g';
  $('#totF').textContent = round(totals.fat) + ' g';
  setBar('#barP', totals.protein, g.protein);
  setBar('#barC', totals.carbs, g.carbs);
  setBar('#barF', totals.fat, g.fat);

  $('#entryCount').textContent = list.length ? `· ${list.length} item${list.length > 1 ? 's' : ''}` : '';
  const host = $('#entryList');
  host.innerHTML = '';
  if (!list.length) {
    host.innerHTML = `<div class="empty">Nothing logged for ${prettyDay(state.date).toLowerCase()} yet.</div>`;
  } else {
    list.forEach((e) => host.appendChild(entryRow(e)));
  }
}

function setBar(sel, value, goal) {
  const el = $(sel);
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  el.style.width = Math.min(100, pct) + '%';
  el.parentElement.classList.toggle('over', pct > 105);
}

function entryRow(e, showDate = false) {
  const row = document.createElement('div');
  row.className = 'entry';
  const time = new Date(e.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const sub = [showDate ? prettyDay(e.date) : time, e.portion, `${round(e.protein)}P ${round(e.carbs)}C ${round(e.fat)}F`]
    .filter(Boolean)
    .join(' · ');
  row.innerHTML = `
    ${e.thumb ? `<img class="thumb" src="${e.thumb}" alt="" />` : ''}
    <div class="info"><div class="nm"></div><div class="sub"></div></div>
    <div class="kc">${Math.round(e.calories)}</div>
    <button class="xbtn" title="Delete entry">×</button>`;
  row.querySelector('.nm').textContent = e.name;
  row.querySelector('.sub').textContent = sub;
  row.querySelector('.xbtn').addEventListener('click', () => {
    state.entries = state.entries.filter((x) => x.id !== e.id);
    saveEntries(state.entries);
    renderToday();
    renderHistory();
  });
  return row;
}

function renderHistory() {
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(shiftDay(todayKey(), -i));
  const goal = state.settings.goals.calories || 2000;
  const perDay = days.map((k) => ({ key: k, kcal: sumMacros(entriesFor(k)).calories }));
  const peak = Math.max(goal, ...perDay.map((d) => d.kcal), 1);

  const chart = $('#chart');
  chart.innerHTML = '';
  perDay.forEach((d) => {
    const col = document.createElement('div');
    col.className = 'col' + (d.kcal > goal * 1.05 ? ' over' : '');
    col.title = `${prettyDay(d.key)} · ${Math.round(d.kcal)} kcal`;
    col.innerHTML = `<i style="height:${(d.kcal / peak) * 100}%"></i><b>${d.key.slice(8)}</b>`;
    chart.appendChild(col);
  });

  const logged = perDay.filter((d) => d.kcal > 0);
  $('#avgKcal').textContent = logged.length
    ? `avg ${Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length)} kcal over ${logged.length} logged days`
    : 'nothing logged yet';

  const host = $('#historyList');
  host.innerHTML = '';
  const sorted = [...state.entries].sort((a, b) => b.ts - a.ts);
  if (!sorted.length) {
    host.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }
  let lastDay = '';
  sorted.forEach((e) => {
    if (e.date !== lastDay) {
      lastDay = e.date;
      const totals = sumMacros(entriesFor(e.date));
      const head = document.createElement('div');
      head.className = 'daygroup';
      head.textContent = `${prettyDay(e.date)} · ${Math.round(totals.calories)} kcal`;
      host.appendChild(head);
    }
    host.appendChild(entryRow(e));
  });
}

/* --------------------------------- models -------------------------------- */

function optionLabel(m) {
  const tags = [];
  if (m.free) tags.push('free');
  if (m.vision) tags.push('vision');
  return m.name + (tags.length ? '  [' + tags.join(', ') + ']' : '');
}

function fillModelSelect(selectId, filterId, metaId, { visionOnly, current }) {
  const select = $(selectId);
  const filter = $(filterId).value.trim().toLowerCase();
  const pool = state.models.length ? state.models : FALLBACK_MODELS;
  let list = visionOnly ? pool.filter((m) => m.vision) : pool;
  if (filter) {
    list = list.filter((m) => (m.id + ' ' + m.name + (m.free ? ' free' : '')).toLowerCase().includes(filter));
  }
  list = list.slice(0, 400);
  if (current && !list.some((m) => m.id === current)) {
    const known = pool.find((m) => m.id === current);
    list = [known || { id: current, name: current, vision: visionOnly, free: false }, ...list];
  }
  select.innerHTML = '';
  list.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = optionLabel(m);
    select.appendChild(opt);
  });
  if (current) select.value = current;
  const chosen = pool.find((m) => m.id === select.value);
  $(metaId).textContent = chosen
    ? `${chosen.id}${chosen.context ? ' · ' + chosen.context.toLocaleString() + ' ctx' : ''}${chosen.free ? ' · free tier' : ''}`
    : select.value || '';
}

function refreshModelSelects() {
  fillModelSelect('#visionModel', '#visionFilter', '#visionMeta', {
    visionOnly: true,
    current: state.settings.visionModel,
  });
  fillModelSelect('#textModel', '#textFilter', '#textMeta', {
    visionOnly: false,
    current: state.settings.textModel,
  });
  const same = state.settings.useSameModel;
  $('#textModel').disabled = same;
  $('#textFilter').disabled = same;
}

async function loadModelList({ force = false } = {}) {
  const status = $('#modelsStatus');
  const cached = force ? null : readCachedModels();
  if (cached) {
    state.models = cached;
    status.textContent = `${cached.length} models (cached)`;
    refreshModelSelects();
    return;
  }
  status.textContent = 'loading…';
  try {
    const models = await fetchModels();
    state.models = models;
    cacheModels(models);
    status.textContent = `${models.length} models · ${models.filter((m) => m.vision).length} with vision`;
  } catch (err) {
    state.models = FALLBACK_MODELS;
    status.textContent = 'could not reach OpenRouter, showing a short built-in list';
    console.warn(err);
  }
  refreshModelSelects();
}

/* -------------------------------- analysis ------------------------------- */

function setStatus(message, isError = false) {
  const el = $('#analysisStatus');
  if (!message) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.className = 'status' + (isError ? ' err' : '');
  el.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = message;
  el.appendChild(span);
  if (!isError) {
    const dots = document.createElement('span');
    dots.className = 'dots';
    el.appendChild(dots);
  }
}

function setBusy(on) {
  state.busy = on;
  $('#analyzePhoto').disabled = on || !state.photoDataUrl;
  $('#analyzeText').disabled = on;
}

function showReview(result, { thumb = '', source = 'text' } = {}) {
  state.review = {
    items: result.items.map((it) => ({ ...it })),
    note: result.note,
    thumb,
    source,
  };
  const card = $('#reviewCard');
  const host = $('#reviewList');
  host.innerHTML = '';
  $('#reviewModel').textContent = result.model || '';
  $('#reviewNote').textContent = result.note || '';

  if (!state.review.items.length) {
    host.innerHTML = '<div class="empty">The model could not identify anything. Try a clearer photo or describe it instead.</div>';
  }

  state.review.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'ritem';
    row.innerHTML = `
      <div class="rname">
        <input type="text" data-k="name" />
        <button class="xbtn" title="Remove">×</button>
      </div>
      <input type="text" data-k="portion" placeholder="portion" style="margin-top:6px" />
      <div class="rmacros">
        <label>kcal<input type="number" min="0" step="1" data-k="calories" /></label>
        <label>protein<input type="number" min="0" step="0.1" data-k="protein" /></label>
        <label>carbs<input type="number" min="0" step="0.1" data-k="carbs" /></label>
        <label>fat<input type="number" min="0" step="0.1" data-k="fat" /></label>
      </div>
      ${item.confidence ? `<div class="muted small" style="margin-top:6px">confidence: ${item.confidence}</div>` : ''}`;

    row.querySelectorAll('[data-k]').forEach((input) => {
      const key = input.dataset.k;
      input.value = item[key] ?? '';
      input.addEventListener('input', () => {
        state.review.items[index][key] = input.type === 'number' ? Number(input.value) || 0 : input.value;
      });
    });
    row.querySelector('.xbtn').addEventListener('click', () => {
      state.review.items.splice(index, 1);
      showReview({ ...state.review, model: $('#reviewModel').textContent }, { thumb, source });
    });
    host.appendChild(row);
  });

  card.hidden = false;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function commitReview() {
  if (!state.review) return;
  const now = Date.now();
  const added = state.review.items
    .filter((it) => it.name && (it.calories || it.protein || it.carbs || it.fat))
    .map((it, i) => ({
      id: newId(),
      ts: now + i,
      date: state.date,
      name: it.name,
      portion: it.portion,
      calories: Number(it.calories) || 0,
      protein: Number(it.protein) || 0,
      carbs: Number(it.carbs) || 0,
      fat: Number(it.fat) || 0,
      source: state.review.source,
      thumb: i === 0 ? state.review.thumb : '',
    }));
  state.entries = state.entries.concat(added);
  saveEntries(state.entries);
  cancelReview();
  clearPhoto();
  $('#describeText').value = '';
  renderToday();
  renderHistory();
}

function cancelReview() {
  state.review = null;
  $('#reviewCard').hidden = true;
}

function clearPhoto() {
  state.photoDataUrl = '';
  $('#photoInput').value = '';
  $('#photoPreview').hidden = true;
  $('#photoPreview').removeAttribute('src');
  $('#photoPlaceholder').hidden = false;
  $('#analyzePhoto').disabled = true;
}

/* -------------------------------- settings ------------------------------- */

function fillSettingsForm() {
  const s = state.settings;
  $('#apiKey').value = s.apiKey;
  $('#useSameModel').checked = s.useSameModel;
  $('#gKcal').value = s.goals.calories;
  $('#gP').value = s.goals.protein;
  $('#gC').value = s.goals.carbs;
  $('#gF').value = s.goals.fat;
  $('#gNotes').value = s.notes;
  refreshModelSelects();
  updateKeyPill();
}

function updateKeyPill() {
  const pill = $('#keyPill');
  const key = state.settings.apiKey;
  pill.textContent = key ? 'key set' : 'no key';
  pill.className = 'pill ' + (key ? 'ok' : 'bad');
}

function persistSettings() {
  saveSettings(state.settings);
  updateKeyPill();
}

/* --------------------------------- events -------------------------------- */

function wire() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + tab.dataset.view));
      if (tab.dataset.view === 'history') renderHistory();
      window.scrollTo({ top: 0 });
    });
  });

  $('#keyPill').addEventListener('click', () => {
    $$('.tab').find((t) => t.dataset.view === 'settings').click();
    $('#apiKey').focus();
  });

  $$('.segbtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.segbtn').forEach((b) => b.classList.toggle('is-active', b === btn));
      ['photo', 'describe', 'manual'].forEach((mode) => {
        $('#mode-' + mode).hidden = mode !== btn.dataset.mode;
      });
    });
  });

  $('#dayPrev').addEventListener('click', () => { state.date = shiftDay(state.date, -1); renderToday(); });
  $('#dayNext').addEventListener('click', () => { state.date = shiftDay(state.date, 1); renderToday(); });
  $('#dayToday').addEventListener('click', () => { state.date = todayKey(); renderToday(); });
  $('#dayPicker').addEventListener('change', (e) => {
    state.date = e.target.value || todayKey();
    renderToday();
  });

  $('#photoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setStatus('');
      state.photoDataUrl = await fileToDataUrl(file);
      const img = $('#photoPreview');
      img.src = state.photoDataUrl;
      img.hidden = false;
      $('#photoPlaceholder').hidden = true;
      $('#analyzePhoto').disabled = false;
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#analyzePhoto').addEventListener('click', async () => {
    if (!state.photoDataUrl) return;
    cancelReview();
    setBusy(true);
    setStatus('Looking at your plate');
    try {
      const result = await analyzePhoto({
        settings: state.settings,
        dataUrl: state.photoDataUrl,
        hint: $('#photoHint').value.trim(),
      });
      const thumb = await makeThumb(state.photoDataUrl);
      setStatus('');
      showReview(result, { thumb, source: 'photo' });
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      setBusy(false);
    }
  });

  $('#analyzeText').addEventListener('click', async () => {
    const description = $('#describeText').value.trim();
    if (!description) return;
    cancelReview();
    setBusy(true);
    setStatus('Working out the macros');
    try {
      const result = await analyzeText({ settings: state.settings, description });
      setStatus('');
      showReview(result, { source: 'text' });
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      setBusy(false);
    }
  });

  $('#addManual').addEventListener('click', () => {
    const name = $('#mName').value.trim();
    if (!name) return;
    state.entries.push({
      id: newId(),
      ts: Date.now(),
      date: state.date,
      name,
      portion: $('#mPortion').value.trim(),
      calories: Number($('#mKcal').value) || 0,
      protein: Number($('#mP').value) || 0,
      carbs: Number($('#mC').value) || 0,
      fat: Number($('#mF').value) || 0,
      source: 'manual',
      thumb: '',
    });
    saveEntries(state.entries);
    ['#mName', '#mPortion', '#mKcal', '#mP', '#mC', '#mF'].forEach((sel) => { $(sel).value = ''; });
    renderToday();
    renderHistory();
  });

  $('#reviewAdd').addEventListener('click', commitReview);
  $('#reviewCancel').addEventListener('click', cancelReview);

  $('#coachBtn').addEventListener('click', async () => {
    const list = entriesFor(state.date);
    const out = $('#coachOut');
    out.classList.remove('filled');
    out.textContent = 'Thinking…';
    try {
      const text = await dailyInsight({
        settings: state.settings,
        entries: list,
        totals: sumMacros(list),
      });
      out.textContent = text.trim();
      out.classList.add('filled');
    } catch (err) {
      out.textContent = err.message;
    }
  });

  // Settings
  $('#apiKey').addEventListener('change', (e) => {
    state.settings.apiKey = e.target.value.trim();
    persistSettings();
  });
  $('#toggleKey').addEventListener('click', () => {
    const input = $('#apiKey');
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    $('#toggleKey').textContent = hidden ? 'hide' : 'show';
  });
  $('#loadModels').addEventListener('click', () => loadModelList({ force: true }));
  $('#visionFilter').addEventListener('input', () =>
    fillModelSelect('#visionModel', '#visionFilter', '#visionMeta', { visionOnly: true, current: state.settings.visionModel }));
  $('#textFilter').addEventListener('input', () =>
    fillModelSelect('#textModel', '#textFilter', '#textMeta', { visionOnly: false, current: state.settings.textModel }));
  $('#visionModel').addEventListener('change', (e) => {
    state.settings.visionModel = e.target.value;
    persistSettings();
    refreshModelSelects();
  });
  $('#textModel').addEventListener('change', (e) => {
    state.settings.textModel = e.target.value;
    persistSettings();
    refreshModelSelects();
  });
  $('#useSameModel').addEventListener('change', (e) => {
    state.settings.useSameModel = e.target.checked;
    persistSettings();
    refreshModelSelects();
  });

  $('#saveSettings').addEventListener('click', () => {
    state.settings.apiKey = $('#apiKey').value.trim();
    state.settings.goals = {
      calories: Number($('#gKcal').value) || 0,
      protein: Number($('#gP').value) || 0,
      carbs: Number($('#gC').value) || 0,
      fat: Number($('#gF').value) || 0,
    };
    state.settings.notes = $('#gNotes').value.trim();
    persistSettings();
    const status = $('#saveStatus');
    status.textContent = 'saved';
    setTimeout(() => { status.textContent = ''; }, 1600);
    renderToday();
    renderHistory();
  });

  $('#clearData').addEventListener('click', () => {
    if (!confirm('Delete every logged entry? Settings and API key stay put.')) return;
    state.entries = [];
    clearEntries();
    renderToday();
    renderHistory();
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: state.entries }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nutrition-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(incoming)) throw new Error('That file has no entries array.');
      const seen = new Set(state.entries.map((x) => x.id));
      const merged = state.entries.concat(incoming.filter((x) => x && x.id && !seen.has(x.id)));
      state.entries = merged;
      saveEntries(merged);
      renderToday();
      renderHistory();
      alert(`Imported ${merged.length - seen.size} entries.`);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  });
}

/* ---------------------------------- boot --------------------------------- */

wire();
fillSettingsForm();
renderToday();
renderHistory();
loadModelList();
