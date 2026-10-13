import AcademyLibraryPage from '../AcademyLibraryPage'
import {publicMetadata} from '../../../lib/public-seo.mjs'
export const metadata=publicMetadata('/academy/lessons','Money Lessons: Budgeting, Savings & Consumer Rights','Explore 100 free money lessons with worked examples, practice questions and clear action steps. Learn budgeting, everyday savings and consumer protection at your own pace.')
export default function LessonsPage(){return <AcademyLibraryPage section="lessons" />}
