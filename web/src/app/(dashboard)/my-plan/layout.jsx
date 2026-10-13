import {createClient} from '../../../lib/supabase/server'
import {missingPlanLocation} from '../../../lib/plan-location.mjs'
import PlanLocationGate from '../../../components/PlanLocationGate'
export default async function PlanLayout({children}) {
 const {data:{user}}=await createClient().auth.getUser()
 if(user&&missingPlanLocation(user.user_metadata).length)return <PlanLocationGate metadata={user.user_metadata||{}}/>
 return children
}
