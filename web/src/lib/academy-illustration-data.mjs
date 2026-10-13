export function illustrationText(lesson){
 const id=lesson.sourceSlug||lesson.slug
 const captions={
  'where-you-stand':'Income flows into your monthly budget and expenses flow out. Separately, list what you own and what you owe to understand your financial position.',
  'track-spending-with-receipts':'Keep your receipt, group each purchase by spending category, then review your spending totals. A receipt records a purchase; it does not automatically create savings.',
  'get-the-refund-youre-owed':'Keep proof of purchase, request the refund, and check that the money reaches your account. A request or approval is not the same as money received.',
  'fifty-thirty-twenty':'Illustrative $4,200 take-home month: $2,100 for needs, $1,260 for wants, and $840 for savings and extra debt. The 50/30/20 split is a guideline, not a requirement.',
  'zero-based-budgeting':'Illustrative $3,500 income assigned to rent and utilities ($1,450), groceries and fuel ($650), insurance and minimum payments ($300), emergency savings ($300), extra debt ($200), and wants and buffer ($600). Nothing is left unassigned; savings are a job too.',
  'utility-bills-usage':'Read a utility bill as usage multiplied by the applicable rate, plus fixed charges. Verify the actual tariff, taxes and adjustments before calculating the total. Reducing usage is a task, not guaranteed dollar savings.',
  'stock-splits-and-dilution':'In the lesson’s made-up company, a 2-for-1 split keeps your ownership at 1%. Issuing 250,000 additional shares instead reduces it to 0.8%. Price alone does not tell you ownership.',
 }
 return captions[id]||`Three ideas for ${lesson.title}: ${lesson.extras.ideas.map(i=>i.t).join('; ')}.`
}

