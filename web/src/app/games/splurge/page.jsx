import GamePageShell from '../../../components/games/GamePageShell'
import SplurgeSlicer from '../../../components/games/SplurgeSlicer'

export const metadata = {
  title: 'Splurge Slicer — slice your own spending, free money game',
  description:
    'Play Splurge Slicer free: your real purchases fly up and you swipe to slice the splurges and spare the essentials. Signs you in to play with your own receipts, or try the demo. No download.',
  alternates: { canonical: '/games/splurge' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/splurge"
      title="Splurge Slicer"
      blurb="Slice the splurges, spare the essentials"
      how={[
        'Your purchases get tossed into the air. Swipe across the rose-rimmed splurges to slice them and bank the dollars as "Saved". These are the discretionary wants — takeout, impulse gadgets, the fourth streaming app, anything you rated not-worth-it.',
        'Let the green-rimmed essentials fall untouched — groceries, rent, medicine, utilities. Slice a need by mistake and it costs you an avocado. Three avocados and the round is over.',
        'Chain three or more slices in a single swipe for a Guac-frenzy combo bonus. Signed in, the game pulls your actual receipts; signed out, it plays a demo set so you can see how it works.',
      ]}
      tips={[
        'Watch the rim colour, not the emoji: rose = slice, green = leave it.',
        'Wait for two or three splurges to cluster near the top of their arc, then take them all in one stroke for the combo.',
        'This is a game — slicing never changes your real ratings or GuacScore. Play freely.',
        'Sign in first: cutting your own real splurges hits differently than cutting demo ones.',
      ]}
    >
      <SplurgeSlicer />
    </GamePageShell>
  )
}
