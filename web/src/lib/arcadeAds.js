// Arcade ad kill-switch.
//
// AdSense keeps rejecting getguac.app for "Low value content". A large part of
// what Google crawls is ~36 arcade game pages — a canvas plus a few dozen words
// each — and running ad units on pages with little content is its own policy
// problem on top of the thin-content judgement. So while we're seeking
// approval the whole arcade runs ad-free: no in-card units, no interstitial ad
// breaks between rounds, no rail units on the game pages.
//
// The games are also noindexed for the same reason (see app/games/layout.jsx),
// so Google evaluates GetGuac on the 20 long-form money articles instead.
//
// Turning ads back on after approval is config, not a code change: set
//   NEXT_PUBLIC_ARCADE_ADS=on
// in the Vercel environment and redeploy. Everything below re-enables at once.
export const ARCADE_ADS_ENABLED = process.env.NEXT_PUBLIC_ARCADE_ADS === 'on'
