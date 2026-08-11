import { GameShell } from '../brainKit'
import MoneyQuiz from './MoneyQuiz'

export const metadata = {
  title: 'Money Quiz — a money brain game | GetGuac',
  description: 'Seven questions on discounts, interest, return windows and renewals. Every answer comes with the reasoning, not a fun fact.',
}

export default function MoneyQuizPage() {
  return (
    <GameShell
      eyebrow="Brain game · 7 questions"
      title="Money Quiz"
      blurb="Every question here has one answer that is true by definition or by arithmetic, and the explanation shows why. No invented averages."
    >
      <MoneyQuiz />
    </GameShell>
  )
}
