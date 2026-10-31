/* Last Call – frontend logic.
   Data lives in the browser (localStorage) for now. When Flask + SQLite are ready,
   replace the `store` object below with fetch() calls to your API. */

const CURRENCY = '₹';
const PRESETS = [
  { name: 'Netflix', url: 'https://www.netflix.com' },
  { name: 'Spotify', url: 'https://www.spotify.com' },
  { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
  { name: 'YouTube Premium', url: 'https://www.youtube.com/premium' },
  { name: 'Disney+ Hotstar', url: 'https://www.hotstar.com' }
];

const store = {
  load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

let subs = store.load('lc_subs');
let usage = store.load('lc_usage');
let threshold = Number(localStorage.getItem('lc_threshold')) || 150;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => CURRENCY + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = d => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const monthly = s => s.cycle === 'yearly' ? s.price / 12 : s.price;
const subById = id => subs.find(s => s.id === id);
const last30 = () => usage.filter(u => daysUntil(u.date) >= -30 && daysUntil(u.date) <= 0);
const saveAll = () => { store.save('lc_subs', subs); store.save('lc_usage', usage); };
const emptyRow = msg => `<li class="empty">${msg}</li>`;

/* ---------- Tabs ---------- */
function show(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === tab));
  document.querySelectorAll('#nav button').forEach(b =>
    b.setAttribute('aria-current', b.dataset.tab === tab ? 'true' : 'false'));
  history.replaceState(null, '', '#' + tab);
  render();
}
$('nav').addEventListener('click', e => { if (e.target.dataset.tab) show(e.target.dataset.tab); });

/* ---------- 1. Subscription management ---------- */
$('presets').innerHTML = PRESETS.map((p, i) => `<button type="button" data-i="${i}">${esc(p.name)}</button>`).join('');
$('presets').addEventListener('click', e => {
  const p = PRESETS[e.target.dataset.i];
  if (!p) return;
  $('subName').value = p.name;
  $('subUrl').value = p.url;
  $('subPrice').focus();
});

$('subForm').addEventListener('submit', e => {
  e.preventDefault();
  subs.push({
    id: Date.now(),
    name: $('subName').value.trim(),
    price: Number($('subPrice').value),
    cycle: $('subCycle').value,
    nextDate: $('subDate').value,
    url: $('subUrl').value.trim()
  });
  saveAll();
  e.target.reset();
  render();
});

function renderSubs() {
  $('subList').innerHTML = subs.length ? subs.map(s => `
    <li>
      <div><span class="name">${esc(s.name)}</span><br>
        <span class="meta">${money(s.price)} ${s.cycle} · next payment ${esc(s.nextDate)}</span></div>
      <div class="actions">
        ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">Open site</a>` : ''}
        <button class="link" data-del-sub="${s.id}">Remove</button>
      </div>
    </li>`).join('') : emptyRow('No subscriptions yet. Pick a service above to start.');
}
$('subList').addEventListener('click', e => {
  const id = Number(e.target.dataset.delSub);
  if (!id) return;
  subs = subs.filter(s => s.id !== id);
  usage = usage.filter(u => u.subId !== id);
  saveAll(); render();
});

/* ---------- 2. Usage tracking ---------- */
$('useForm').addEventListener('submit', e => {
  e.preventDefault();
  usage.push({
    id: Date.now(),
    subId: Number($('useSub').value),
    date: $('useDate').value,
    minutes: Number($('useMin').value)
  });
  saveAll();
  $('useMin').value = '';
  render();
});

function stats(s) {
  const mine = last30().filter(u => u.subId === s.id);
  const uses = mine.length;
  const minutes = mine.reduce((t, u) => t + u.minutes, 0);
  return { uses, minutes, cpu: uses ? monthly(s) / uses : null };
}

function renderUsage() {
  const cur = $('useSub').value;
  $('useSub').innerHTML = subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  if (cur) $('useSub').value = cur;
  if (!$('useDate').value) $('useDate').value = today();

  $('useSummary').innerHTML = subs.length ? subs.map(s => {
    const st = stats(s);
    return `<li><span class="name">${esc(s.name)}</span>
      <span class="meta">${st.uses} uses · ${st.minutes} min · ${st.cpu === null ? 'no uses logged' : money(st.cpu) + ' per use'}</span></li>`;
  }).join('') : emptyRow('Add a subscription first.');

  const log = [...usage].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  $('useLog').innerHTML = log.length ? log.map(u => {
    const s = subById(u.subId);
    return `<li><div><span class="name">${s ? esc(s.name) : 'Removed'}</span>
      <span class="meta"> · ${esc(u.date)} · ${u.minutes} min</span></div>
      <button class="link" data-del-use="${u.id}">Delete</button></li>`;
  }).join('') : emptyRow('Nothing logged yet.');
}
$('useLog').addEventListener('click', e => {
  const id = Number(e.target.dataset.delUse);
  if (!id) return;
  usage = usage.filter(u => u.id !== id);
  saveAll(); render();
});

/* ---------- 3. Dashboard ---------- */
$('threshold').value = threshold;
$('threshold').addEventListener('change', e => {
  threshold = Number(e.target.value) || 150;
  localStorage.setItem('lc_threshold', threshold);
  render();
});

function renderDashboard() {
  const sorted = [...subs].sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const total = subs.reduce((t, s) => t + monthly(s), 0);

  // Reminders: anything due in the next 3 days
  const soon = sorted.filter(s => { const d = daysUntil(s.nextDate); return d >= 0 && d <= 3; });
  $('reminders').innerHTML = soon.map(s => {
    const d = daysUntil(s.nextDate);
    return `<div class="alert" role="alert">${esc(s.name)} renews ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'} (${money(s.price)}).</div>`;
  }).join('');

  $('stats').innerHTML = `
    <div><b>${subs.length}</b><span>subscriptions</span></div>
    <div><b>${money(total)}</b><span>per month</span></div>
    <div><b>${money(total * 12)}</b><span>per year</span></div>`;

  $('upcoming').innerHTML = sorted.length ? sorted.map(s => {
    const d = daysUntil(s.nextDate);
    const label = d < 0 ? `${-d} days ago, update the date` : d === 0 ? 'today' : `in ${d} days`;
    return `<li class="${d >= 0 && d <= 3 ? 'soon' : ''}"><span class="name">${esc(s.name)}</span>
      <span class="meta">${money(s.price)} · ${esc(s.nextDate)} · ${label}</span></li>`;
  }).join('') : emptyRow('Nothing coming up.');

  $('verdicts').innerHTML = subs.length ? subs.map(s => {
    const st = stats(s);
    let cls, text;
    if (!st.uses) { cls = 'warn'; text = 'Last call: no use in 30 days'; }
    else if (st.cpu > threshold) { cls = 'warn'; text = 'Last call: costs too much per use'; }
    else { cls = 'keep'; text = 'Worth keeping'; }
    return `<li class="${cls}"><div><span class="name">${esc(s.name)}</span><br>
      <span class="meta">${st.uses} uses · ${st.cpu === null ? 'no cost per use yet' : money(st.cpu) + ' per use'}</span></div>
      <span class="verdict">${text}</span></li>`;
  }).join('') : emptyRow('Add subscriptions and log usage to see verdicts.');
}

function render() { renderSubs(); renderUsage(); renderDashboard(); }

/* ---------- Start ---------- */
const start = location.hash.slice(1);
show(['subscriptions', 'usage', 'dashboard'].includes(start) ? start : (subs.length ? 'dashboard' : 'subscriptions'));