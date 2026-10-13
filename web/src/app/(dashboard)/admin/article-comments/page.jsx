import {redirect} from 'next/navigation'
import {articleFeedbackEnabled} from '../../../../lib/article-feedback.mjs'
import ArticleCommentsClient from './ArticleCommentsClient'

export default function ArticleCommentsPage(){
 if(!articleFeedbackEnabled())redirect('/admin')
 return <ArticleCommentsClient />
}
