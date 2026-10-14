import FinanceHub from '../../components/FinanceHub'
import { createClient } from '../../lib/supabase/server'

export default async function NewsPage() {
  const { data: { user } } = await createClient().auth.getUser()
  return <FinanceHub publicView={!user}/>
}
