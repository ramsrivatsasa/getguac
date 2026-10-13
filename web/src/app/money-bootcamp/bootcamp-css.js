// Styles for /money-bootcamp, layered on ACADEMY_CSS (imported read-only from
// the Academy so tests look like the lessons they come from).
//
// ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THE STRING: React escapes
// >, &, quotes and non-ASCII differently on the server than in the browser,
// which turns a <style> block into a hydration mismatch.
export const BOOTCAMP_CSS = `
.bc-hero { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: stretch; margin-bottom: 18px; }
.bc-overall { display: flex; flex-direction: column; gap: 8px; padding: 18px; border: 1px solid #e4e8e4; border-radius: 20px; background: #fff; box-shadow: 0 14px 30px -26px rgba(16,40,26,.5); }
.bc-overall-label { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #5f6d63; }
.bc-overall-num { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 38px; font-weight: 800; line-height: 1; }
.bc-overall-sub { font-size: 13.5px; font-weight: 700; color: #5f6d63; }
.bc-overall-note { font-size: 12.5px; color: #7c8a80; }
.bc-how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0 0 22px; padding: 0; list-style: none; }
.bc-how-step { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid #e4e8e4; border-radius: 14px; background: #fff; }
.bc-how-n { flex: 0 0 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #12341f; color: #fff; font-size: 13px; font-weight: 800; }
.bc-how-t { margin: 0; font-size: 14px; font-weight: 800; line-height: 1.3; }
.bc-how-d { margin: 2px 0 0; font-size: 13px; line-height: 1.4; color: #5f6d63; }
.bc-track { margin-top: 14px; padding: 18px 20px; border: 1px solid #e4e8e4; border-radius: 20px; background: #fff; scroll-margin-top: 90px; }
.bc-track-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.bc-track-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bc-track-icon { flex: 0 0 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: #f1f4f0; color: #12341f; }
.bc-track-h2 { margin: 0; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 20px; line-height: 1.2; font-weight: 800; }
.bc-track-blurb { margin: 2px 0 0; font-size: 13.5px; color: #5f6d63; }
.bc-table { width: 100%; border-collapse: collapse; font-size: 14.5px; table-layout: fixed; }
.bc-th { padding: 8px 10px; border-bottom: 2px solid #e4e8e4; text-align: left; font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #5f6d63; }
.bc-th-n { width: 44px; }
.bc-th-q { width: 110px; }
.bc-th-score { width: 120px; }
.bc-th-go { width: 96px; }
.bc-td { padding: 9px 10px; border-bottom: 1px solid #edf0ec; vertical-align: middle; overflow-wrap: break-word; }
.bc-td-n { color: #7c8a80; font-weight: 700; }
.bc-td-meta { color: #5f6d63; font-size: 13.5px; }
.bc-row-link { color: #15281c; font-weight: 700; text-decoration: none; }
.bc-row-link:hover { color: #138a48; text-decoration: underline; }
.bc-go { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 6px 14px; border-radius: 10px; background: #12341f; color: #fff; font-size: 13.5px; font-weight: 800; text-decoration: none; }
.bc-go:focus-visible, .bc-row-link:focus-visible, .bc-btn:focus-visible, .bc-exam-link:focus-visible { outline: 3px solid #7c3aed; outline-offset: 2px; }
.bc-exam-link { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 8px 14px; border: 1px solid #c9d3cb; border-radius: 10px; background: #fff; color: #12341f; font-size: 14px; font-weight: 800; text-decoration: none; }
.bc-badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 800; white-space: nowrap; }
.bc-badge-none { background: #f1f4f0; color: #7c8a80; }
.bc-badge-pass { background: #edf7ef; color: #0f5a30; }
.bc-badge-try { background: #fff6e5; color: #7a4b00; }
.bc-test { margin-top: 18px; padding: 8px 24px 24px; border: 1px solid #e4e8e4; border-radius: 22px; background: #fff; }
.bc-test-bar { position: sticky; top: 64px; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 14px 0 12px; background: #fff; }
.bc-test-h { margin: 0; font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 20px; font-weight: 800; }
.bc-test-count { font-size: 13.5px; font-weight: 700; color: #5f6d63; }
.bc-test-progress { flex: 1 1 100%; }
.bc-q { scroll-margin-top: 140px; }
.bc-q-kind { display: inline-block; margin-bottom: 6px; color: #138a48; font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.bc-from { color: #138a48; font-weight: 700; }
.bc-result { display: flex; gap: 20px; align-items: center; margin-top: 14px; padding: 20px; border-radius: 18px; background: #15281c; color: #fff; outline: none; }
.bc-result-score { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; min-width: 110px; }
.bc-result-pct { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 44px; font-weight: 800; line-height: 1; }
.bc-result-of { margin-top: 4px; font-size: 13px; color: #b9e3a5; font-weight: 700; }
.bc-result-copy { min-width: 0; }
.bc-result-note { margin: 8px 0 12px; font-size: 15px; line-height: 1.5; }
.bc-result-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.bc-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 14px; border-radius: 12px; font: inherit; font-size: 14px; font-weight: 800; text-decoration: none; cursor: pointer; }
.bc-btn-ghost { border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; }
.bc-btn-dark { border: 1px solid #b9e3a5; background: #b9e3a5; color: #12341f; }
.bc-learn-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; color: #138a48; font-size: 14.5px; font-weight: 800; text-decoration: none; }
.bc-more { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.bc-more-link { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; padding: 8px 12px; border: 1px solid #e4e8e4; border-radius: 12px; color: #15281c; font-size: 14px; font-weight: 700; text-decoration: none; }
.bc-more-link-on { border-color: #138a48; background: #edf7ef; }
.bc-faq-q { margin: 14px 0 4px; font-size: 15.5px; font-weight: 800; }
.bc-faq-a { margin: 0; font-size: 14.5px; line-height: 1.55; color: #405449; }
@media (max-width: 860px) {
  .bc-hero { grid-template-columns: minmax(0, 1fr); }
  .bc-how { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .bc-track { padding: 14px; }
  .bc-test { padding: 4px 14px 16px; }
  .bc-th-n, .bc-td-n, .bc-th-q, .bc-td-q { display: none; }
  .bc-th-score { width: 92px; }
  .bc-th-go { width: 64px; }
  .bc-go { padding: 6px 10px; }
  .bc-result { flex-direction: column; align-items: flex-start; }
  .bc-result-score { align-items: flex-start; }
  .bc-more { grid-template-columns: minmax(0, 1fr); }
}
`
