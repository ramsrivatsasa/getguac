'use client'

// Money Quiz — the trivia mechanic, with one rule: every question has a single
// answer that is true by definition or by arithmetic, and the explanation shows
// why. No invented statistics, no "the average person spends X" claims, nothing
// that depends on a survey nobody can check.
//
// That rule is why several obvious quiz questions are missing. "How much should
// you save each month?" has no correct answer, so it is not here.

import { Choice, Explain, GameShell, Progress, Summary, useRun } from '../brainKit'

const ROUNDS = [
  {
    q: 'A shop advertises "30% off, today only". What does that tell you about the price?',
    options: [
      'It is 30% below what the shop was charging before',
      'It is 30% below what other shops charge',
      'It is the lowest price this item has ever been',
    ],
    answer: 0,
    why: 'A discount is measured against that shop\'s own previous price and nothing else. It says nothing about what anyone else charges, or whether the earlier price was itself a high one.',
  },
  {
    q: 'You pay only the minimum on a credit card each month. What happens to the balance?',
    options: [
      'It clears in a fixed number of months',
      'It shrinks slowly while interest is added to what remains',
      'It stays exactly the same',
    ],
    answer: 1,
    why: 'A minimum payment is set to cover the interest plus a small slice of the balance. The balance does fall — just slowly, while interest keeps accruing on whatever is still owed, which is why the total paid ends up well above the original purchase.',
  },
  {
    q: 'Which of these is set by the shop rather than by law?',
    options: [
      'How long you have to return an unwanted item',
      'Whether you receive a receipt',
      'The currency you are charged in',
    ],
    answer: 0,
    why: 'Return windows for a simple change of mind are store policy, and vary between shops and even between product types in one shop. That is why the policy is worth reading before buying, not after.',
  },
  {
    q: 'A subscription renews annually. When is it easiest to notice?',
    options: [
      'When the charge lands',
      'Before the renewal date, from the previous year\'s record',
      'It cannot be noticed in advance',
    ],
    answer: 1,
    why: 'An annual charge has no monthly rhythm to spot it in, so it is almost always noticed after it lands. The record of last year\'s charge is what makes it visible in advance — the date is the whole warning.',
  },
  {
    q: 'Two shops sell the same item. One is $2 cheaper but a 20-minute drive further. What has to be counted?',
    options: [
      'Only the $2 difference',
      'The $2, plus fuel and the time',
      'Nothing — cheaper is cheaper',
    ],
    answer: 1,
    why: 'The saving is $2. The trip costs fuel and 40 minutes of round trip. For one item that is usually a loss; combined with a shop you were making anyway it can be a gain. The comparison is only honest once the trip is in it.',
  },
  {
    q: 'What does a "0% for 12 months" payment plan always cost you?',
    options: [
      'Nothing at all, in every case',
      'Nothing in interest, but it commits future income',
      'The same as paying interest',
    ],
    answer: 1,
    why: 'If it is genuinely 0% and paid on schedule, you pay no interest. What it still costs is flexibility: twelve months of income is already promised, and a missed payment usually ends the 0% period.',
  },
  {
    q: 'Your receipt lists items but your bank statement shows one total. Which answers "what did I actually buy?"',
    options: ['The statement', 'The receipt', 'Both equally'],
    answer: 1,
    why: 'A statement records that money moved to a merchant. Only the receipt holds the line items, so only the receipt can answer what came home — which is why a total alone cannot explain a month.',
  },
]

export default function MoneyQuiz() {
  const run = useRun(ROUNDS.length)
  const round = ROUNDS[Math.min(run.index, ROUNDS.length - 1)]

  if (run.done) {
    return (
      <Summary
        correct={run.correct}
        total={ROUNDS.length}
        best={run.best}
        onRestart={run.restart}
        takeaway="Most of these turn on the same move: ask what a number is being measured against. A discount, a minimum payment and a saving are all relative to something, and naming that something usually answers the question."
      />
    )
  }

  const state = (i) => {
    if (!run.answered) return 'idle'
    if (i === round.answer) return 'right'
    if (i === run.answered.choice) return 'wrong'
    return 'muted'
  }

  return (
    <>
      <Progress index={run.index} total={ROUNDS.length} correct={run.correct} />
      <p className="mt-7 text-lg font-black leading-snug text-[#16331f]">{round.q}</p>

      <div className="mt-5 grid gap-3">
        {round.options.map((opt, i) => (
          <Choice
            key={opt}
            state={state(i)}
            disabled={!!run.answered}
            onClick={() => run.answer(i === round.answer, i)}
          >
            <span className="text-[15px] font-semibold leading-6 text-[#16331f]">{opt}</span>
          </Choice>
        ))}
      </div>

      {run.answered && (
        <Explain ok={run.answered.ok} onNext={run.next} last={run.index === ROUNDS.length - 1}>
          {round.why}
        </Explain>
      )}
    </>
  )
}
