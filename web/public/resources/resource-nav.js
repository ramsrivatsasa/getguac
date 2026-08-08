/* resource-nav.js — mounts the shared nav (gg-nav.js) on the 11 resources pages.
 *
 * This file used to build its own four-link nav by APPENDING to whatever markup
 * the page shipped, computing a `root` prefix (`../` vs `../../` for guides) to
 * point at .html files. Two things were wrong with that: the depth-dependent
 * prefix was a standing source of broken links, and commit 26a9b68 switched the
 * generated output to real routes without updating this source — so source and
 * output silently disagreed. Both problems disappear by rendering the one
 * canonical menu from gg-nav.js, which uses absolute paths.
 */
(function () {
  function mount() {
    ggMountNav();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
