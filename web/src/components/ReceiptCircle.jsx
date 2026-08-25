// The GetGuac receipt circle — the eight steps a receipt actually travels
// through, drawn as a loop instead of a rail of big product cards.
//
// This is the icon-strip concept ("Every receipt makes the next trip smarter"
// → CAPTURE → REMEMBER → SHOP SMARTER → KEEP MORE → "Learns from every trip")
// with the real eight-step flow in it. The section furniture — heading, the
// one-line explainer, the "See how GetGuac works" link, the loop caption — is
// kept exactly as the strip draws it; only the steps and the shape changed.
//
// No hooks and no state: server-safe, so it can drop into either a server page
// (the homepage) or a client one (/join) without a wrapper.
//
// Layout is two trees, toggled by CSS at 980px:
//   .ggc-ring  — absolutely positioned nodes on an SVG ring (desktop)
//   .ggc-list  — the same steps stacked with ↓ connectors (phones)
// One data array feeds both, so a copy edit can never land on only one of them.
import Link from 'next/link'
import { Camera, ScanSearch, Boxes, ListChecks, ShoppingCart, ShieldCheck, Star, CircleDollarSign, RotateCw, ArrowRight } from 'lucide-react'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

// 🔒 Copy is the circle as written, verbatim — step names in caps, one
// supporting line each. "A SMARTER NEXT TRIP" is the outcome, not a feature,
// so it deliberately carries no supporting line; do not invent one for symmetry.
export const CIRCLE_STEPS = [
  { k: 'CAPTURE', s: 'Receipt, email or statement', Icon: Camera },
  { k: 'UNDERSTAND', s: 'Items, stores, fees and spending', Icon: ScanSearch },
  { k: 'REMEMBER', s: 'Stash knows what you own and liked', Icon: Boxes },
  { k: 'PREPARE', s: 'Predictions build the next Shopping List', Icon: ListChecks },
  { k: 'SHOP SMARTER', s: 'Compare prices and find Steals', Icon: ShoppingCart },
  { k: 'PROTECT THE PURCHASE', s: 'Track returns, refunds and price drops', Icon: ShieldCheck },
  { k: 'LEARN AND MEASURE', s: 'Worth-It + GuacMoney', Icon: Star },
  { k: 'A SMARTER NEXT TRIP', s: '', Icon: CircleDollarSign },
]

// Ring geometry, in an 820×740 frame. It is the ICON that sits on the ring
// point, not the middle of the node box — the label hangs radially OUTWARD from
// there (up at the top, down at the bottom, sideways for the six on the flanks).
// Centring the whole box on the point instead put half of every label INSIDE the
// ring, where the connector arcs ran straight through the text; stacking the
// side labels under their icons did the same thing. R=240 is the largest radius
// that keeps the widest side label (tile + gap + 130px text) inside the frame.
const CX = 410
const CY = 370
const R = 240
// Stacked nodes (top/bottom) get the full box; the six side nodes spend their
// width on a 46px tile + an 8px gap + the text.
const NODE_W = { up: 152, down: 152, left: 184, right: 184 }
// Half the icon tile, so `top` lands on the tile's centre.
const TILE_HALF = 23
// Degrees of clear space either side of a node so the connector arcs stop short
// of the icon tiles instead of running under them.
const GAP = 12
// Which way each step's label hangs off its icon — always radially outward, so
// no label ever lands inside the ring where the arcs run. The two side steps go
// sideways for the same reason: a label stacked under them would sit on the arc.
const LAY = ['up', 'right', 'right', 'right', 'down', 'left', 'left', 'left']

const deg = (i) => -90 + 45 * i
const pt = (a, r = R) => [CX + r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)]
const arc = (a1, a2) => {
  const [x1, y1] = pt(a1)
  const [x2, y2] = pt(a2)
  // sweep=1 → clockwise, which is the direction the receipt travels.
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function StepIcon({ Icon }) {
  return (
    <span className="ggc-tile" aria-hidden>
      <Icon size={22} strokeWidth={1.75} color="#4D7C0F" />
    </span>
  )
}

export default function ReceiptCircle({ heading = 'Every receipt makes the next trip smarter.', blurb = 'GetGuac remembers the shopping so you don’t have to.', href = '/how-it-works', linkLabel = 'See how GetGuac works' }) {
  return (
    <section className="ggc" style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 24px 40px' }}>
      <style>{CSS}</style>
      <div className="ggc-grid">
        {/* Section furniture, straight off the strip: heading, one explainer
            line, and the works link pinned to the bottom of the column. */}
        <div className="ggc-head">
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#15281C', margin: '0 0 14px' }}>
            {heading}
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#56655B', margin: 0, maxWidth: 300 }}>{blurb}</p>
          <Link href={href} className="ggc-link">
            {linkLabel} <ArrowRight size={15} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>

        {/* DESKTOP — nodes on the ring */}
        <div className="ggc-ring" role="list" aria-label="The GetGuac receipt circle">
          <svg className="ggc-svg" viewBox="0 0 820 740" aria-hidden focusable="false">
            <defs>
              <marker id="ggc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
                <path d="M0.6,1 L8.6,5 L0.6,9" fill="none" stroke="#84B356" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            {CIRCLE_STEPS.map((_, i) => {
              // The eighth segment is the loop home — dashed, so the return to
              // CAPTURE reads as "and round again" rather than a ninth step.
              const closing = i === CIRCLE_STEPS.length - 1
              return (
                <path
                  key={i}
                  d={arc(deg(i) + GAP, deg(i + 1) - GAP)}
                  fill="none"
                  stroke={closing ? '#A9CE82' : '#CFE4B4'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray={closing ? '5 6' : undefined}
                  markerEnd="url(#ggc-arrow)"
                />
              )
            })}
          </svg>

          {/* Hub — the loop caption from the strip, kept as the caption it is. */}
          <div className="ggc-hub">
            <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden>🥑</span>
            <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '0.16em', color: '#4D7C0F', marginTop: 8 }}>GUAC AI</span>
            <span className="ggc-hub-loop">
              <RotateCw size={13} strokeWidth={2.4} aria-hidden /> Learns from every trip
            </span>
          </div>

          {CIRCLE_STEPS.map((step, i) => {
            const [x, y] = pt(deg(i))
            const lay = LAY[i]
            // The icon, not the box, is what lines up with the ring point.
            const shift = {
              up: `translate(-50%, calc(-100% + ${TILE_HALF}px))`,
              down: `translate(-50%, -${TILE_HALF}px)`,
              left: `translate(calc(-100% + ${TILE_HALF}px), -50%)`,
              right: `translate(-${TILE_HALF}px, -50%)`,
            }[lay]
            return (
              <div
                key={step.k}
                role="listitem"
                className={`ggc-node ggc-${lay}`}
                style={{ left: `${(x / 820) * 100}%`, top: `${(y / 740) * 100}%`, width: NODE_W[lay], transform: shift }}
              >
                <StepIcon Icon={step.Icon} />
                <span className="ggc-txt">
                  <span className="ggc-k">{step.k}</span>
                  {step.s && <span className="ggc-s">{step.s}</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* PHONE — the same eight steps, stacked, with the loop spelled out. */}
        <ol className="ggc-list">
          {CIRCLE_STEPS.map((step, i) => (
            <li key={step.k}>
              <div className="ggc-row">
                <StepIcon Icon={step.Icon} />
                <div>
                  <span className="ggc-k">{step.k}</span>
                  {step.s && <span className="ggc-s">{step.s}</span>}
                </div>
              </div>
              {i < CIRCLE_STEPS.length - 1 && <span className="ggc-down" aria-hidden>↓</span>}
            </li>
          ))}
          <li className="ggc-loopback">
            <RotateCw size={14} strokeWidth={2.4} aria-hidden /> Learns from every trip — back to capture
          </li>
        </ol>
      </div>
    </section>
  )
}

const CSS = `
.ggc-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 40px; align-items: center; }
.ggc-head { align-self: center; }
.ggc-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; color: #4D7C0F; font-weight: 700; font-size: 14px; text-decoration: none; }
.ggc-link:hover { text-decoration: underline; }

.ggc-ring { position: relative; width: 100%; max-width: 820px; margin: 0 auto; aspect-ratio: 820 / 740; }
.ggc-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ggc-node { position: absolute; display: flex; align-items: center; gap: 8px; }
.ggc-txt { display: block; }
/* Four outward directions. The up variant uses order rather than column-reverse:
   reversing would also flip the label and its supporting line. */
.ggc-down, .ggc-up { flex-direction: column; text-align: center; }
.ggc-up .ggc-txt { order: 1; }
.ggc-up .ggc-tile { order: 2; }
.ggc-left { flex-direction: row-reverse; text-align: right; }
.ggc-right { flex-direction: row; text-align: left; }
.ggc-left .ggc-txt, .ggc-right .ggc-txt { flex: 1 1 auto; min-width: 0; }

.ggc-tile { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; flex: 0 0 46px; border-radius: 14px; background: #F0F7E8; border: 1px solid rgba(101,163,13,0.18); }
.ggc-k { display: block; font-family: var(--font-bricolage), sans-serif; font-weight: 800; font-size: 11.5px; letter-spacing: 0.07em; color: #15281C; line-height: 1.25; }
.ggc-s { display: block; font-size: 11.5px; line-height: 1.35; color: #6B7A6F; margin-top: 3px; }

.ggc-hub { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 210px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.ggc-hub-loop { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: #fff; border: 1px solid rgba(101,163,13,0.22); color: #4D7C0F; font-size: 11.5px; font-weight: 700; white-space: nowrap; }

.ggc-list { display: none; }

@media (max-width: 980px) {
  .ggc-grid { grid-template-columns: 1fr; gap: 24px; }
  .ggc-ring { display: none; }
  .ggc-list { display: block; list-style: none; margin: 0; padding: 0; }
  .ggc-list li { margin: 0; }
  .ggc-row { display: flex; align-items: flex-start; gap: 12px; text-align: left; }
  .ggc-row .ggc-k { font-size: 12.5px; }
  .ggc-row .ggc-s { font-size: 13px; }
  .ggc-down { display: block; color: #A9CE82; font-size: 17px; line-height: 1; margin: 6px 0 6px 22px; }
  .ggc-loopback { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 7px 13px; border-radius: 999px; background: #F0F7E8; border: 1px solid rgba(101,163,13,0.22); color: #4D7C0F; font-size: 12.5px; font-weight: 700; }
}
`
