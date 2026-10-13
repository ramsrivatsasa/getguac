// GetGuac Money Bootcamp — a free skills test for every Academy lesson, plus a
// final exam per track. Built 2026-10-12 as new pages only (/money-bootcamp);
// no Academy or article page was edited.
//
// WHERE THE QUESTIONS COME FROM: nothing here is new financial content. Each
// test is assembled from the lesson it tests, read from lib/academy.js:
//   - the lesson's own practice check (3 questions, already shuffled there)
//   - key ideas: match each idea's name to its explanation
//   - action plan: which step comes first
//   - mistakes to avoid: spot the mistake among the lesson's own good actions
// So a lesson edit flows into its test, and every right answer is a sentence the
// lesson already states. The lesson's puzzle is shown as an unscored bonus
// because its answer is free text — inventing wrong numbers for it is not worth
// the risk of a distractor that is accidentally right.
//
// Options are shuffled with a seed (slug + question key) so the server and the
// browser render the same order: no hydration mismatch, stable between visits.

import { TRACKS, academyLessons } from './academy'

export const PASS_PCT = 70
const EXAM_PER_LESSON = 2

function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
}

// Shuffle options (right answer at index 0 on the way in) and record where the
// right answer landed.
function mcq(seed, q, right, wrong, why) {
  const options = [right, ...wrong.filter((w) => w && w !== right)].slice(0, 4)
  const rand = seeded(seed)
  const order = options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  return { q, options: order.map((i) => options[i]), answer: order.indexOf(0), why }
}

// pool: key-idea explanations from the other lessons in the same track, so the
// three idea questions in one test do not all show the same three options.
function lessonQuestions(l, pool) {
  const x = l.extras || {}
  const ideas = x.ideas || []
  const plan = x.plan || []
  const mistakes = x.mistakes || []
  const objectives = x.objectives || []
  const out = l.check.questions.map((q) => ({ ...q, kind: 'Practice' }))

  ideas.forEach((idea, i) => {
    const own = ideas.filter((_, j) => j !== i).map((o) => o.d)
    const rand = seeded(`${l.slug}:pool:${i}`)
    const other = pool.length ? [0, 1, 2].map(() => pool[Math.floor(rand() * pool.length)]) : []
    const wrong = [own[i % Math.max(own.length, 1)], ...other, ...own].filter((d, k, a) => d && a.indexOf(d) === k)
    if (wrong.length < 2) return
    out.push({ ...mcq(`${l.slug}:idea:${i}`, `Which statement best explains "${idea.t}"?`, idea.d, wrong.slice(0, 3), `${idea.t}: ${idea.d}`), kind: 'Key idea' })
  })

  if (plan.length >= 3) {
    out.push({ ...mcq(`${l.slug}:plan`, 'In the action plan, which step comes first?', plan[0].t, plan.slice(1, 4).map((s) => s.t), `Step 1 is "${plan[0].t}": ${plan[0].d}`), kind: 'Action plan' })
  }

  // Spot the mistake: one listed mistake against the lesson's own good actions.
  const good = [...objectives, ...plan.map((s) => s.t)]
  mistakes.slice(0, 2).forEach((m, i) => {
    if (good.length < 3) return
    const wrong = good.slice(i * 3, i * 3 + 3).length === 3 ? good.slice(i * 3, i * 3 + 3) : good.slice(0, 3)
    out.push({ ...mcq(`${l.slug}:mistake:${i}`, 'Which of these is a mistake this lesson warns against?', m, wrong, `"${m}" is listed under mistakes to avoid. The other options are things the lesson recommends.`), kind: 'Mistake to avoid' })
  })

  return out
}

export function minutesFor(count) {
  return Math.max(2, Math.round(count * 0.5))
}

function keywordsFor(title, trackName) {
  const t = title.toLowerCase()
  return [
    `${t} quiz`, `${t} test`, `${trackName.toLowerCase()} quiz`, `${trackName.toLowerCase()} test`,
    'free budgeting test', 'budget bootcamp', 'money bootcamp', 'check your money skills',
    'personal finance quiz', 'financial literacy test', 'money quiz with answers',
  ]
}

// Every lesson test, in Academy course order.
export function bootcampTests() {
  // Academy URLs can change without changing existing bootcamp test IDs,
  // saved results or the deterministic question-order seed.
  const lessons = academyLessons().map(l => ({ ...l, slug: l.sourceSlug || l.slug }))
  return lessons.map((l) => {
    const pool = lessons.filter((o) => o.trackId === l.trackId && o.slug !== l.slug).flatMap((o) => ((o.extras && o.extras.ideas) || []).map((i) => i.d))
    const questions = lessonQuestions(l, pool)
    return {
      n: l.n,
      slug: l.slug,
      trackId: l.trackId,
      trackName: l.trackName,
      title: l.title,
      excerpt: l.excerpt,
      objectives: (l.extras && l.extras.objectives) || [],
      exercise: (l.extras && l.extras.exercise) || '',
      puzzle: l.check.puzzle || null,
      updated: l.updated,
      questions,
      minutes: minutesFor(questions.length),
      keywords: keywordsFor(l.title, l.trackName),
    }
  })
}

export function bootcampTest(slug) {
  return bootcampTests().find((t) => t.slug === slug) || null
}

// One final exam per track: the first practice questions from each lesson,
// each one linked back to the lesson it came from.
export function bootcampExams() {
  const tests = bootcampTests()
  return TRACKS.map((track) => {
    const inTrack = tests.filter((t) => t.trackId === track.id)
    const questions = inTrack.flatMap((t) => t.questions.filter((q) => q.kind === 'Practice').slice(0, EXAM_PER_LESSON).map((q) => ({ ...q, kind: t.title, from: t.slug })))
    const name = `${track.name} bootcamp`
    return {
      slug: track.id,
      trackId: track.id,
      trackName: track.name,
      icon: track.icon,
      blurb: track.blurb,
      title: name,
      tests: inTrack.map(({ slug, title }) => ({ slug, title })),
      questions,
      minutes: minutesFor(questions.length),
      keywords: keywordsFor(name, track.name),
    }
  })
}

export function bootcampExam(id) {
  return bootcampExams().find((e) => e.slug === id) || null
}

export function gradeFor(pct) {
  if (pct >= 90) return { label: 'Expert', note: 'You know this topic well. Move on to the next test.' }
  if (pct >= PASS_PCT) return { label: 'Passed', note: 'Solid. Review the explanations you missed, then move on.' }
  if (pct >= 50) return { label: 'Almost there', note: 'Read the lesson once more and retake the test.' }
  return { label: 'Start with the lesson', note: 'Read the lesson first; the test will make more sense after it.' }
}

// Schema.org Quiz markup so search engines can read the questions and answers.
export function quizJsonLd({ name, description, url, about, questions }) {
  return {
    '@context': 'https://schema.org', '@type': 'Quiz', name, description, url,
    about: { '@type': 'Thing', name: about }, educationalLevel: 'Beginner',
    inLanguage: 'en', isAccessibleForFree: true, assesses: about,
    publisher: { '@type': 'Organization', name: 'GetGuac', url: 'https://getguac.app' },
    hasPart: questions.map((q) => ({
      '@type': 'Question', eduQuestionType: 'Multiple choice', learningResourceType: 'Practice problem', text: q.q,
      suggestedAnswer: q.options.filter((_, i) => i !== q.answer).map((o) => ({ '@type': 'Answer', text: o })),
      acceptedAnswer: { '@type': 'Answer', text: q.options[q.answer], answerExplanation: { '@type': 'Comment', text: q.why } },
    })),
  }
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `https://getguac.app${path}` })),
  }
}
