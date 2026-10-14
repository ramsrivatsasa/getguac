export function trackSiteEvent(event,path=typeof window==='undefined'?'':window.location.pathname) {
  if(typeof window==='undefined'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return
  let referrer=''
  try {referrer=new URL(document.referrer).origin}catch{}
  const body=JSON.stringify({path,event,referrer})
  try {if(navigator.sendBeacon?.('/api/visit',new Blob([body],{type:'application/json'})))return}catch{}
  fetch('/api/visit',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{})
}
