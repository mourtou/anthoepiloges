/* Ανθοεπιλογές static shop: cart in the browser, orders sent to WhatsApp. */
(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('script[src*="antho-static.js"]');
  var ROOT = script.getAttribute('src').replace(/static\/antho-static\.js.*$/, '');
  var KEY = 'antho_cart_v1';
  var DATA = null;

  var store = {
    get: function () { try { return JSON.parse(window.localStorage.getItem(KEY) || '[]'); } catch (e) { return memory; } },
    set: function (v) { memory = v; try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  var memory = [];

  function money(v) {
    return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function linePrice(it) {
    var p = DATA.p[it.sku];
    if (!p) { return 0; }
    var base = 0;
    p.s.forEach(function (z) { if ((z[0] || '') === (it.size || '')) { base = z[1]; } });
    if (!it.size && p.s.length) { base = p.s[0][1]; }
    p.o.forEach(function (o) {
      var chosen = it.opts && it.opts[o[0]];
      o[1].forEach(function (v) { if (v[0] === chosen) { base += v[1]; } });
    });
    return base;
  }
  function cartCount() { return store.get().reduce(function (n, it) { return n + it.qty; }, 0); }
  function cartTotal() { return store.get().reduce(function (n, it) { return n + linePrice(it) * it.qty; }, 0); }

  function add(item) {
    var cart = store.get();
    var key = item.sku + '|' + (item.size || '') + '|' + JSON.stringify(item.opts || {});
    var found = cart.filter(function (c) { return c.key === key; })[0];
    if (found) { found.qty += item.qty; } else { item.key = key; cart.push(item); }
    store.set(cart);
    refresh();
    toast('Προστέθηκε στο καλάθι: <strong>' + esc(DATA.p[item.sku].n) + '</strong>', true);
  }

  var toastEl, toastTimer;
  function toast(html, withLink) {
    if (!toastEl) { toastEl = el('<div class="as-toast" role="status" aria-live="polite"></div>'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<span>' + html + '</span>' + (withLink ? '<a href="' + ROOT + 'cart/">Καλάθι</a>' : '');
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 3500);
  }

  /* Header cart, mobile footer bar and the shop's bottom bar. */
  function refresh() {
    var n = cartCount();
    var total = DATA ? cartTotal() : 0;
    document.querySelectorAll('.antho-count, .site-header-cart .count, .storefront-handheld-footer-bar .count').forEach(function (c) { c.textContent = n; });
    document.querySelectorAll('.site-header-cart .amount').forEach(function (c) { c.textContent = money(total); });
    document.querySelectorAll('.am-cartbar').forEach(function (bar) {
      if (!n) { bar.hidden = true; bar.innerHTML = ''; return; }
      bar.hidden = false;
      bar.innerHTML = '<a href="' + ROOT + 'cart/"><span class="am-cb-n">' + n + '</span><span>Δείτε το καλάθι</span><span class="am-cb-t">' + money(total) + '</span></a>';
    });
  }

  /* "+" buttons on the shop menu and product grids (products with one price). */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.ajax_add_to_cart, a.add_to_cart_button');
    if (!a || !DATA) { return; }
    var sku = a.getAttribute('data-product_sku');
    var p = sku && DATA.p[sku];
    if (!p) { return; }
    e.preventDefault();
    if (p.s.filter(function (z) { return z[0]; }).length > 1 || p.o.length) { window.location.href = ROOT + p.u; return; }
    add({ sku: sku, size: p.s[0] ? p.s[0][0] : null, opts: {}, qty: 1 });
  });

  /* Product page buy box. */
  function buyBox(box) {
    var sku = box.getAttribute('data-sku');
    var p = DATA.p[sku];
    if (!p) { box.innerHTML = '<p>Για παραγγελία επικοινωνήστε μαζί μας στο WhatsApp.</p>'; return; }
    var sizes = p.s.filter(function (z) { return z[0]; });
    var h = '';
    if (sizes.length > 1) {
      h += '<fieldset class="as-field"><legend>Μέγεθος</legend><div class="as-pills">';
      sizes.forEach(function (z, i) {
        h += '<label class="as-pill"><input type="radio" name="as-size" value="' + esc(z[0]) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(z[0]) + '<small>' + money(z[1]) + '</small></span></label>';
      });
      h += '</div></fieldset>';
    }
    p.o.forEach(function (o, k) {
      h += '<p class="as-field"><label for="as-opt-' + k + '">' + esc(o[0]) + '</label><select id="as-opt-' + k + '" data-attr="' + esc(o[0]) + '">';
      o[1].forEach(function (v) { h += '<option value="' + esc(v[0]) + '">' + esc(v[0]) + (v[1] ? ' (+' + money(v[1]) + ')' : '') + '</option>'; });
      h += '</select></p>';
    });
    h += '<div class="as-row"><div class="as-qty"><button type="button" data-d="-1" aria-label="Λιγότερα">−</button><input type="number" min="1" max="99" value="1" aria-label="Ποσότητα"><button type="button" data-d="1" aria-label="Περισσότερα">+</button></div>'
      + '<button type="button" class="button alt as-add">Προσθήκη στο καλάθι</button></div><p class="as-price"></p>';
    box.innerHTML = h;
    var qty = box.querySelector('.as-qty input');
    function current() {
      var r = box.querySelector('input[name="as-size"]:checked');
      var opts = {};
      box.querySelectorAll('select[data-attr]').forEach(function (s) { opts[s.getAttribute('data-attr')] = s.value; });
      return { sku: sku, size: r ? r.value : (p.s[0] ? p.s[0][0] : null), opts: opts, qty: Math.max(1, Math.min(99, parseInt(qty.value, 10) || 1)) };
    }
    function show() { var it = current(); box.querySelector('.as-price').innerHTML = 'Σύνολο: <strong>' + money(linePrice(it) * it.qty) + '</strong>'; }
    box.addEventListener('change', show);
    box.addEventListener('input', show);
    box.querySelectorAll('.as-qty button').forEach(function (b) {
      b.addEventListener('click', function () { qty.value = Math.max(1, Math.min(99, (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute('data-d'), 10))); show(); });
    });
    box.querySelector('.as-add').addEventListener('click', function () { add(current()); });
    show();
  }

  /* Cart page with the order form. */
  var SLOTS = ['09:00 – 12:00', '12:00 – 15:00', '15:00 – 18:00', '18:00 – 21:00', 'Όποτε βολεύει'];
  var METHODS = ['Παράδοση στο Γέρι', 'Παράδοση στη Λευκωσία', 'Παράδοση στην υπόλοιπη Κύπρο', 'Παραλαβή από το κατάστημα'];
  function today() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function greekDate(ymd) {
    var days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
    var d = new Date(ymd + 'T12:00:00');
    return days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function itemText(it) {
    var p = DATA.p[it.sku];
    var bits = [];
    if (it.size) { bits.push(it.size); }
    Object.keys(it.opts || {}).forEach(function (k) { bits.push(it.opts[k]); });
    return p.n + (bits.length ? ' (' + bits.join(', ') + ')' : '');
  }

  function cartPage(root) {
    var cart = store.get().filter(function (it) { return DATA.p[it.sku]; });
    if (!cart.length) {
      root.innerHTML = '<h1>Καλάθι</h1><div class="as-empty"><p>Το καλάθι σας είναι άδειο.</p><a class="button" href="' + ROOT + 'shop/">Δείτε το κατάστημα</a></div>';
      return;
    }
    var h = '<h1>Καλάθι</h1><ul class="as-lines">';
    cart.forEach(function (it, i) {
      var p = DATA.p[it.sku];
      var bits = [];
      if (it.size) { bits.push(it.size); }
      Object.keys(it.opts || {}).forEach(function (k) { bits.push(k + ': ' + it.opts[k]); });
      h += '<li class="as-line"><a class="as-thumb" href="' + ROOT + p.u + '">' + (p.t ? '<img src="' + ROOT + p.t + '" alt="" loading="lazy">' : '') + '</a>'
        + '<div class="as-line-body"><a class="as-name" href="' + ROOT + p.u + '">' + esc(p.n) + '</a>' + (bits.length ? '<span class="as-bits">' + esc(bits.join(' · ')) + '</span>' : '')
        + '<div class="as-line-foot"><div class="as-qty"><button type="button" data-i="' + i + '" data-d="-1" aria-label="Λιγότερα">−</button><span>' + it.qty + '</span><button type="button" data-i="' + i + '" data-d="1" aria-label="Περισσότερα">+</button></div>'
        + '<strong>' + money(linePrice(it) * it.qty) + '</strong></div></div>'
        + '<button type="button" class="as-remove" data-i="' + i + '" aria-label="Αφαίρεση">×</button></li>';
    });
    h += '</ul><p class="as-total">Σύνολο προϊόντων: <strong>' + money(cartTotal()) + '</strong></p>';
    h += '<form class="as-form" novalidate>'
      + '<h2>Πότε και πού;</h2>'
      + '<fieldset class="as-field"><legend>Τρόπος</legend><div class="as-pills">' + METHODS.map(function (m, i) { return '<label class="as-pill"><input type="radio" name="method" value="' + esc(m) + '"' + (i === 1 ? ' checked' : '') + '><span>' + esc(m) + '</span></label>'; }).join('') + '</div></fieldset>'
      + '<div class="as-2"><p class="as-field"><label for="as-date">Ημερομηνία *</label><input id="as-date" name="date" type="date" min="' + today() + '" value="' + today() + '" required></p>'
      + '<p class="as-field"><label for="as-slot">Ώρα *</label><select id="as-slot" name="slot">' + SLOTS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></p></div>'
      + '<h2>Τα στοιχεία σας</h2>'
      + '<div class="as-2"><p class="as-field"><label for="as-name">Ονοματεπώνυμο *</label><input id="as-name" name="name" autocomplete="name" required></p>'
      + '<p class="as-field"><label for="as-phone">Τηλέφωνο *</label><input id="as-phone" name="phone" type="tel" autocomplete="tel" required></p></div>'
      + '<div class="as-recipient"><h2>Παραλήπτης</h2>'
      + '<div class="as-2"><p class="as-field"><label for="as-rname">Ονοματεπώνυμο παραλήπτη *</label><input id="as-rname" name="rname"></p>'
      + '<p class="as-field"><label for="as-rphone">Τηλέφωνο παραλήπτη *</label><input id="as-rphone" name="rphone" type="tel"></p></div>'
      + '<p class="as-field"><label for="as-addr">Διεύθυνση παράδοσης *</label><input id="as-addr" name="addr" placeholder="Οδός, αριθμός, όροφος/διαμέρισμα"></p>'
      + '<p class="as-field"><label for="as-city">Περιοχή / Πόλη *</label><input id="as-city" name="city"></p></div>'
      + '<p class="as-field"><label for="as-card">Μήνυμα για την κάρτα ευχών</label><textarea id="as-card" name="card" rows="3" maxlength="300" placeholder="π.χ. Χρόνια σου πολλά! Με αγάπη, Μαρία"></textarea></p>'
      + '<p class="as-field"><label for="as-notes">Σημειώσεις</label><textarea id="as-notes" name="notes" rows="2" placeholder="π.χ. κουδούνι, όροφος"></textarea></p>'
      + '<p class="as-terms"><label><input type="checkbox" name="terms" required> Έχω διαβάσει τους <a href="' + ROOT + 'oroi-xrisis/" target="_blank">όρους χρήσης</a>.</label></p>'
      + '<p class="as-note">Το κόστος παράδοσης και τον τρόπο πληρωμής θα σας τα επιβεβαιώσουμε στο WhatsApp.</p>'
      + '<p class="as-error" role="alert" hidden></p>'
      + '<button type="submit" class="as-wa">' + waIcon + 'Αποστολή παραγγελίας στο WhatsApp</button></form>';
    root.innerHTML = h;

    root.querySelectorAll('.as-qty button, .as-remove').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = store.get(); var i = parseInt(b.getAttribute('data-i'), 10);
        if (b.classList.contains('as-remove')) { c.splice(i, 1); } else { c[i].qty = Math.max(0, c[i].qty + parseInt(b.getAttribute('data-d'), 10)); if (!c[i].qty) { c.splice(i, 1); } }
        store.set(c); refresh(); cartPage(root);
      });
    });
    var form = root.querySelector('.as-form');
    var rec = root.querySelector('.as-recipient');
    function pickup() { return form.method.value === METHODS[3]; }
    function toggle() { rec.querySelectorAll('#as-addr, #as-city').forEach(function (i) { i.closest('p').hidden = pickup(); }); }
    form.addEventListener('change', toggle); toggle();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form, errs = [];
      var v = function (n) { return (f[n].value || '').trim(); };
      if (!v('date') || v('date') < today()) { errs.push('Επιλέξτε σωστή ημερομηνία.'); }
      if (!v('name')) { errs.push('Συμπληρώστε το ονοματεπώνυμό σας.'); }
      if (v('phone').replace(/\D/g, '').length < 8) { errs.push('Συμπληρώστε το τηλέφωνό σας.'); }
      if (!v('rname')) { errs.push('Συμπληρώστε το όνομα του παραλήπτη.'); }
      if (v('rphone').replace(/\D/g, '').length < 8) { errs.push('Συμπληρώστε το τηλέφωνο του παραλήπτη.'); }
      if (!pickup() && (!v('addr') || !v('city'))) { errs.push('Συμπληρώστε τη διεύθυνση και την περιοχή.'); }
      if (!f.terms.checked) { errs.push('Αποδεχτείτε τους όρους χρήσης.'); }
      var box = root.querySelector('.as-error');
      if (errs.length) { box.hidden = false; box.innerHTML = errs.map(esc).join('<br>'); box.scrollIntoView({ block: 'center' }); return; }
      box.hidden = true;
      var d = new Date();
      var ref = 'W' + String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
      var L = ['*Νέα παραγγελία ' + ref + '* από την ιστοσελίδα', ''];
      store.get().forEach(function (it) { L.push('• ' + it.qty + ' × ' + itemText(it) + ' — ' + money(linePrice(it) * it.qty).replace(' ', ' ')); });
      L.push('', '*Σύνολο προϊόντων: ' + money(cartTotal()).replace(' ', ' ') + '*', '');
      L.push('*Πελάτης:* ' + v('name') + ', ' + v('phone'));
      L.push('*Τρόπος:* ' + f.method.value);
      L.push('*Ημερομηνία:* ' + greekDate(v('date')));
      L.push('*Ώρα:* ' + v('slot'));
      L.push('*Παραλήπτης:* ' + v('rname') + ' ' + v('rphone'));
      if (!pickup()) { L.push('*Διεύθυνση:* ' + v('addr') + ', ' + v('city')); }
      if (v('card')) { L.push('*Κάρτα ευχών:* ' + v('card')); }
      if (v('notes')) { L.push('*Σημειώσεις:* ' + v('notes')); }
      var link = 'https://wa.me/' + DATA.wa + '?text=' + encodeURIComponent(L.join('\n'));
      store.set([]); refresh();
      root.innerHTML = '<div class="as-done"><h1>Τελευταίο βήμα</h1><p>Η παραγγελία σας ' + ref + ' είναι έτοιμη. Πατήστε το κουμπί, και μετά <strong>«Αποστολή»</strong> στο WhatsApp. Θα σας απαντήσουμε για επιβεβαίωση και πληρωμή.</p>'
        + '<a class="as-wa" href="' + link + '" target="_blank" rel="noopener">' + waIcon + 'Άνοιγμα WhatsApp</a>'
        + '<p class="as-note">Δεν έχετε WhatsApp; Καλέστε μας στο 96 456865.</p></div>';
      window.scrollTo(0, 0);
      window.location.href = link;
    });
  }

  var waIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.3 28.8l6.6-1.7A12.7 12.7 0 1 0 16 3.2zm0 23.2c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.5 10.5 0 1 1 16 26.4zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5.1 2.8 1.1 3.4.9 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';

  memory = (function () { try { return JSON.parse(window.localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } })();
  fetch(ROOT + 'static/products.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    refresh();
    document.querySelectorAll('.as-buy[data-sku]').forEach(buyBox);
    var c = document.getElementById('as-cart');
    if (c) { cartPage(c); }
  });
})();
