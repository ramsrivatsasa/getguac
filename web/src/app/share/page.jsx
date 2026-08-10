import Link from 'next/link'
import { Bookmark, Gamepad2, Gift, Send } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import ShareButtons, { SITE } from './ShareButtons'

// The PUBLIC share page, added 2026-08-09 for the "Share GetGuac" nav item Ram
// asked for (the reference is YNAB's "Share YNAB" menu).
//
// It is public on purpose. The coded referral already exists at /invite, but that
// is a (dashboard) route: linking it from a public menu bounces a logged-out
// visitor to the sign-in screen, which is the exact mistake the tools grid on the
// Learn hub used to make. So the three menu items are anchors here, and the
// referral section explains the reward and hands off to /invite for the code.
//
// 🔒 HONESTY. Forwarding a plain link earns NOTHING - the Smash-days credit needs
// a personal referral code, which needs an account. The two are kept in separate
// sections and the forward section makes no reward claim. Do not "simplify" this
// by putting a reward line at the top of the page; it would be false for the
// path most visitors take.
//
// This route sits alongside /share/[token] (a shared receipt) and /share/preview.
// Next resolves /share to this page and /share/<anything> to those, so there is
// no collision.

export const metadata = {
  title: 'Share GetGuac with a friend',
  description:
    'Send GetGuac to someone by email, WhatsApp or message, bookmark it for later, or refer a friend with your code and earn Smash days.',
  alternates: { canonical: '/share' },
  // noindex, FOLLOW. This is a utility page -- share buttons and a keyboard
  // shortcut -- with nothing a searcher is looking for. `follow` keeps it
  // crawlable so it still passes link equity to /invite and /games; only the
  // indexing is declined. It is deliberately absent from the sitemap too.
  robots: { index: false, follow: true },
}

// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THIS STRING.
// It goes inside a React <style>, where the server and the browser escape >, &,
// ' and " differently - a text-content hydration mismatch plus invalid CSS on the
// server pass. This has shipped broken to production twice. See scripts/
// check-style-blocks.mjs, which enforces it.
const SH_CSS = `
.sh-wrap { width: min(880px, calc(100% - 36px)); margin: auto; }
.sh-hero { padding: 46px 0 30px; background: radial-gradient(circle at 85% 8%, #e9f8dc 0 14%, transparent 36%), linear-gradient(180deg,#fff,#f7fbf4); }
.sh-crumb { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: #7c8a80; font-size: 12px; font-weight: 600; }
.sh-crumb a { color: #7c8a80; text-decoration: none; }
.sh-crumb a:hover { color: #138a48; }
.sh-eyebrow { color: #138a48; font-size: 11px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
.sh-hero h1 { margin: 9px 0 13px; font-size: clamp(34px,4.4vw,54px); line-height: 1.02; font-weight: 800; }
.sh-lede { max-width: 640px; margin: 0; color: #405449; font-size: 16.5px; line-height: 1.6; }
.sh-card { padding: 26px; border: 1px solid #dce7de; border-radius: 24px; background: #fff; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); }
.sh-section { padding: 26px 0; scroll-margin-top: 84px; }
.sh-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.sh-ico { display: inline-grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: 12px; background: #eef8e9; color: #138a48; }
.sh-head h2 { margin: 0; font-size: 24px; font-weight: 800; }
.sh-sub { margin: 0 0 18px; color: #65736a; font-size: 14px; line-height: 1.55; }
.sh-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.sh-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 17px; border: 1px solid #cddcd1; border-radius: 999px; background: #fff; color: #21402c; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; transition: .16s; font-family: inherit; }
.sh-btn:hover { border-color: #9dc6a9; background: #f6fbf4; }
.sh-btn-primary { border-color: #12341f; background: #12341f; color: #fff; }
.sh-btn-primary:hover { border-color: #1b4a2c; background: #1b4a2c; }
.sh-note { margin: 14px 0 0; color: #8b998f; font-size: 12.5px; line-height: 1.5; }
.sh-steps { margin: 0; padding-left: 20px; color: #3f5246; font-size: 14px; line-height: 1.75; }
.sh-kbd { display: inline-block; padding: 2px 7px; border: 1px solid #d5e0d8; border-bottom-width: 2px; border-radius: 6px; background: #f7faf6; color: #21402c; font-size: 12.5px; font-weight: 700; }
.sh-refer-link { display: inline-flex; align-items: center; padding: 12px 19px; border-radius: 999px; background: #12341f; color: #fff; font-weight: 800; font-size: 14px; text-decoration: none; }
.sh-refer-link:hover { background: #1b4a2c; }
@media (max-width: 540px) {
  .sh-wrap { width: min(100% - 24px, 880px); }
  .sh-hero h1 { font-size: 34px; }
  .sh-card { padding: 20px; }
  .sh-actions .sh-btn { flex: 1 1 100%; justify-content: center; }
}
`

export default function SharePage() {
  return (
    <MarketingShell subtitle="share" hideSearch>
      <style>{SH_CSS}</style>

      <section className="sh-hero">
        <div className="sh-wrap">
          <nav className="sh-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Share GetGuac</span>
          </nav>
          <span className="sh-eyebrow">Share GetGuac</span>
          <h1>Know someone drowning in receipts?</h1>
          <p className="sh-lede">
            Send them the link, or refer them with your code and you both get Smash days.
            Either way it is free for them to try — no card, no account needed for the first receipt.
          </p>
        </div>
      </section>

      <div className="sh-wrap" style={{ paddingBottom: 34 }}>
        {/* FORWARD. No reward claim anywhere in this section - a plain link
            carries no referral code, so nothing is credited. See the note at the
            top of this file. */}
        <section className="sh-section" id="forward">
          <div className="sh-card">
            <div className="sh-head">
              <span className="sh-ico" aria-hidden="true"><Send size={18} /></span>
              <h2>Forward it to a friend</h2>
            </div>
            <p className="sh-sub">
              Pick however you already talk to them. The message is written for you and you can edit it
              before it sends.
            </p>
            <ShareButtons />
            <p className="sh-note">
              A plain link does not carry a referral code, so nothing is credited to either of you.
              If you want the Smash days, use your code below instead.
            </p>
          </div>
        </section>

        {/* REFER. The reward terms are copied from the real mechanic on
            /invite - one bonus per new user, both sides credited, self-referrals
            excluded. The number of days is NOT repeated here: it lives in
            REWARD_DAYS on the invite page and a second copy would go stale. */}
        <section className="sh-section" id="refer">
          <div className="sh-card">
            <div className="sh-head">
              <span className="sh-ico" aria-hidden="true"><Gift size={18} /></span>
              <h2>Refer a friend and you both gain</h2>
            </div>
            <p className="sh-sub">
              {/* "streak" is on the avoid-list for this project - see the
                  competitor-vocabulary note. The mechanic is Smash days. */}
              Your account comes with a referral code. When a friend signs up with it, Smash days are
              credited to you and the same number to them, on their first dashboard load. One bonus per
              new user, and self-referrals do not count.
            </p>
            <Link className="sh-refer-link" href="/invite">Get my referral code</Link>
            <p className="sh-note">
              Your code lives in your account, so this one needs you signed in.
            </p>
          </div>
        </section>

        {/* GAMES. The destination for the "Share a game" item in the Games menu.
            It exists because that submenu needed somewhere real to point: the
            arcade hub has no anchors, and pointing a second menu item at plain
            /games would have duplicated the first one.
            The per-game Share button lives in components/games/GameActions.jsx,
            which every game page renders - so this section explains where it is
            rather than repeating a picker for 500-odd games. */}
        <section className="sh-section" id="games">
          <div className="sh-card">
            <div className="sh-head">
              <span className="sh-ico" aria-hidden="true"><Gamepad2 size={18} /></span>
              <h2>Share a game</h2>
            </div>
            <p className="sh-sub">
              Every game in the arcade has a <strong>Share</strong> button on its own page, next to
              Like and Fullscreen — it copies a link straight to that game. Or send the whole arcade:
            </p>
            <ShareButtons
              url={`${SITE}/games`}
              subject="Free games on GetGuac"
              body={`The GetGuac arcade is free to play, no account needed.\n\n${SITE}/games`}
            />
            <p className="sh-note">
              Free to play and no sign-up required, so a link is all anyone needs.
            </p>
          </div>
        </section>

        {/* BOOKMARK. A page cannot add a bookmark for the visitor - every browser
            removed that API deliberately - so this tells them the shortcut rather
            than offering a button that cannot work. */}
        <section className="sh-section" id="bookmark">
          <div className="sh-card">
            <div className="sh-head">
              <span className="sh-ico" aria-hidden="true"><Bookmark size={18} /></span>
              <h2>Save it for later</h2>
            </div>
            <p className="sh-sub">
              Browsers do not let a page bookmark itself, so here is the shortcut:
            </p>
            <ul className="sh-steps">
              <li>Windows and Linux: <span className="sh-kbd">Ctrl</span> + <span className="sh-kbd">D</span></li>
              <li>Mac: <span className="sh-kbd">Cmd</span> + <span className="sh-kbd">D</span></li>
              <li>iPhone or iPad: the share icon, then <strong>Add to Home Screen</strong></li>
              <li>Android: the menu, then <strong>Add to Home screen</strong></li>
            </ul>
            <p className="sh-note">
              Added to your home screen, GetGuac opens like an app — which is the quickest way to
              photograph a receipt while you are still standing at the till.
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  )
}
