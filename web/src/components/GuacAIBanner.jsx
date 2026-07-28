// Guac AI hero banner — a self-contained showcase card that sits directly
// below the landing hero. Concept: receipts flow into a glowing Guac AI
// "brain" (avocado watermark behind it) and refunds / price drops / Worth-It
// scores flow out, with a Worth-It verdict panel + a climbing GuacScore chart.
//
// Visual direction (2026-07-25 restyle): WHITE backdrop + neon-lime glow, a
// glowing brain core over a faint avocado watermark, and the three data cards
// tilted on a shared perspective so they read like a wrap-around dashboard —
// borrowed from the earnings-banner reference the user liked.
//
// Every rule is scoped under `.gg-aib` so the generic class names here
// (.panel, .chip, .bar, .core, header, h1 …) can't collide with global CSS.
// Fonts point at the site's real Bricolage/Jakarta vars so the type matches
// the hero exactly. Keyframes are namespaced (ggaib*) to avoid clobbering
// other global animations. Rendered via dangerouslySetInnerHTML per the
// page.jsx pattern, keeping this a zero-JS server component.

const CSS = `
.gg-aib{
  --bg:#FFFFFF; --backdrop:#F4F7F0; --panel:#FFFFFF; --ink:#14241A; --body:#4A5A4E;
  --muted:#6B7A6E; --faint:#9AA89E; --logo:#176B33; --green-700:#14532D; --green-600:#1F8A3D;
  --lime:#4D7C0F; --lime-b:#65A30D; --neon:#84CC16; --neon-2:#A3E635;
  --green-100:#E9F5DD; --green-50:#F1F6EA; --row:#F7FBF1;
  --line:rgba(20,83,45,0.10); --line-2:rgba(20,83,45,0.16); --cta-a:#FBB040; --cta-b:#E8870E;
  --glow:rgba(132,204,22,.55); --glow-soft:rgba(132,204,22,.30);
  --f-display: var(--font-bricolage),"Arial Black","Helvetica Neue",system-ui,sans-serif;
  --f-body: var(--font-jakarta),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  display:flex; justify-content:center;
}
.gg-aib *{box-sizing:border-box}

.gg-aib .banner{
  position:relative; width:min(1240px,100%); aspect-ratio:1240/720;
  border-radius:24px; overflow:hidden; isolation:isolate;
  border:1px solid var(--line);
  box-shadow:0 50px 110px -55px rgba(16,40,26,.45);
  background:
    radial-gradient(42% 52% at 22% 54%, rgba(132,204,22,.16) 0%, rgba(132,204,22,0) 68%),
    radial-gradient(90% 80% at 18% -8%, rgba(31,138,61,.10) 0%, rgba(31,138,61,0) 55%),
    radial-gradient(80% 90% at 92% 118%, rgba(101,163,13,.12) 0%, rgba(101,163,13,0) 55%),
    linear-gradient(165deg,#FFFFFF 0%,#F4F7F0 60%,#EFF3EA 100%);
  display:grid; grid-template-rows:auto 1fr auto;
  padding:clamp(20px,2.6vw,38px) clamp(22px,3vw,44px);
  gap:clamp(12px,1.6vw,20px);
  container-type:inline-size;
  font-family:var(--f-body); color:var(--body);
}
.gg-aib .banner::before{
  content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background-image:
    linear-gradient(rgba(20,83,45,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(20,83,45,.05) 1px,transparent 1px);
  background-size:44px 44px;
  -webkit-mask-image:radial-gradient(120% 80% at 50% 0%,#000 0%,transparent 70%);
          mask-image:radial-gradient(120% 80% at 50% 0%,#000 0%,transparent 70%);
}

.gg-aib header{display:flex;flex-direction:column;gap:clamp(6px,.9vw,12px)}
.gg-aib .toprow{display:flex;align-items:center;justify-content:space-between;gap:16px}
.gg-aib .wordmark{display:flex;align-items:center;gap:10px}
.gg-aib .avo{font-size:clamp(20px,2.1vw,28px);line-height:1;filter:drop-shadow(0 3px 6px rgba(20,83,45,.25))}
.gg-aib .wordmark b{font-family:var(--f-display);font-weight:800;letter-spacing:.14em;font-size:clamp(13px,1.25vw,17px);text-transform:uppercase;color:var(--ink)}
.gg-aib .wordmark b span{color:var(--green-600)}
.gg-aib .kicker{
  font-size:clamp(9px,.85vw,11px);letter-spacing:.24em;text-transform:uppercase;color:var(--logo);
  border:1px solid var(--line-2);border-radius:999px;padding:6px 12px;white-space:nowrap;background:var(--green-50);
}
.gg-aib h1{font-family:var(--f-display);font-weight:800;margin:0;font-size:clamp(30px,5.2cqw,68px);line-height:.96;letter-spacing:-.02em;text-wrap:balance;max-width:15ch;color:var(--ink)}
.gg-aib h1 .g{background:linear-gradient(100deg,var(--green-600) 0%,var(--logo) 70%);-webkit-background-clip:text;background-clip:text;color:transparent}
.gg-aib .sub{font-size:clamp(12px,1.32cqw,17px);color:var(--muted);margin:0;max-width:52ch;line-height:1.45}
.gg-aib .sub strong{color:var(--ink);font-weight:700}

/* --- Angled dashboard: shared perspective, each card tilts on its own axis --- */
.gg-aib .stage{
  display:grid;grid-template-columns:1.08fr .96fr .9fr;gap:clamp(12px,1.5vw,22px);
  align-items:stretch;min-height:0;min-width:0;
  perspective:1600px;perspective-origin:50% 42%;
}
.gg-aib .panel{
  position:relative;border-radius:18px;padding:clamp(12px,1.3vw,18px);
  background:var(--panel);border:1px solid var(--line);
  box-shadow:0 24px 50px -38px rgba(16,40,26,.4);
  display:flex;flex-direction:column;min-height:0;min-width:0;
  transform-style:preserve-3d;transition:transform .4s cubic-bezier(.2,.7,.2,1);
}
.gg-aib .stage > .panel:nth-child(1){transform:rotateY(6deg) translateZ(2px)}
.gg-aib .stage > .panel:nth-child(2){transform:rotateY(0deg) translateZ(16px)}
.gg-aib .stage > .panel:nth-child(3){transform:rotateY(-7deg) translateZ(2px)}
.gg-aib .stage > .panel:nth-child(2){box-shadow:0 34px 64px -40px rgba(16,40,26,.5)}
.gg-aib .stage:hover > .panel{transform:rotateY(0deg) translateZ(0)}
.gg-aib .panel h2{font-family:var(--f-display);font-weight:800;margin:0 0 2px;font-size:clamp(13px,1.15cqw,17px);letter-spacing:-.01em;color:var(--ink)}
.gg-aib .panel .cap{font-size:clamp(8px,.8cqw,10.5px);letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:0 0 12px}

.gg-aib .flow{padding:0;background:none;border:none;box-shadow:none;overflow:visible}
.gg-aib .flowbox{position:relative;flex:1;min-height:0}
.gg-aib .flowbox svg.wires{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 3px var(--glow-soft))}

/* --- Glowing brain core over a faint avocado watermark --- */
.gg-aib .core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:37%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;z-index:3;
  background:radial-gradient(circle at 50% 44%,rgba(132,204,22,.30),rgba(31,138,61,.06) 52%,transparent 72%)}
.gg-aib .core::after{content:"";position:absolute;inset:-14%;border-radius:50%;z-index:-1;
  background:radial-gradient(circle,rgba(132,204,22,.28),rgba(132,204,22,0) 66%);filter:blur(3px)}
.gg-aib .brainstage{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2%}
.gg-aib .avowm{position:absolute;top:44%;left:50%;transform:translate(-50%,-50%);z-index:0;
  font-size:clamp(46px,7.4cqw,120px);line-height:1;opacity:.12;filter:blur(.4px)}
.gg-aib .brain{position:relative;z-index:1;width:74%;height:auto;
  filter:drop-shadow(0 0 5px var(--glow)) drop-shadow(0 0 16px var(--glow-soft))}
.gg-aib .brain .bout{fill:url(#ggaib-brain);stroke:#4D7C0F;stroke-width:1.7;stroke-linejoin:round}
.gg-aib .brain .bfis{fill:none;stroke:#4D7C0F;stroke-width:1.4;stroke-linecap:round;opacity:.85}
.gg-aib .brain .bgy{fill:none;stroke:#65A30D;stroke-width:1.15;stroke-linecap:round;opacity:.8}
.gg-aib .corelabel{position:relative;z-index:2;text-align:center;line-height:1;margin-top:-2%}
.gg-aib .corelabel b{font-family:var(--f-display);font-weight:800;font-size:clamp(11px,1.35cqw,18px);letter-spacing:.02em;color:var(--logo)}
.gg-aib .corelabel small{display:block;font-size:clamp(7px,.72cqw,9.5px);letter-spacing:.24em;text-transform:uppercase;color:var(--green-600);margin-top:3px}
.gg-aib .core .ring{position:absolute;inset:-9%;border-radius:50%;border:1px dashed rgba(31,138,61,.3);animation:ggaibSpin 26s linear infinite}
.gg-aib .core .ring.r2{inset:-20%;border-style:dotted;border-color:rgba(101,163,13,.22);animation-duration:44s;animation-direction:reverse}

.gg-aib .chip{position:absolute;z-index:4;display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:11px;white-space:nowrap;
  background:var(--panel);border:1px solid var(--line-2);
  box-shadow:0 12px 26px -16px rgba(16,40,26,.5), 0 0 0 3px rgba(132,204,22,.06);
  font-size:clamp(8.5px,.86cqw,11.5px);font-weight:600;color:var(--ink);transform:translateY(-50%)}
.gg-aib .chip .ic{font-size:clamp(11px,1cqw,14px);line-height:1}
.gg-aib .chip.in{left:0}.gg-aib .chip.out{right:0}
.gg-aib .lane{position:absolute;left:0;font-size:clamp(8px,.78cqw,10px);letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
.gg-aib .lane.r{left:auto;right:0;text-align:right}

.gg-aib .verdicts{display:flex;flex-direction:column;gap:clamp(7px,.95cqw,12px);flex:1;justify-content:center}
.gg-aib .vrow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;min-width:0}
.gg-aib .vrow .lbl{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-aib .vrow .lbl{font-size:clamp(10px,1cqw,13px);font-weight:600;color:var(--body)}
.gg-aib .vrow .num{font-family:var(--f-display);font-weight:800;font-variant-numeric:tabular-nums;font-size:clamp(11px,1.05cqw,14px);color:var(--ink)}
.gg-aib .bar{grid-column:1/-1;height:clamp(7px,.8cqw,10px);border-radius:6px;background:var(--green-50);overflow:hidden;position:relative;border:1px solid var(--line)}
.gg-aib .bar i{position:absolute;inset:0 auto 0 0;border-radius:6px;display:block;background:linear-gradient(90deg,var(--green-600),var(--neon));box-shadow:0 0 8px rgba(132,204,22,.4)}
.gg-aib .bar.warn i{background:linear-gradient(90deg,var(--cta-a),var(--cta-b));box-shadow:0 0 8px rgba(232,135,14,.35)}
.gg-aib .bar.bad i{background:linear-gradient(90deg,#E08A5B,#C25A2B);box-shadow:none}

.gg-aib .trend{display:flex;flex-direction:column}
.gg-aib .trend .big{font-family:var(--f-display);font-weight:800;font-size:clamp(24px,3cqw,44px);line-height:1;color:var(--ink);letter-spacing:-.02em}
.gg-aib .trend .big em{font-style:normal;font-size:.5em;color:var(--green-600);margin-left:4px;vertical-align:middle}
.gg-aib .trend .tcap{font-size:clamp(8.5px,.85cqw,11px);color:var(--muted);margin:2px 0 auto}
.gg-aib .chart{flex:1;display:flex;align-items:flex-end;gap:clamp(4px,.7cqw,9px);min-height:0;padding-top:12px}
.gg-aib .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.gg-aib .col i{width:100%;border-radius:5px 5px 2px 2px;display:block;background:linear-gradient(180deg,var(--neon),var(--green-600))}
.gg-aib .col.hl i{background:linear-gradient(180deg,var(--neon-2),var(--green-600));box-shadow:0 0 12px rgba(132,204,22,.55)}
.gg-aib .col span{font-size:clamp(7.5px,.72cqw,10px);color:var(--faint);letter-spacing:.08em}

.gg-aib footer{display:flex;flex-direction:column;gap:8px}
.gg-aib .caps{display:flex;flex-wrap:wrap;gap:clamp(6px,.9vw,12px);align-items:center}
.gg-aib .capchip{display:flex;align-items:center;gap:7px;font-size:clamp(9px,.95cqw,12.5px);font-weight:600;color:var(--body);
  padding:7px 13px;border-radius:999px;border:1px solid var(--line-2);background:var(--green-50)}
.gg-aib .capchip b{font-family:var(--f-display);color:var(--logo);font-weight:800}
.gg-aib .cta{margin-left:auto;display:inline-flex;align-items:center;gap:9px;font-family:var(--f-display);font-weight:800;
  font-size:clamp(11px,1.05cqw,14px);letter-spacing:.02em;color:#3a1c00;padding:10px 18px;border-radius:999px;text-decoration:none;
  background:linear-gradient(135deg,var(--cta-a),var(--cta-b));box-shadow:0 12px 26px -12px rgba(232,135,14,.6),inset 0 1px 0 rgba(255,255,255,.5)}
.gg-aib .cta span{transition:transform .2s}.gg-aib .cta:hover span{transform:translateX(3px)}
.gg-aib .note{font-size:clamp(7.5px,.72cqw,10px);color:var(--faint);font-style:italic}

@keyframes ggaibSpin{to{transform:rotate(360deg)}}
@keyframes ggaibDash{to{stroke-dashoffset:-16}}
.gg-aib .wire{stroke-dasharray:2 4;animation:ggaibDash 1.1s linear infinite}
@media (prefers-reduced-motion:reduce){.gg-aib .core .ring,.gg-aib .wire{animation:none}}
@media (max-width:720px){
  .gg-aib .banner{aspect-ratio:auto;padding:22px 16px;gap:16px}
  .gg-aib .stage{grid-template-columns:1fr;gap:14px;perspective:none}
  .gg-aib .stage > .panel:nth-child(1),
  .gg-aib .stage > .panel:nth-child(2),
  .gg-aib .stage > .panel:nth-child(3){transform:none}
  .gg-aib .flowbox{min-height:210px}
  .gg-aib h1{font-size:32px}
  .gg-aib .kicker{display:none}
  .gg-aib .sub{font-size:13px}
  .gg-aib .core{width:32%}
  .gg-aib .chart{min-height:120px}
  .gg-aib .chip{font-size:10px;padding:5px 8px}
  .gg-aib .chip .ic{font-size:12px}
  .gg-aib .caps{flex-direction:column;align-items:stretch;gap:8px}
  .gg-aib .cta{margin-left:0;width:100%;justify-content:center;padding:13px 18px;margin-top:2px}
}
`

export default function GuacAIBanner() {
  return (
    <div className="gg-aib">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className="banner"
        role="img"
        aria-label="Guac AI hero banner on white: receipts feed a glowing Guac AI brain; refunds, price drops and Worth-It scores come out."
      >
        <header>
          <div className="toprow">
            <div className="wordmark">
              <span className="avo">🥑</span>
              <b>GUAC{' '}<span>AI</span></b>
            </div>
            <div className="kicker">Your money&apos;s smartest sidekick</div>
          </div>
          <h1>Every receipt, <span className="g">read{' '}&amp;{' '}understood.</span></h1>
          <p className="sub"><strong>Guac AI reads the fine print for you</strong> — snap a receipt or forward an email, and it finds refunds, watches prices, and scores whether each buy was actually worth it.</p>
        </header>

        <div className="stage">
          <div className="panel flow">
            <div className="flowbox">
              <span className="lane" style={{ top: '-2%' }}>Feed it</span>
              <span className="lane r" style={{ top: '-2%' }}>It hands back</span>
              <svg className="wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="ggaib-gin" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#65A30D" stopOpacity=".08" />
                    <stop offset="1" stopColor="#1F8A3D" stopOpacity=".9" />
                  </linearGradient>
                  <linearGradient id="ggaib-gout" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#1F8A3D" stopOpacity=".9" />
                    <stop offset="1" stopColor="#65A30D" stopOpacity=".08" />
                  </linearGradient>
                </defs>
                <g fill="none" strokeWidth="1.2" strokeLinecap="round">
                  <path className="wire" d="M17,16 C34,16 36,50 50,50" stroke="url(#ggaib-gin)" />
                  <path className="wire" d="M15,50 C32,50 38,50 50,50" stroke="url(#ggaib-gin)" />
                  <path className="wire" d="M17,84 C34,84 36,50 50,50" stroke="url(#ggaib-gin)" />
                  <path className="wire" d="M50,50 C64,50 66,16 83,16" stroke="url(#ggaib-gout)" />
                  <path className="wire" d="M50,50 C66,50 68,50 85,50" stroke="url(#ggaib-gout)" />
                  <path className="wire" d="M50,50 C64,50 66,84 83,84" stroke="url(#ggaib-gout)" />
                </g>
              </svg>
              <div className="chip in" style={{ top: '16%' }}><span className="ic">📸</span>Receipt photos</div>
              <div className="chip in" style={{ top: '50%' }}><span className="ic">✉️</span>Email receipts</div>
              <div className="chip in" style={{ top: '84%' }}><span className="ic">🧾</span>Bills &amp; PDFs</div>
              <div className="core">
                <div className="ring"></div>
                <div className="ring r2"></div>
                <div className="brainstage">
                  <span className="avowm" aria-hidden="true">🥑</span>
                  <svg className="brain" viewBox="0 0 100 92" aria-hidden="true">
                    <defs>
                      <linearGradient id="ggaib-brain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ECFCCB" />
                        <stop offset="1" stopColor="#BEF264" />
                      </linearGradient>
                    </defs>
                    <path className="bout" d="M50 10 C 43 4,32 5,28 12 C 19 10,12 17,15 25 C 7 29,7 40,14 45 C 9 51,12 62,21 63 C 22 73,32 79,41 74 C 45 80,55 80,59 74 C 68 79,78 73,79 63 C 88 62,91 51,86 45 C 93 40,93 29,85 25 C 88 17,81 10,72 12 C 68 5,57 4,50 10 Z" />
                    <path className="bfis" d="M50 11 C 47 28,52 46,50 74" />
                    <path className="bgy" d="M28 18 C 36 20,33 27,41 28" />
                    <path className="bgy" d="M16 27 C 25 27,23 35,33 37" />
                    <path className="bgy" d="M15 46 C 24 45,24 53,34 53" />
                    <path className="bgy" d="M23 62 C 31 59,33 66,42 64" />
                    <path className="bgy" d="M72 18 C 64 20,67 27,59 28" />
                    <path className="bgy" d="M84 27 C 75 27,77 35,67 37" />
                    <path className="bgy" d="M85 46 C 76 45,76 53,66 53" />
                    <path className="bgy" d="M77 62 C 69 59,67 66,58 64" />
                  </svg>
                  <div className="corelabel"><b>Guac AI</b><small>reads it</small></div>
                </div>
              </div>
              <div className="chip out" style={{ top: '16%' }}><span className="ic">💸</span>Refund alerts</div>
              <div className="chip out" style={{ top: '50%' }}><span className="ic">📉</span>Price drops</div>
              <div className="chip out" style={{ top: '84%' }}><span className="ic">⭐</span>Worth-It scores</div>
            </div>
          </div>

          <div className="panel">
            <h2>Worth-It verdicts</h2>
            <p className="cap">Every purchase, scored</p>
            <div className="verdicts">
              <div className="vrow"><span className="lbl">Worth it</span><span className="num">1,842</span><span className="bar"><i style={{ width: '92%' }}></i></span></div>
              <div className="vrow"><span className="lbl">Mostly worth it</span><span className="num">2,610</span><span className="bar"><i style={{ width: '78%' }}></i></span></div>
              <div className="vrow"><span className="lbl">Mixed</span><span className="num">1,205</span><span className="bar warn"><i style={{ width: '52%' }}></i></span></div>
              <div className="vrow"><span className="lbl">Overpaid</span><span className="num">486</span><span className="bar bad"><i style={{ width: '30%' }}></i></span></div>
              <div className="vrow"><span className="lbl">Regret</span><span className="num">173</span><span className="bar bad"><i style={{ width: '16%' }}></i></span></div>
            </div>
          </div>

          <div className="panel trend">
            <h2>GuacScore</h2>
            <p className="cap">Climbing, last 6 months</p>
            <div className="big">88<em>▲ +26</em></div>
            <p className="tcap">Higher score = healthier spending</p>
            <div className="chart">
              <div className="col"><i style={{ height: '42%' }}></i><span>F</span></div>
              <div className="col"><i style={{ height: '50%' }}></i><span>M</span></div>
              <div className="col"><i style={{ height: '58%' }}></i><span>A</span></div>
              <div className="col"><i style={{ height: '70%' }}></i><span>M</span></div>
              <div className="col"><i style={{ height: '82%' }}></i><span>J</span></div>
              <div className="col hl"><i style={{ height: '96%' }}></i><span>J</span></div>
            </div>
          </div>
        </div>

        <footer>
          <div className="caps">
            <div className="capchip"><b>100%</b> of receipts — photo + email</div>
            <div className="capchip">Every <b>refund, return &amp; subscription</b> tracked</div>
            <div className="capchip"><b>Worth-It</b> on every purchase</div>
            <a className="cta" href="/register">Meet your sidekick <span>→</span></a>
          </div>
          <p className="note">Figures shown are illustrative of the product experience.</p>
        </footer>
      </div>
    </div>
  )
}
