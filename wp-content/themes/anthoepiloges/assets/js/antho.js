/* Ανθοεπιλογές: reviews slider + pickup toggle on the checkout. */
(function ($) {
  'use strict';

  // Reviews slider
  var track = document.querySelector('.antho-track');
  if (track) {
    var slides = track.children.length, i = 0, timer = null;
    var dots = document.querySelectorAll('.antho-dots button');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var go = function (n) {
      i = (n + slides) % slides;
      track.style.transform = 'translateX(-' + (i * 100) + '%)';
      dots.forEach(function (d, j) { d.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
    };
    var auto = function () { clearInterval(timer); if (!reduce) { timer = setInterval(function () { go(i + 1); }, 6000); } };
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.dataset.i); auto(); }); });
    var slider = document.querySelector('.antho-slider'), sx = null;
    slider.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (sx === null) { return; }
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); auto(); }
      sx = null;
    });
    slider.addEventListener('mouseenter', function () { clearInterval(timer); });
    slider.addEventListener('mouseleave', auto);
    go(0); auto();
  }

  // Checkout: hide the recipient address when "pickup" is the shipping method.
  var togglePickup = function () {
    var chosen = $('input[name^="shipping_method"]:checked').val() || $('input[name^="shipping_method"]').first().val() || '';
    var pickup = chosen.indexOf('pickup') !== -1;
    $('#shipping_address_1_field, #shipping_city_field').toggleClass('antho-addr-hidden', pickup);
  };
  $(document.body).on('updated_checkout', togglePickup);
  $(document.body).on('change', 'input[name^="shipping_method"]', togglePickup);
  $(togglePickup);
})(jQuery);

/* Shop menu: highlight the section in view, keep its tab visible, search. */
(function () {
  'use strict';
  var nav = document.querySelector('.am-nav');
  if (!nav) { return; }
  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var secs = links.map(function (a) { return document.getElementById('s-' + a.dataset.s); });
  var current = null;
  var setOn = function (slug) {
    if (slug === current) { return; }
    current = slug;
    links.forEach(function (a) {
      var on = a.dataset.s === slug;
      a.classList.toggle('on', on);
      if (on) { nav.scrollLeft = a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2; }
    });
  };
  var onScroll = function () {
    var bar = document.getElementById('am-bar');
    var line = (bar ? bar.getBoundingClientRect().bottom : 0) + 40;
    var pick = null;
    secs.forEach(function (s) { if (s && !s.hidden && s.getBoundingClientRect().top <= line) { pick = s.id.slice(2); } });
    setOn(pick || (secs[0] && secs[0].id.slice(2)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var fold = function (t) { return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ'); };
  var q = document.getElementById('am-q');
  var none = document.getElementById('am-none');
  if (q) {
    q.addEventListener('input', function () {
      var t = fold(q.value.trim());
      var any = false;
      secs.forEach(function (s, i) {
        if (!s) { return; }
        var shown = 0;
        s.querySelectorAll('.am-item').forEach(function (it) {
          var ok = !t || fold(it.dataset.name).indexOf(t) !== -1;
          it.hidden = !ok; if (ok) { shown++; }
        });
        s.hidden = shown === 0;
        links[i].hidden = shown === 0;
        if (shown) { any = true; }
      });
      if (none) { none.hidden = any; }
      onScroll();
    });
  }
})();
