'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '../lib/supabase/client'
import {registrationRegion} from '../lib/registration-region.mjs'
import {missingPlanLocation,PLAN_LOCATION_MESSAGE} from '../lib/plan-location.mjs'
import ProfileLocation from './ProfileLocation'
import FeatureHeader from './FeatureHeader'
import {planButton} from './Find10Primitives'
export default function PlanLocationGate({metadata}) {
 const [location,setLocation]=useState(metadata),[busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter()
 async function save(event){event.preventDefault();setError('');setBusy(true);try{const region=registrationRegion(location,{optionalFields:true});if(missingPlanLocation(region).length)throw Error('Enter your country, city, state or region, and postal code.');const {error}=await createClient().auth.updateUser({data:region});if(error)throw error;router.refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="max-w-2xl space-y-4"><FeatureHeader title="Complete your plan location" expression="happy"/><p>{PLAN_LOCATION_MESSAGE}</p><form onSubmit={save} className="rounded-2xl border border-violet-100 bg-white p-4 space-y-4"><ProfileLocation forPlan value={location} onChange={setLocation} disabled={busy}/>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className={planButton} disabled={busy}>{busy?'Saving…':'Save and continue to plan'}</button></form></div>
}

