"use client"
import {useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '../../../../lib/supabase/client'
import {registrationRegion} from '../../../../lib/registration-region.mjs'
import {finishGoogleSignup,pendingGoogleSignup} from '../../../../lib/google-ads-browser.mjs'
import {safeAuthNext} from '../../../../lib/auth-next.mjs'
export default function CompleteRegistration(){
 const router=useRouter(),[error,setError]=useState('')
 const started=useRef(false)
 async function finish(){
  setError('')
  try{
   const hadAdsSignup=Boolean(pendingGoogleSignup())
   await finishGoogleSignup()
   const next=safeAuthNext(new URL(window.location.href).searchParams.get('next'))
   const leave=()=>hadAdsSignup?window.location.replace(next):router.replace('/dashboard')
   const raw=sessionStorage.getItem('registration-region')
   if(!raw){leave();return}
   const region=registrationRegion(JSON.parse(raw),{required:true})
   const sb=createClient(),{data:{user},error:authError}=await sb.auth.getUser()
   if(authError||!user)throw Error('Sign in again to finish your account setup.')
   // Returning Google users keep their existing confirmed preferences.
   if(!user.user_metadata?.region_confirmed){const {error}=await sb.auth.updateUser({data:region});if(error)throw error}
   sessionStorage.removeItem('registration-region');leave()
  }catch(e){setError(e.message||'Could not save your preferences.')}
 }
 useEffect(()=>{if(started.current)return;started.current=true;finish()},[])
 return <main className="mx-auto max-w-md p-6"><h1 className="text-2xl font-bold">Finishing your account</h1>{error?<><p role="alert" className="my-4 text-sm">{error}</p><button className="btn-primary" onClick={finish}>Try again</button></>:<p role="status" className="mt-3">Saving your country and currency…</p>}</main>
}
