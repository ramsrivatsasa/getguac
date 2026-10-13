export const PLAN_LESSONS = [
  {id:'account-costs',title:'What stays after fees?',text:'At a constant $1,000 balance, 4% APY gives $40 over one year. Twelve $5 fees total $60, leaving −$20 before taxes. This illustration assumes fees are paid separately and rates stay unchanged.',question:'Which comparison is useful?',options:[['rate','Only the headline APY'],['after-costs','Yield after fees, plus access and protection']],answer:'after-costs',article:'small-changes-more-room'},
  {id:'repeat-savings',title:'One-time or every month?',text:'Replacing one planned $8 purchase with a $5 alternative leaves a $3 difference before extra costs. Four completed changes give $12. A single return does not become a monthly saving.',question:'One completed change is worth how much?',options:[['three','$3 before extra costs'],['twelve','$12 every month automatically']],answer:'three',article:'small-changes-more-room'},
  {id:'grocery-units',title:'Compare the same amount',text:'A 12-ounce pack for $6 is $0.50 per ounce. A 10-ounce pack for $5.50 is $0.55 per ounce. Choose the amount you will use and check ingredients; a lower unit price does not prevent waste.',question:'Which pack has the lower price per ounce?',options:[['twelve','12 ounces for $6'],['ten','10 ounces for $5.50']],answer:'twelve',article:'grocery-list-worth-reviewing'},
  {id:'switching-costs',title:'Include the cost of changing',text:'A $15 monthly reduction would total $180 over twelve months. After a $30 one-time switching fee, the first-year difference is $150 if prices and service stay comparable.',question:'What is the first-year difference?',options:[['150','$150 after the one-time fee'],['180','$180, ignoring the fee']],answer:'150',article:'review-bills-with-confidence'},
]
export function checkPlanLesson(id,answer){
  const lesson=PLAN_LESSONS.find(l=>l.id===id)
  if(!lesson)throw Error('Choose an available lesson.')
  if(lesson.answer!==answer)throw Error('Try again: compare the full costs and the actual number of changes.')
  return lesson.id
}
