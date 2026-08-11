'use client'

// Fee Hunt — the "Who Is?" deduction mechanic applied to a statement. You are
// shown a month of charges and have to pick the one that was avoidable.
//
// The distractors are deliberately ordinary: rent, groceries, a subscription you
// chose. The skill being practised is separating a cost you agreed to from a
// cost that only happened because of timing, a threshold, or an autopay slip —
// which is the same separation GuacWizard makes on a real statement.

import { Choice, Explain, GameShell, Progress, Summary, useRun } from '../brainKit'

const ROUNDS = [
  {
    month: 'March',
    rows: [
      { label: 'Rent', amount: '$1,450.00' },
      { label: 'Overdraft fee', amount: '$35.00', avoidable: true },
      { label: 'Groceries — 4 trips', amount: '$318.42' },
      { label: 'Phone plan', amount: '$45.00' },
    ],
    why: 'Rent, groceries and the phone plan are all costs you agreed to. The $35 overdraft is the only one that exists purely because money left the account before it arrived — same spending, different order.',
  },
  {
    month: 'April',
    rows: [
      { label: 'Streaming service', amount: '$17.99' },
      { label: 'Electricity', amount: '$96.20' },
      { label: 'Late payment charge', amount: '$29.00', avoidable: true },
      { label: 'Petrol', amount: '$62.80' },
    ],
    why: 'The streaming service is a choice you can review, but you are getting something for it. The $29 late charge bought you nothing at all — the bill was always going to be paid, just a few days sooner.',
  },
  {
    month: 'May',
    rows: [
      { label: 'Card interest on a carried balance', amount: '$41.60', avoidable: true },
      { label: 'Car insurance', amount: '$88.00' },
      { label: 'Dentist', amount: '$120.00' },
      { label: 'Internet', amount: '$49.00' },
    ],
    why: 'Insurance, the dentist and internet are all purchases. The $41.60 is interest — the price of paying later, and the one line here that shrinks the moment the balance does.',
  },
  {
    month: 'June',
    rows: [
      { label: 'Gym membership', amount: '$32.00' },
      { label: 'Out-of-network ATM charge', amount: '$3.50', avoidable: true },
      { label: 'Train pass', amount: '$78.00' },
      { label: 'Takeaway', amount: '$54.30' },
    ],
    why: 'The smallest number on the list is the avoidable one. $3.50 looks trivial, but it is a charge for reaching your own money at the wrong machine — and at twice a month it is $84 a year.',
  },
  {
    month: 'July',
    rows: [
      { label: 'Annual renewal you meant to cancel', amount: '$99.00', avoidable: true },
      { label: 'Council tax', amount: '$142.00' },
      { label: 'Childcare', amount: '$420.00' },
      { label: 'Bank account fee', amount: '$0.00' },
    ],
    why: 'The renewal is the avoidable one, and annual charges are the easiest to miss — it only appears once, long after the trial ended, so there is no monthly rhythm to notice it in.',
  },
]

export default function FeeHunt() {
  const run = useRun(ROUNDS.length)
  const round = ROUNDS[Math.min(run.index, ROUNDS.length - 1)]

  if (run.done) {
    return (
      <Summary
        correct={run.correct}
        total={ROUNDS.length}
        best={run.best}
        onRestart={run.restart}
        takeaway="Avoidable charges rarely look dramatic. They are small, plausible, and sit next to charges you agreed to — which is why finding them is a scanning habit rather than a budgeting exercise."
      />
    )
  }

  const state = (row) => {
    if (!run.answered) return 'idle'
    if (row.avoidable) return 'right'
    if (row.label === run.answered.choice) return 'wrong'
    return 'muted'
  }

  return (
    <>
      <Progress index={run.index} total={ROUNDS.length} correct={run.correct} />
      <p className="mt-7 text-lg font-black text-[#16331f]">{round.month} — which charge was avoidable?</p>
      <p className="mt-1 text-sm text-gray-500">
        One of these did not have to happen. The others are real costs of living.
      </p>

      <div className="mt-5 grid gap-3">
        {round.rows.map((row) => (
          <Choice
            key={row.label}
            state={state(row)}
            disabled={!!run.answered}
            onClick={() => run.answer(!!row.avoidable, row.label)}
          >
            <span className="flex w-full items-baseline justify-between gap-4">
              <span className="text-[15px] font-bold text-[#16331f]">{row.label}</span>
              <span className="shrink-0 text-[15px] font-black text-[#31533a]">{row.amount}</span>
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
