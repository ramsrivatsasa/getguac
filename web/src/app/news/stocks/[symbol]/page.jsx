import FinanceHub from '../../../../components/FinanceHub'
import { symbolFromPath } from '../../../../lib/market-data.mjs'
import { createClient } from '../../../../lib/supabase/server'

export default async function StockPage({ params }) {
  const { symbol } = await params
  const { data: { user } } = await createClient().auth.getUser()
  return <FinanceHub symbol={symbolFromPath(symbol)} publicView={!user}/>
}
