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
let invoices = store.load('lc_inv');
let invNo = Number(localStorage.getItem('lc_invno')) || 0;
let threshold = Number(localStorage.getItem('lc_threshold')) || 150;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => CURRENCY + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = d => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const monthly = s => s.cycle === 'yearly' ? s.price / 12 : s.price;
const subById = id => subs.find(s => s.id === id);
const last30 = () => usage.filter(u => daysUntil(u.date) >= -30 && daysUntil(u.date) <= 0);
const saveAll = () => { store.save('lc_subs', subs); store.save('lc_usage', usage); store.save('lc_inv', invoices); };
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
  const sub = {
    id: Date.now(),
    name: $('subName').value.trim(),
    price: Number($('subPrice').value),
    cycle: $('subCycle').value,
    nextDate: $('subDate').value,
    url: $('subUrl').value.trim()
  };
  subs.push(sub);
  const inv = ensureInvoice(sub); // invoice is created automatically
  saveAll();
  e.target.reset();
  $('subMsg').textContent = inv ? `Saved. Invoice ${inv.no} created for ${money(inv.amount)}, due ${inv.due}.` : 'Saved.';
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
  invoices = invoices.filter(i => i.subId !== id || i.status === 'Paid'); // keep paid history
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

/* ---------- Invoices (automatic) ---------- */
function addCycle(dateStr, cycle) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // clamp to month end
  return d.toISOString().slice(0, 10);
}

// One invoice per subscription per billing period, so nothing is billed twice.
function ensureInvoice(s) {
  if (invoices.some(i => i.subId === s.id && i.period === s.nextDate)) return null;
  invNo += 1;
  localStorage.setItem('lc_invno', invNo);
  const inv = {
    id: invNo, no: 'INV-' + String(invNo).padStart(4, '0'),
    subId: s.id, subName: s.name, amount: s.price,
    issued: today(), due: s.nextDate, period: s.nextDate, status: 'Confirmed'
  };
  invoices.push(inv);
  return inv;
}

// Runs on every page load: when a billing date passes, move to the next period and invoice it.
function runBilling() {
  let changed = false;
  subs.forEach(s => {
    let n = 0;
    while (daysUntil(s.nextDate) <= 0 && n++ < 240) {
      s.nextDate = addCycle(s.nextDate, s.cycle);
      ensureInvoice(s);
      changed = true;
    }
  });
  if (changed) saveAll();
}

const isOverdue = i => i.status !== 'Paid' && daysUntil(i.due) < 0;

$('invList').addEventListener('click', e => {
  const id = Number(e.target.dataset.pay);
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = 'Paid';
  inv.paidDate = today();
  inv.method = $('payMethod').value;
  saveAll(); render();
});

function renderAccount() {
  const sum = list => list.reduce((t, i) => t + i.amount, 0);
  const paid = invoices.filter(i => i.status === 'Paid');
  const unpaid = invoices.filter(i => i.status !== 'Paid');
  $('accStats').innerHTML = `
    <div><b>${subs.length}</b><span>active subscriptions</span></div>
    <div><b>${money(subs.reduce((t, s) => t + monthly(s), 0))}</b><span>recurring per month</span></div>
    <div><b>${money(sum(paid))}</b><span>paid so far</span></div>
    <div><b>${money(sum(unpaid))}</b><span>outstanding</span></div>
    <div><b>${invoices.filter(isOverdue).length}</b><span>overdue invoices</span></div>`;

  $('accSubs').innerHTML = subs.length ? [...subs].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).map(s => {
    const latest = invoices.filter(i => i.subId === s.id).sort((a, b) => b.id - a.id)[0];
    const d = daysUntil(s.nextDate);
    const state = !latest ? 'No invoice yet' : isOverdue(latest) ? 'Latest invoice overdue' : latest.status === 'Paid' ? 'Latest invoice paid' : 'Invoice awaiting payment';
    const cls = latest && isOverdue(latest) ? 'warn' : latest && latest.status === 'Paid' ? 'keep' : 'soon';
    return `<li class="${cls}"><div><span class="name">${esc(s.name)}</span><br>
      <span class="meta">Active · ${money(s.price)} ${s.cycle} · next bill ${esc(s.nextDate)} (${d <= 0 ? 'now' : 'in ' + d + ' days'})</span></div>
      <span class="verdict">${state}</span></li>`;
  }).join('') : emptyRow('No subscriptions yet. Add one and its invoice appears here.');

  $('invList').innerHTML = invoices.length ? [...invoices].sort((a, b) => b.id - a.id).map(i => {
    const status = i.status === 'Paid' ? `Paid ${esc(i.paidDate)} by ${esc(i.method)}` : isOverdue(i) ? 'Overdue' : 'Awaiting payment';
    const cls = i.status === 'Paid' ? 'keep' : isOverdue(i) ? 'warn' : 'soon';
    return `<li class="${cls}"><div><span class="name">${esc(i.no)} · ${esc(i.subName)}</span><br>
      <span class="meta">${money(i.amount)} · issued ${esc(i.issued)} · due ${esc(i.due)}</span></div>
      <div class="actions"><span class="verdict">${status}</span>
      ${i.status === 'Paid' ? '' : `<button class="pay" data-pay="${i.id}">Mark paid</button>`}</div></li>`;
  }).join('') : emptyRow('No invoices yet.');
}

function render() { renderSubs(); renderUsage(); renderDashboard(); renderAccount(); }

/* ---------- Start ---------- */
runBilling();
const start = location.hash.slice(1);
show(['subscriptions', 'usage', 'dashboard', 'account'].includes(start) ? start : (subs.length ? 'dashboard' : 'subscriptions'));