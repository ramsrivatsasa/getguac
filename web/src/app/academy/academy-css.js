// Styles for /academy and /academy/[slug].
//
// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THE STRING. React escapes
// >, &, quotes and non-ASCII differently on the server than in the browser,
// which turns a <style> block into a hydration mismatch (see /learn RES_CSS).
// Every element carries its own class; no descendant selectors that could
// outrank a later class. Neutral structure, green only for small accents and the
// site's standard dark CTA colour.
export const ACADEMY_CSS = `
.ac-page { background: #fbfcfa; color: #15281c; padding-bottom: 64px; }
.ac-wrap { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
.ac-crumb { display: flex; gap: 8px; align-items: center; padding: 22px 0 14px; font-size: 12px; font-weight: 600; color: #7c8a80; }
.ac-crumb-link { color: #7c8a80; text-decoration: none; }
.ac-crumb-link:hover { color: #138a48; }
.ac-hero { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; align-items: stretch; margin-bottom: 26px; }
.ac-hero-copy { padding: 6px 0; }
.ac-eyebrow { display: inline-block; color: #138a48; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.ac-h1 { margin: 8px 0 12px; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: clamp(32px, 4.4vw, 52px); line-height: 1.02; font-weight: 800; letter-spacing: -.03em; }
.ac-lede { margin: 0; max-width: 620px; color: #405449; font-size: 16px; line-height: 1.55; }
.ac-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.ac-stat { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #e4e8e4; border-radius: 999px; background: #fff; font-size: 13px; font-weight: 700; color: #33463a; }
.ac-progress-card { min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; padding: 20px; border: 1px solid #e4e8e4; border-radius: 20px; background: #fff; box-shadow: 0 14px 30px -26px rgba(16,40,26,.5); }
.ac-progress-label { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #5f6d63; }
.ac-progress-num { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 34px; font-weight: 800; line-height: 1; }
.ac-progress-of { font-size: 15px; font-weight: 700; color: #5f6d63; }
.ac-bar { height: 8px; border-radius: 999px; background: #edf0ec; overflow: hidden; }
.ac-bar-fill { height: 100%; min-width: 8px; border-radius: 999px; background: #138a48; transition: width .3s; }
.ac-continue { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; padding: 10px 14px; border-radius: 12px; background: #12341f; color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; }
.ac-continue:hover { background: #1b4a2c; }
.ac-continue-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 26px; align-items: start; }
.ac-side { position: sticky; top: 84px; padding: 12px; border: 1px solid #e4e8e4; border-radius: 18px; background: #fff; }
.ac-side-title { margin: 4px 8px 8px; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #8a968e; }
.ac-track-btn { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 40px; padding: 8px 10px; border: 0; border-radius: 10px; background: transparent; color: #33463a; font: inherit; font-size: 13.5px; font-weight: 650; text-align: left; text-decoration: none; cursor: pointer; }
.ac-track-btn:hover { background: #f3f5f2; }
.ac-track-btn-on { background: #15281c; color: #fff; }
.ac-track-btn-on:hover { background: #15281c; }
.ac-track-name { flex: 1; min-width: 0; }
.ac-track-count { font-size: 12px; font-weight: 700; opacity: .7; }
.ac-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.ac-search { flex: 1; max-width: 420px; min-height: 44px; padding: 10px 14px; border: 1px solid #d9dfd9; border-radius: 12px; background: #fff; font: inherit; font-size: 14px; color: #15281c; }
.ac-search:focus { outline: 2px solid #138a48; outline-offset: 1px; }
.ac-showing { font-size: 13px; font-weight: 600; color: #5f6d63; white-space: nowrap; }
.ac-track-section { margin-bottom: 26px; }
.ac-track-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.ac-track-h2 { margin: 0; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 21px; font-weight: 800; letter-spacing: -.01em; }
.ac-track-blurb { margin: 2px 0 0; font-size: 13.5px; color: #5f6d63; }
.ac-track-done { font-size: 12.5px; font-weight: 700; color: #5f6d63; white-space: nowrap; }
.ac-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ac-card { display: flex; gap: 12px; padding: 14px; border: 1px solid #e4e8e4; border-radius: 16px; background: #fff; color: #15281c; text-decoration: none; transition: border-color .15s, box-shadow .15s; }
.ac-card:hover { border-color: #b9c9bd; box-shadow: 0 10px 24px -20px rgba(16,40,26,.6); }
.ac-card-num { flex: 0 0 auto; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #f1f4f0; font-size: 13px; font-weight: 800; color: #33463a; }
.ac-card-num-done { background: #138a48; color: #fff; }
.ac-card-body { min-width: 0; }
.ac-card-title { margin: 0 0 4px; font-size: 15px; font-weight: 800; line-height: 1.3; }
.ac-card-text { margin: 0; font-size: 13px; line-height: 1.45; color: #5f6d63; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ac-card-meta { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; font-weight: 700; color: #7c8a80; }
.ac-empty { padding: 30px; border: 1px dashed #d9dfd9; border-radius: 16px; text-align: center; color: #5f6d63; font-size: 14px; }
.ac-empty-btn { margin-top: 10px; min-height: 40px; padding: 8px 14px; border: 1px solid #d9dfd9; border-radius: 10px; background: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.ac-lesson-nav { display: flex; flex-direction: column; gap: 2px; margin: 2px 0 8px 8px; padding-left: 10px; border-left: 2px solid #edf0ec; }
.ac-lesson-link { display: flex; align-items: flex-start; gap: 8px; min-height: 36px; padding: 7px 8px; border-radius: 8px; color: #405449; font-size: 13px; font-weight: 600; line-height: 1.35; text-decoration: none; }
.ac-lesson-link:hover { background: #f3f5f2; }
.ac-lesson-link-on { background: #eef3ee; color: #15281c; font-weight: 800; }
.ac-dot { flex: 0 0 auto; width: 16px; height: 16px; margin-top: 1px; border: 2px solid #c9d3cb; border-radius: 50%; }
.ac-dot-done { border-color: #138a48; background: #138a48; }
.ac-side-mobile { display: none; }
.ac-main { min-width: 0; }
.ac-banner { padding: 24px; border: 1px solid #e4e8e4; border-radius: 22px; background: #fff; }
.ac-banner-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.ac-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #f1f4f0; color: #33463a; font-size: 12px; font-weight: 800; }
.ac-meta { font-size: 13px; font-weight: 600; color: #5f6d63; }
.ac-lesson-h1 { margin: 12px 0 8px; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: clamp(28px, 3.6vw, 40px); line-height: 1.08; font-weight: 800; letter-spacing: -.02em; }
.ac-lesson-lede { margin: 0; font-size: 16px; line-height: 1.55; color: #405449; }
.ac-learn { margin-top: 18px; padding: 16px 18px; border-radius: 16px; background: #f6f8f5; }
.ac-learn-title { margin: 0 0 8px; font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #33463a; }
.ac-learn-list { margin: 0; padding-left: 20px; list-style: disc; font-size: 14.5px; line-height: 1.6; color: #24372b; }
.ac-section { margin-top: 18px; padding: 24px; border: 1px solid #e4e8e4; border-radius: 22px; background: #fff; }
.ac-section-eyebrow { color: #138a48; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.ac-section-h2 { margin: 6px 0 14px; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 23px; line-height: 1.2; font-weight: 800; }
.ac-prose { margin-top: 12px; font-size: 15.5px; line-height: 1.7; color: #2e4136; }
.ac-p { margin: 0 0 14px; }
.ac-h3 { margin: 22px 0 10px; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 20px; line-height: 1.25; font-weight: 800; color: #15281c; }
.ac-ul { margin: 0 0 14px; padding-left: 22px; list-style: disc; }
.ac-li { margin-bottom: 6px; }
.ac-ideas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.ac-idea { padding: 16px; border: 1px solid #e4e8e4; border-radius: 16px; background: #fbfcfa; }
.ac-idea-n { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #15281c; color: #fff; font-size: 12px; font-weight: 800; }
.ac-idea-t { margin: 10px 0 6px; font-size: 15px; font-weight: 800; line-height: 1.3; }
.ac-idea-d { margin: 0; font-size: 13.5px; line-height: 1.5; color: #4b5d52; }
.ac-plan { margin: 0; padding: 0; list-style: none; counter-reset: acplan; }
.ac-plan-step { position: relative; display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #edf0ec; }
.ac-plan-step:first-child { border-top: 0; padding-top: 0; }
.ac-plan-n { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #f1f4f0; font-size: 14px; font-weight: 800; color: #15281c; }
.ac-plan-t { margin: 4px 0 2px; font-size: 15px; font-weight: 800; }
.ac-plan-d { margin: 0; font-size: 14px; line-height: 1.5; color: #4b5d52; }
.ac-example-intro { margin: 0 0 12px; font-size: 14px; line-height: 1.55; color: #4b5d52; }
.ac-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ac-th { padding: 9px 10px; border-bottom: 2px solid #e4e8e4; text-align: left; font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #5f6d63; vertical-align: bottom; }
.ac-td { padding: 10px; border-bottom: 1px solid #edf0ec; vertical-align: top; overflow-wrap: anywhere; }
.ac-tr-total { font-weight: 800; background: #f6f8f5; }
.ac-takeaway { margin: 14px 0 0; padding: 12px 14px; border-left: 3px solid #138a48; border-radius: 0 12px 12px 0; background: #f6f8f5; font-size: 14px; line-height: 1.55; color: #24372b; }
.ac-mistakes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.ac-mistake { padding: 14px; border: 1px solid #f1d9d4; border-radius: 14px; background: #fff8f6; font-size: 14px; line-height: 1.45; color: #5c2b22; font-weight: 600; }
.ac-exercise { margin-top: 18px; padding: 22px 24px; border-radius: 22px; background: #15281c; color: #fff; }
.ac-exercise-eyebrow { color: #b9e3a5; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.ac-exercise-text { margin: 8px 0 0; font-size: 16px; line-height: 1.55; font-weight: 600; }
.ac-apply { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.ac-apply-link { display: block; padding: 14px 16px; border: 1px solid #e4e8e4; border-radius: 14px; background: #fff; color: #15281c; text-decoration: none; }
.ac-apply-link:hover { border-color: #b9c9bd; }
.ac-apply-label { display: block; font-size: 14.5px; font-weight: 800; }
.ac-apply-d { display: block; margin-top: 3px; font-size: 13px; color: #5f6d63; }
.ac-source { margin: 14px 0 0; font-size: 13px; color: #5f6d63; }
.ac-source-link { color: #138a48; font-weight: 700; }
.ac-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding: 18px; border: 1px solid #e4e8e4; border-radius: 22px; background: #fff; }
.ac-complete { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 10px 18px; border: 1px solid #c9d3cb; border-radius: 12px; background: #fff; color: #15281c; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
.ac-complete:hover { border-color: #138a48; }
.ac-complete-on { border-color: #138a48; background: #138a48; color: #fff; }
.ac-pager { display: flex; flex-wrap: wrap; gap: 8px; }
.ac-pager-link { display: inline-flex; align-items: center; min-height: 46px; padding: 10px 16px; border: 1px solid #e4e8e4; border-radius: 12px; background: #fff; color: #15281c; font-size: 14px; font-weight: 700; text-decoration: none; }
.ac-pager-next { border-color: #12341f; background: #12341f; color: #fff; }
.ac-pager-next:hover { background: #1b4a2c; }
@media (max-width: 980px) {
  .ac-hero { grid-template-columns: minmax(0, 1fr); }
  .ac-layout { grid-template-columns: 1fr; }
  .ac-side { display: none; }
  .ac-side-mobile { display: block; margin-bottom: 14px; border: 1px solid #e4e8e4; border-radius: 16px; background: #fff; }
  .ac-side-mobile-sum { min-height: 48px; padding: 13px 16px; font-size: 14px; font-weight: 800; cursor: pointer; }
  .ac-side-mobile-body { padding: 0 10px 10px; }
  .ac-ideas { grid-template-columns: 1fr; }
  .ac-mistakes { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .ac-cards { grid-template-columns: 1fr; }
  .ac-apply { grid-template-columns: 1fr; }
  .ac-opts { grid-template-columns: 1fr; }
  .ac-tools { flex-direction: column; align-items: stretch; }
  .ac-search { max-width: none; }
  .ac-banner { padding: 18px; }
  .ac-section { padding: 18px; }
  .ac-th { padding: 8px 6px; }
  .ac-td { padding: 9px 6px; font-size: 13.5px; }
  .ac-actions { flex-direction: column; align-items: stretch; }
  .ac-pager { justify-content: space-between; }
  .ac-pager-link { flex: 1; justify-content: center; }
}
.ac-track-select-wrap { display: none; }
@media (max-width: 980px) {
  .ac-track-select-wrap { display: block; margin-bottom: 12px; }
  .ac-track-select-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #5f6d63; }
  .ac-track-select { width: 100%; min-height: 46px; padding: 10px 12px; border: 1px solid #d9dfd9; border-radius: 12px; background: #fff; font: inherit; font-size: 15px; font-weight: 700; color: #15281c; }
}
.ac-quiz { margin: 0; padding: 0; list-style: none; }
.ac-q { padding: 14px 0; border-top: 1px solid #edf0ec; }
.ac-q:first-child { border-top: 0; padding-top: 0; }
.ac-q-text { margin: 0 0 10px; font-size: 15.5px; font-weight: 800; line-height: 1.4; }
.ac-opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ac-opt { min-height: 44px; padding: 10px 14px; border: 1px solid #d9dfd9; border-radius: 12px; background: #fff; color: #15281c; font: inherit; font-size: 14.5px; font-weight: 600; text-align: left; cursor: pointer; }
.ac-opt:hover { border-color: #15281c; }
.ac-opt:disabled { cursor: default; }
.ac-opt:disabled:hover { border-color: #d9dfd9; }
.ac-opt-right { border-color: #138a48; background: #edf7ef; color: #0f5a30; }
.ac-opt-right:disabled:hover { border-color: #138a48; }
.ac-opt-wrong { border-color: #d27a68; background: #fff3f0; color: #7a2b1d; }
.ac-opt-wrong:disabled:hover { border-color: #d27a68; }
.ac-why { margin: 10px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 14px; line-height: 1.5; }
.ac-why-right { background: #edf7ef; color: #0f3d22; }
.ac-why-wrong { background: #fff3f0; color: #5c2b22; }
.ac-score { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #edf0ec; font-size: 14.5px; font-weight: 800; }
.ac-retry { min-height: 40px; padding: 8px 14px; border: 1px solid #d9dfd9; border-radius: 10px; background: #fff; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.ac-puzzle { margin-top: 18px; padding: 18px; border: 1px dashed #b9c9bd; border-radius: 16px; background: #fbfcfa; }
.ac-puzzle-eyebrow { color: #6d28d9; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.ac-puzzle-q { margin: 6px 0 10px; font-size: 15.5px; font-weight: 700; line-height: 1.5; }
.ac-puzzle-sum { display: inline-flex; align-items: center; min-height: 40px; padding: 8px 14px; border: 1px solid #c9d3cb; border-radius: 10px; background: #fff; font-size: 14px; font-weight: 800; color: #12341f; cursor: pointer; }
.ac-puzzle-a { margin: 8px 0 4px; font-size: 15px; }
.ac-puzzle-steps { margin: 0; font-size: 14px; line-height: 1.55; color: #4b5d52; }
`
