"use client"
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '../../../../lib/supabase/client'
import {registrationRegion} from '../../../../lib/registration-region.mjs'
export default function CompleteRegistration(){
 const router=useRouter(),[error,setError]=useState('')
 async function finish(){
  setError('')
  try{
   const raw=sessionStorage.getItem('registration-region')
   if(!raw){router.replace('/dashboard');return}
   const region=registrationRegion(JSON.parse(raw),{required:true})
   const sb=createClient(),{data:{user},error:authError}=await sb.auth.getUser()
   if(authError||!user)throw Error('Sign in again to finish your account setup.')
   // Returning Google users keep their existing confirmed preferences.
   if(!user.user_metadata?.region_confirmed){const {error}=await sb.auth.updateUser({data:region});if(error)throw error}
   sessionStorage.removeItem('registration-region');router.replace('/dashboard')
  }catch(e){setError(e.message||'Could not save your preferences.')}
 }
 useEffect(()=>{finish()},[])
 return <main className="mx-auto max-w-md p-6"><h1 className="text-2xl font-bold">Finishing your account</h1>{error?<><p role="alert" className="my-4 text-sm">{error}</p><button className="btn-primary" onClick={finish}>Try again</button></>:<p role="status" className="mt-3">Saving your country and currency…</p>}</main>
}
