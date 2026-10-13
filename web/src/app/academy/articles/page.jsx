import AcademyLibraryPage from '../AcademyLibraryPage'
import {publicMetadata} from '../../../lib/public-seo.mjs'
export const metadata=publicMetadata('/academy/articles','Money Articles: Smart Shopping, Spending & Savings','Read practical articles on spending habits, receipt tracking, subscriptions and refunds. Explore everyday money topics and ways to make more informed shopping decisions.')
export default function ArticlesPage(){return <AcademyLibraryPage section="articles" />}
