# GetGuac sidebar logo — backup (2026-06-30)

The sidebar logo now **matches the marketing home page exactly**
(`components/MarketingShell.jsx`): the 🥑 emoji + "GetGuac" in the Bricolage
display font (`#15281C`), with the "money's wingman" tagline beneath it. No image
file is involved.

## Previous sidebar logo (before this change) — restore by pasting back into the `<Link>` brand block in Sidebar.jsx

```jsx
<div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center shrink-0 overflow-hidden">
  <span className="text-2xl leading-none" aria-label="GetGuac">🥑</span>
</div>
{!collapsed && (
  <div className="min-w-0 font-sans">
    <div className="text-xl font-black tracking-tight text-emerald-900 leading-none font-sans">GetGuac</div>
    <div className="text-[10px] text-emerald-600 font-semibold mt-1 uppercase tracking-wider font-sans">money's wingman</div>
  </div>
)}
```

## Current sidebar logo (matches home page)

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
  <span style={{ fontSize: 22 }}>🥑</span>
  <span style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>GetGuac</span>
</div>
<div className="text-[10px] text-guac-faint font-bold mt-1 uppercase tracking-[0.14em]">money's wingman</div>
```

(No PNG needed. `og.png` and the favicon are untouched.)
