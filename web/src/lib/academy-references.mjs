const sources={
 mit:{label:'MIT: budgeting worksheet',href:'https://sfs.mit.edu/manage-your-money/budgeting/budgeting-worksheet/',note:'A student-focused worksheet separating billed charges, monthly living costs and one-time resources.'},
 fidelity:{label:'Fidelity: how to budget in simple steps',href:'https://www.fidelity.com/learning-center/smart-money/how-to-budget',note:'A practical sequence from a goal and spending records to a monthly review.'},
 golden:{label:'Golden 1: budgeting for beginners and young adults',href:'https://www.golden1.com/blog/a-guide-to-budgeting-for-beginners-and-young-adults',note:'A beginner guide covering net income, expenses, savings and budgeting methods.'},
 unfcu:{label:'UNFCU: the 50/30/20 rule',href:'https://www.unfcu.org/financial-wellness/50-30-20-rule/',note:'An alternative explanation. Check how payroll deductions are counted before comparing percentages.'},
 khan:{label:'Khan Academy: what is a budget?',href:'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:budgeting-and-saving/xa6995ea67a8e9fdd:budgeting/a/what-is-a-budget',note:'An additional introductory learning resource.'},
}
export function academyReferences(id){
 if(id==='fifty-thirty-twenty')return [sources.unfcu,sources.fidelity]
 if(id==='zero-based-budgeting')return [sources.fidelity,sources.golden]
 if(id==='irregular-income-budget')return [sources.fidelity,sources.mit]
 if(id==='where-you-stand')return [sources.mit,sources.khan]
 if(id==='fixed-variable-discretionary')return [sources.golden,sources.mit]
 return []
}
