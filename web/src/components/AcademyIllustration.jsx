import {illustrationText} from '../lib/academy-illustration-data.mjs'
export function illustrationFor(lesson) {
 return {src:`/academy/illustrations/${lesson.sourceSlug || lesson.slug}.svg`,alt:illustrationText(lesson),title:`${lesson.title} — visual explanation`}
}
export default function AcademyIllustration({lesson}) {
 const image=illustrationFor(lesson)
 return <figure className="ac-illustration" style={{margin:'0 auto 20px',maxWidth:640}}>
  <img src={image.src} alt={image.alt} title={image.title} width={800} height={560} loading="lazy" decoding="async" style={{width:'100%',height:'auto',display:'block'}} />
  <figcaption style={{fontSize:14,color:'#475569',lineHeight:1.5,marginTop:10}}>{illustrationText(lesson)}</figcaption>
 </figure>
}
