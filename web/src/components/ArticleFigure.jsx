// Data-driven figures for the money articles.
//
// Why this exists: the article body renderer understood exactly three node
// types — a paragraph string, { h } and { list }. There was no image or diagram
// node at all, which is why all 20 articles shipped with ZERO visuals. That is
// a weakness for readers and for an AdSense content review, which reads a wall
// of unbroken text as thin.
//
// Deliberately NOT <img>: every figure is generated from the same numbers the
// surrounding paragraphs already cite, so a figure can't drift out of sync with
// its prose, costs no image bytes, needs no alt-text guesswork, and stays sharp
// at any zoom. `bars`, `split` and `steps` are plain elements — they reflow and
// their text scales natively on a phone, which SVG text does not. Only `line`
// needs real SVG, and its labels live in HTML around the plot for that reason.
//
// Server component (no 'use client'): article pages are statically generated,
// so these render once at build time and ship as plain markup.

// Brand series colours. All five are dark enough to carry white text and to
// pass AA as a text colour on white, so they're safe as fills or as labels.
// #5F6D63 is the site's AA-corrected gray (the #8A988E it replaced was 3.0:1).
// Five, not four: the FICO breakdown has five slices, and a four-colour ramp
// would wrap and paint "new credit" the same green as "payment history".
const PALETTE = ['#047857', '#65a30d', '#d97706', '#0e7490', '#5F6D63']
const MUTED = '#5F6D63'

// `display` wins over `value` when present. `value` drives the bar geometry and
// must stay numeric; `display` is what the reader sees. Needed wherever the
// printed figure isn't a plain rounded number — cents that must survive
// ($7.99/mo), units the number alone doesn't carry ("3 months", "10 shares"),
// or a hedge the prose itself uses ("about $0.50 a year").
function fmt(v, format) {
  if (format === 'usd') return `$${Math.round(v).toLocaleString('en-US')}`
  if (format === 'pct') return `${v}%`
  return typeof v === 'number' ? v.toLocaleString('en-US') : v
}

const shown = (d, format) => (d.display != null ? d.display : fmt(d.value, format))

// Margins are inline, not `my-7`: the body renderer wraps these nodes in a
// `space-y-4` stack, whose `> * ~ *` selector outranks a margin utility class
// and would otherwise clamp every figure back to a 1rem gap.
function Frame({ title, caption, label, children }) {
  return (
    <figure
      className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5"
      style={{ marginTop: '1.75rem', marginBottom: '1.75rem' }}
      role="group"
      aria-label={label || title}
    >
      {title && <div className="text-sm font-black text-gray-900 leading-snug">{title}</div>}
      <div className={title ? 'mt-3.5' : ''}>{children}</div>
      {caption && (
        <figcaption className="mt-3.5 text-xs leading-relaxed" style={{ color: MUTED }}>{caption}</figcaption>
      )}
    </figure>
  )
}

// Horizontal comparison bars. { data: [{ label, value, note }] }
function Bars({ data, format }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 0)
  return (
    <div className="space-y-3.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-gray-900 leading-snug">{d.label}</span>
            <span className="text-[13px] font-black text-gray-900 tabular-nums shrink-0">{shown(d, format)}</span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-gray-200/80 overflow-hidden">
            <div
              className="h-full rounded-full"
              // Floor of 2% so a genuinely tiny value is still a visible mark
              // rather than an empty track that reads as "no data".
              style={{ width: `${max ? Math.max(2, (Number(d.value) / max) * 100) : 0}%`, background: PALETTE[i % PALETTE.length] }}
            />
          </div>
          {d.note && <div className="mt-1 text-[11px] leading-relaxed" style={{ color: MUTED }}>{d.note}</div>}
        </div>
      ))}
    </div>
  )
}

// One 100%-wide bar cut into shares, plus a legend. { data: [{ label, value }] }
function Split({ data, format }) {
  const total = data.reduce((n, d) => n + (Number(d.value) || 0), 0) || 1
  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${(Number(d.value) / total) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 self-center" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-[13px] font-semibold text-gray-900">{d.label}</span>
            <span className="text-[13px] tabular-nums ml-auto shrink-0" style={{ color: MUTED }}>{shown(d, format)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// A numbered flow. { data: [{ label, note }] }
function Steps({ data }) {
  return (
    <ol className="space-y-3 list-none pl-0">
      {data.map((d, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="shrink-0 w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center mt-px"
            style={{ background: PALETTE[i % PALETTE.length] }}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-gray-900 leading-snug">{d.label}</span>
            {d.note && <span className="block text-[12px] mt-0.5 leading-relaxed" style={{ color: MUTED }}>{d.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

// Growth over time. { xLabels: [...], series: [{ name, points: [...] }] }
// The only figure that needs SVG. Axis + legend are HTML so their type scales
// with the page instead of shrinking to ~7px inside a scaled viewBox.
function LineChart({ xLabels = [], series = [], format }) {
  const W = 640
  const H = 190
  const PAD_T = 12
  const PAD_B = 6
  const all = series.flatMap((s) => s.points.map(Number))
  const max = Math.max(...all, 0) || 1
  const n = Math.max(...series.map((s) => s.points.length), 2)
  const px = (i) => (i / (n - 1)) * W
  const py = (v) => PAD_T + (1 - Number(v) / max) * (H - PAD_T - PAD_B)
  const path = (pts) => pts.map((v, i) => `${i ? 'L' : 'M'} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={series.map((s) => `${s.name}: ends at ${fmt(s.points[s.points.length - 1], format)}`).join('. ')}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={py(max * f)} y2={py(max * f)} stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" x2={W} y1={py(0)} y2={py(0)} stroke="#d1d5db" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {series.map((s, i) => (
          <path
            key={i}
            d={path(s.points)}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            // Without this the non-uniform preserveAspectRatio scale would
            // squash the stroke horizontally and fatten it vertically.
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {xLabels.length > 0 && (
        <div className="flex justify-between mt-1.5 text-[11px] font-semibold" style={{ color: MUTED }}>
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
      <div className="mt-3 space-y-1.5">
        {series.map((s, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 self-center" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-[13px] font-semibold text-gray-900">{s.name}</span>
            <span className="text-[13px] font-black text-gray-900 tabular-nums ml-auto shrink-0">
              {fmt(s.points[s.points.length - 1], format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ArticleFigure({ figure }) {
  if (!figure || !figure.type) return null
  const { type, title, caption, data = [], format, xLabels, series } = figure
  const body =
    type === 'bars' ? <Bars data={data} format={format} />
    : type === 'split' ? <Split data={data} format={format} />
    : type === 'steps' ? <Steps data={data} />
    : type === 'line' ? <LineChart xLabels={xLabels} series={series} format={format} />
    : null
  if (!body) return null
  return <Frame title={title} caption={caption} label={figure.label}>{body}</Frame>
}
