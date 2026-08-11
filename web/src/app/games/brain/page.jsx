// Hub for the brain games.
//
// This folder is deliberately standalone: nothing here imports from
// components/games/, and nothing here edits GamesHub.jsx, games/page.jsx or
// arcadeKit.jsx. Those are another agent's active workspace. The three routes
// are reachable directly at /games/brain and linkable from anywhere; adding
// them to the main arcade grid is a separate one-line change in GamesHub,
// to be made by whoever owns that file.
//
// Why these three and not more Poki clones: the arcade already has the generic
// half of that category — sudoku, wordsearch, chess, solitaire, pairs, guacdle,
// merge, simon. Duplicating those adds pages without adding anything. What was
// missing is the part where the puzzle IS the money reasoning.

import Link from 'next/link'
import { ArrowRight, Coins, Receipt, Scale } from 'lucide-react'

export const metadata = {
  title: 'Money brain games | GetGuac',
  description: 'Three short puzzle games about real money decisions: comparing offers, spotting an avoidable charge, and reading what a number is measured against.',
}

const GAMES = [
  {
    href: '/games/brain/value',
    icon: Scale,
    name: 'Better Value',
    rounds: '6 rounds',
    blurb: 'Two offers, one is genuinely cheaper. The bigger box, the sale tag and the multibuy are each set up to look like the answer.',
    skill: 'Unit price, BOGO, membership break-even',
  },
  {
    href: '/games/brain/fees',
    icon: Receipt,
    name: 'Fee Hunt',
    rounds: '5 rounds',
    blurb: 'A month of charges with one avoidable line hiding among rent, groceries and a subscription you chose on purpose.',
    skill: 'Separating cost of living from cost of timing',
  },
  {
    href: '/games/brain/quiz',
    icon: Coins,
    name: 'Money Quiz',
    rounds: '7 questions',
    blurb: 'Discounts, minimum payments, return windows and annual renewals — each answer true by definition or arithmetic, with the reasoning shown.',
    skill: 'Reading what a number is measured against',
  },
]

export default function BrainGamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
      <Link href="/games" className="text-sm font-bold text-emerald-800 hover:text-emerald-900">
        &larr; Guac Arcade
      </Link>

      <p className="mt-6 text-[11px] font-black uppercase tracking-[.18em] text-lime-700">Brain games</p>
      <h1 className="mt-2 text-4xl font-black leading-tight text-[#16331f] sm:text-5xl">
        Puzzles where the puzzle is the money.
      </h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-8 text-gray-600">
        Short rounds you can finish in a couple of minutes. Every answer comes with the arithmetic
        behind it, so the thing you take away is a method rather than a score.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {GAMES.map(({ href, icon: Icon, name, rounds, blurb, skill }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-lime-500 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173d27] text-[#b8ef52]">
              <Icon size={22} />
            </span>
            <span className="mt-4 text-[11px] font-black uppercase tracking-[.14em] text-lime-700">{rounds}</span>
            <span className="mt-1 text-2xl font-black text-[#16331f]">{name}</span>
            <span className="mt-3 text-sm leading-6 text-gray-600">{blurb}</span>
            <span className="mt-4 block rounded-xl bg-[#f5f8ed] px-3 py-2 text-xs font-bold leading-5 text-[#31533a]">
              {skill}
            </span>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#4d7c0f]">
              Play <ArrowRight className="transition group-hover:translate-x-1" size={16} />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-6 text-gray-500">
        Nothing here is scored against other players and no result is stored. The prices are
        illustrative, chosen so the arithmetic in each explanation can be checked by hand.
      </p>
    </main>
  )
}
