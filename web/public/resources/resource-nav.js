(() => {
  const inGuide = location.pathname.includes('/guides/');
  const root = inGuide ? '../../' : '../';
  const cta = document.querySelector('.nav .btn');
  if (cta && !document.querySelector('.nav a[data-local-tour]')) {
    cta.insertAdjacentHTML('beforebegin', `<a data-local-tour href="${root}how-it-works.html">How it works</a><a href="${root}sitemap.html">Sitemap</a>`);
  }
  const footerLinks = document.querySelector('.footer span:last-child');
  if (footerLinks && !footerLinks.querySelector('a[href$="sitemap.html"]')) {
    footerLinks.insertAdjacentHTML('beforeend', ` · <a href="${root}how-it-works.html">How it works</a> · <a href="${root}sitemap.html">Sitemap</a>`);
  }
})();
