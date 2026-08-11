'use client'

// Better Value — the Brain Test / trick-question mechanic, but the trick is the
// one shelves actually play: the bigger label, the sale tag and the multibuy are
// each set up to look like the answer.
//
// Every round is decided by arithmetic shown in the explanation, so nothing here
// depends on a claim you cannot check. Prices are illustrative, not scraped.

import { Choice, Explain, GameShell, Progress, Summary, useRun } from '../brainKit'

// unit: what one of the thing costs. Always spelled out in `why`.
const ROUNDS = [
  {
    q: 'Same brand of coffee pods, same shop.',
    a: { label: '24 pods', price: '$14.40', sub: 'no offer' },
    b: { label: '40 pods', price: '$26.00', sub: 'bigger box' },
    better: 'a',
    why: '24 pods at $14.40 is $0.60 each. 40 pods at $26.00 is $0.65 each. The big box costs more per pod — buying bigger is a habit, not a rule.',
  },
  {
    q: 'Washing powder. One is on promotion.',
    a: { label: '2 kg', price: '$9.00', sub: 'usual price' },
    b: { label: '1.5 kg', price: '$6.30', sub: 'ON SALE, was $7.50' },
    better: 'b',
    why: '$9.00 for 2 kg is $4.50 a kg. $6.30 for 1.5 kg is $4.20 a kg. Here the sale really is cheaper per kg — which is the point: a promotion is sometimes the better buy, so each one has to be checked rather than assumed either way.',
  },
  {
    q: 'Buy-one-get-one-free, or a straight discount?',
    a: { label: '2 for the price of 1', price: '$8.00', sub: 'you take 2 home' },
    b: { label: 'Single, 40% off', price: '$4.80', sub: 'was $8.00' },
    better: 'a',
    why: 'The BOGO gives 2 units for $8.00, so $4.00 each. The discount gives 1 unit for $4.80. BOGO wins per unit — but only if you will use the second one. If it expires first, you paid $8.00 for one.',
  },
  {
    q: 'A membership store versus the supermarket, for one item.',
    a: { label: 'Supermarket', price: '$5.20', sub: 'walk in' },
    b: { label: 'Members-only', price: '$3.90', sub: '$60 a year to join' },
    better: 'a',
    why: 'The member price saves $1.30 on this item. The $60 fee needs about 47 purchases like this before it breaks even. For one item the supermarket is cheaper; membership only pays off across a whole year of shopping.',
  },
  {
    q: 'Free delivery threshold.',
    a: { label: 'Basket $38 + $5.99 delivery', price: '$43.99', sub: 'what you need' },
    b: { label: 'Basket $50, free delivery', price: '$50.00', sub: 'add $12 of extras' },
    better: 'a',
    why: 'Paying the $5.99 costs $43.99. Reaching free delivery costs $50.00 and brings home $12 you had not planned to buy. Spending $12 to save $5.99 is not a saving.',
  },
  {
    q: 'Same laptop, two payment options.',
    a: { label: 'Pay now', price: '$720', sub: 'one payment' },
    b: { label: '12 x $65', price: '$780', sub: '"0% for 12 months"' },
    better: 'a',
    why: '12 payments of $65 is $780 — $60 more than paying now. A plan can be worth it for cash flow, but this one is not free: the $60 is the cost of spreading it.',
  },
]

export default function ValueDuel() {
  const run = useRun(ROUNDS.length)
  const round = ROUNDS[Math.min(run.index, ROUNDS.length - 1)]

  if (run.done) {
    return (
      <Summary
        correct={run.correct}
        total={ROUNDS.length}
        best={run.best}
        onRestart={run.restart}
        takeaway="One habit carries all six rounds: divide before you decide. Price per unit, per kg, or per use turns a display of competing labels into a single comparable number."
      />
    )
  }

  // `better` names the genuinely cheaper option outright. One round answers 'b'
  // on purpose, so the set never teaches the false shortcut "the promotion
  // always loses" — the lesson is to divide, not to distrust sale tags.
  const correctKey = round.better
  const state = (key) => {
    if (!run.answered) return 'idle'
    if (key === correctKey) return 'right'
    if (key === run.answered.choice) return 'wrong'
    return 'muted'
  }

  return (
    <>
      <Progress index={run.index} total={ROUNDS.length} correct={run.correct} />
      <p className="mt-7 text-lg font-black text-[#16331f]">{round.q}</p>
      <p className="mt-1 text-sm text-gray-500">Which is the better value?</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {['a', 'b'].map((key) => (
          <Choice
            key={key}
            state={state(key)}
            disabled={!!run.answered}
            onClick={() => run.answer(key === correctKey, key)}
          >
            <span className="block text-base font-black text-[#16331f]">{round[key].label}</span>
            <span className="mt-1 block text-2xl font-black text-lime-700">{round[key].price}</span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              {round[key].sub}
            </span>
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
