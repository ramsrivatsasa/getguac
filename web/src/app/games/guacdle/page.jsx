import GamePageShell from '../../../components/games/GamePageShell'
import Guacdle from '../../../components/games/Guacdle'

export const metadata = {
  title: 'Guacdle — the daily money word game',
  description:
    'A free Wordle-style daily puzzle where every answer is a 5-letter money, receipts or savings word. Six tries, one new word a day, shareable results.',
  alternates: { canonical: '/games/guacdle' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/guacdle"
      headerTitle="🟩 Guacdle"
      title="Guacdle"
      blurb="One money word a day, six tries"
      how={[
        'Every day there’s one hidden 5-letter word, and it’s always about money — saving, spending, receipts, taxes. You get six guesses.',
        'After each guess the tiles grade themselves: green means right letter in the right spot, yellow means the letter is in the word but somewhere else, gray means it isn’t in the word at all.',
        'Solve it and the day’s money tip appears behind the word. One puzzle per day — your Smash run tracks how many days straight you’ve solved it.',
      ]}
      tips={[
        'Open with a vowel-heavy money word like RAISE or AUDIT to test the most common letters in one throw.',
        'Work the yellows first: relocating a yellow letter tests two facts at once — where it isn’t, and where it might be.',
        'Never reuse a gray letter; under pressure that’s the guess everyone wastes.',
        'The answers lean financial — stuck between two words? Pick the one that sounds like your bank app.',
      ]}
    >
      <Guacdle />
    </GamePageShell>
  )
}
