/* small helpers shared by every screen */
(function () {
  const U = (window.U = {});
  U.norm = s => (s == null ? '' : String(s).split(/\s+/).filter(Boolean).join(' ').toLowerCase());
  U.sval = v => (v == null ? '' : String(v).trim());
  U.clean = s => (s == null ? '' : String(s).split(/\s+/).filter(Boolean).join(' '));

  /* h('div', {class:'x', onclick: fn}, child, 'text', [more]) -> element */
  U.h = function (tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    const add = c => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c.nodeType ? c : document.createTextNode(String(c))); };
    kids.forEach(add);
    return el;
  };

  /* ---- dates: always 'YYYY-MM-DD' strings; shown as DD/MM/YYYY */
  U.pad = n => String(n).padStart(2, '0');
  U.todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); };
  U.parseIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  U.addDays = (iso, n) => new Date(U.parseIso(iso).getTime() + n * 864e5).toISOString().slice(0, 10);
  U.dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  U.weekday = iso => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][U.parseIso(iso).getUTCDay()];
  U.finYear = iso => {                                    // April - March, e.g. 26-27
    const y = +iso.slice(0, 4) % 100, m = +iso.slice(5, 7);
    return m >= 4 ? U.pad(y) + '-' + U.pad((y + 1) % 100) : U.pad((y + 99) % 100) + '-' + U.pad(y);
  };
  U.invoiceNo = (serial, iso) => 'IS/' + parseInt(serial, 10) + '/' + U.finYear(iso);

  /* ---- numbers */
  U.fmtMobile = raw => {                                  // '' = empty, null = not valid, else '98765 43210'
    let d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    else if (d.length === 11 && d[0] === '0') d = d.slice(1);
    return d.length === 10 ? d.slice(0, 5) + ' ' + d.slice(5) : null;
  };
  U.cleanGstin = s => String(s || '').replace(/\s+/g, '').toUpperCase();
  U.validGstin = g => /^[A-Z0-9]{15}$/.test(g) || /^[A-Z]{5}\d{4}[A-Z]$/.test(g);
  U.mul = (q, r) => Math.round(q * r * 100) / 100;
  U.fmtNum = x => (Number.isInteger(x) ? String(x) : String(+Number(x).toFixed(2)));
  U.inr = x => '₹ ' + Math.round(x).toLocaleString('en-IN');
  U.inr2 = x => '₹ ' + Number(x).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  U.marketCode = m => { m = m.toUpperCase(); return (m.slice(0, 4).padEnd(4, '_') + m.slice(-2)).replace(/ /g, '_'); };
  U.counterCode = (m, n) => { n = n.toUpperCase(); return (U.marketCode(m) + '/' + n.slice(0, 5).padEnd(5, '_') + n.slice(-1)).replace(/ /g, '_'); };

  /* ---- search ranking (starts with > word starts > contains > close spelling) */
  const bigrams = s => { const o = new Map(); for (let i = 0; i < s.length - 1; i++) { const b = s.slice(i, i + 2); o.set(b, (o.get(b) || 0) + 1); } return o; };
  const dice = (a, b) => {
    if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
    const A = bigrams(a), B = bigrams(b); let hit = 0;
    A.forEach((n, k) => { hit += Math.min(n, B.get(k) || 0); });
    return (2 * hit) / (a.length - 1 + b.length - 1);
  };
  U.rank = function (q, items, limit = 300) {
    q = U.norm(q);
    if (!q) return items.slice(0, limit);
    const out = [], rest = [];
    items.forEach((it, n) => {
      const s = it.toLowerCase(), words = s.split(/[\s/_\-]+/).filter(Boolean);
      let sc = null;
      if (s.startsWith(q)) sc = 0; else if (words.some(w => w.startsWith(q))) sc = 1; else if (s.includes(q)) sc = 2;
      else if (q.split(' ').every(t => s.includes(t))) sc = 2.5;
      if (sc == null) rest.push([n, it, s, words]); else out.push([sc, n, it]);
    });
    if (out.length < 8 && q.length >= 3) {
      const thr = q.length <= 4 ? 0.6 : 0.5;
      rest.forEach(([n, it, s, words]) => {
        let best = 0;
        [s, s.slice(0, q.length + 1), ...words].forEach(c => { best = Math.max(best, dice(q, c)); });
        if (best >= thr) out.push([3 + (1 - best), n, it]);
      });
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out.slice(0, limit).map(x => x[2]);
  };

  U.toast = function (msg, kind) {
    const t = U.h('div', { class: 'toast ' + (kind || '') }, msg);
    document.body.append(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4200);
  };
  U.uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
})();
