// Goal coverage uses the income target, never the number/value of selected tasks.
export function goalProgress(groups, targetCents) {
  const completedCents = groups.reduce((sum, group) => sum + Math.max(0, group.completed), 0)
  const denominator = targetCents > 0 ? Math.max(targetCents, completedCents) : 0
  let offset = 0
  const contributions = groups.map(group => {
    const share = denominator > 0 ? Math.max(0, group.completed) / denominator * 100 : 0
    const result = { ...group, share, offset }
    offset += share
    return result
  })
  return { contributions, completedCents, completion: targetCents > 0 ? Math.min(100, completedCents / targetCents * 100) : 0, remainingCents: Math.max(0, (targetCents || 0) - completedCents) }
}
