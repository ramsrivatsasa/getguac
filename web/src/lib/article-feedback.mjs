export function sameFeedbackOrigin(request) {
 const origin=request.headers.get('origin')
 if(!origin)return true
 try {const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol)&&parsed.host===request.headers.get('host')}catch{return false}
}
export function feedbackInput(body) {
 if(body?.action==='react' && [-1,0,1].includes(body.reaction)) return {action:'react',reaction:body.reaction}
 if(body?.action!=='comment') return {error:'Choose a reaction or comment.'}
 const text=typeof body.body==='string'?body.body.trim():''
 const name=typeof body.displayName==='string'?body.displayName.trim():'Reader'
 if(text.length<2||text.length>2000) return {error:'Write a comment between 2 and 2,000 characters.'}
 if(!name||name.length>40||/[<>@]/.test(name))return {error:'Use a public name up to 40 characters, without email or markup.'}
 return {action:'comment',body:text,displayName:name}
}
export function articleFeedbackEnabled() {
 return process.env.NODE_ENV==='development'||process.env.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED==='1'
}
