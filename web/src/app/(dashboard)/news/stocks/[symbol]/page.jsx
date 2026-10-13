import FinanceHub from '../../../../../components/FinanceHub'
import { symbolFromPath } from '../../../../../lib/market-data.mjs'
export default function StockPage({ params }) { return <FinanceHub symbol={symbolFromPath(params.symbol)}/> }
