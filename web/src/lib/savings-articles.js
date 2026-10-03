// Original editorial copy. No affiliate offers or promised outcomes.
export const SAVINGS_ARTICLES = [
  {
    slug:'small-changes-more-room', title:'Small changes. More room for what matters.',
    category:'Saving', excerpt:'Keep the things you enjoy. Find one change that fits your life.',
    readMins:3, updated:'2026-09-28', body:[
      'A purchase is not a character test. Convenience, enjoyment and time all have value. A useful savings plan gives you choices and lets you decide which ones are worth making.',
      {h:'Start with one choice'},
      {list:['Keep it: the purchase still earns its place in your life.','Swap it: a lower-cost option meets the needs you care about.','Reduce it: change a few occasions without giving something up entirely.','Pause it: wait when another purchase is not needed.']},
      {h:'Give each change an honest number'},
      'For an illustrative planned purchase, an $8 usual cost and a $5 comparable replacement leave a $3 difference before extra costs. Making that change four times in a month would produce a $12 estimate. One change is $3, not $12. Prices, travel, delivery and actual frequency can change the result.',
      {figure:{type:'bars',title:'One change or four?',format:'usd',data:[{label:'One completed change',value:3},{label:'Four completed changes',value:12}],caption:'Illustration before extra costs; count only the changes actually made.'}},
      {h:'Separate a plan from a result'},
      'Choosing an option is the beginning. Completing the action records what you did. A later receipt or statement helps establish the actual difference. Keep one-time refunds separate from habits you intend to repeat, and avoid counting the same purchase twice.',
      {h:'Try this today'},
      'Pick one planned purchase or recurring charge. Compare a realistic alternative, including any inconvenience and extra costs. Keep your current choice if the alternative is not a good fit. The point is more room in your budget, at a pace you can sustain.'
    ]
  },
  {
    slug:'grocery-list-worth-reviewing', title:'A grocery list that works for your household',
    category:'Shopping', excerpt:'Compare useful alternatives, check what is already at home, and edit before you shop.',
    readMins:3, updated:'2026-09-28', body:[
      'Your best grocery list starts with what your household will use. A cheaper item is only useful when the size, ingredients and purpose fit your needs.',
      {h:'Compare the same amount'},
      'For example, a 12-ounce pack at $6 costs $0.50 per ounce. A 10-ounce pack at $5.50 costs $0.55 per ounce. The smaller pack has the lower checkout price, while the larger pack has the lower unit price. These are illustrations, not current offers. Buying more is not a saving if the extra food goes unused.',
      {figure:{type:'bars',title:'Compare price per ounce',data:[{label:'12 ounces for $6',value:0.5,display:'$0.50/oz'},{label:'10 ounces for $5.50',value:0.55,display:'$0.55/oz'}],caption:'Illustrative prices. The right quantity also depends on what you will use.'}},
      {h:'Choose the option that fits'},
      {list:['Keep your usual item when its ingredients or quality matter to you.','Try a comparable brand after checking pack size and dietary needs.','Buy a smaller quantity when that reduces waste.','Skip a duplicate when there is enough at home.']},
      {h:'Review before leaving'},
      'Check quantities, pantry stock, current shelf prices and any delivery or membership costs. An earlier receipt or online listing is a reference, not a promise of today’s price or local stock. A single lower price may not justify an extra trip.',
      {h:'Make repeats easier'},
      'Keep useful staples on an editable list. Adjust the next quantity to what you actually used. Record the receipt after shopping so the next comparison starts with a real purchase instead of a guessed saving.',
      'Further reading: USDA MyPlate, Healthy Eating on a Budget, explains meal planning, shopping lists and unit-price comparisons.'
    ]
  },
  {
    slug:'review-bills-with-confidence', title:'A calmer way to review your bills',
    category:'Saving', excerpt:'Understand the change, ask for written options, and choose what works for you.',
    readMins:3, updated:'2026-09-28', body:[
      'Start with a current statement and the previous comparable billing period. A higher total may reflect more usage, a longer period, an expired discount or a new fee. Understanding that difference makes the next conversation more useful.',
      {h:'Ask without committing'},
      'Try: “Could you explain what changed on this statement? Please show me options that keep the service I use, including all fees, the price after any promotion, and any contract or cancellation terms.”',
      {h:'Three reasonable choices'},
      {list:['Keep the current service if it meets your needs at an acceptable total cost.','Remove an optional add-on you no longer use, after checking any conditions.','Compare another plan using the same service requirements and billing period.']},
      {h:'Include the cost of changing'},
      'An illustrative $80 monthly bill compared with a $65 option leaves $15 per month before other costs. A $30 one-time switching fee would use the first two months of that difference. After twelve comparable months the difference would be $150, assuming unchanged prices and no other costs. Do not subtract the one-time fee every month or ignore it entirely.',
      {figure:{type:'bars',title:'First-year comparison',format:'usd',data:[{label:'12 months × $15 difference',value:180},{label:'After $30 switching fee',value:150}],caption:'Illustration with unchanged prices, comparable service and no other costs.'}},
      {h:'Confirm the result'},
      'Keep the provider’s written terms and check the next comparable statement. Do not treat a quoted discount as money already saved. If a service is essential, confirm replacement coverage and timing before canceling.',
      'For bank account fees, the Consumer Financial Protection Bureau’s guidance on monthly maintenance fees explains why account requirements and fee structures are useful to compare. The same attention to written terms helps make a clearer comparison.'
    ]
  }
]
