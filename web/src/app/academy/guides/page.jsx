import AcademyLibraryPage from '../AcademyLibraryPage'
import {publicMetadata} from '../../../lib/public-seo.mjs'
export const metadata=publicMetadata('/academy/guides','Practical Money Guides: Budgeting & Consumer Protection','Find step-by-step budgeting and savings guides, beginner money checklists and trusted educational resources. Turn a money question into a practical next step.')
export default function GuidesPage(){return <AcademyLibraryPage section="guides" />}
