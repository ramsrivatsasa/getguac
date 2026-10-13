'use client'
import {useRef,useState} from 'react'
import styles from './Find10Plan.module.css'
export default function AlternativePopup({id,title,label,children}) {
  const popup=useRef(null),trigger=useRef(null)
  const [open,setOpen]=useState(false)
  function toggle(){
    if(open){popup.current.hidePopover();return}
    const box=trigger.current.getBoundingClientRect(),width=Math.min(440,window.innerWidth-24)
    Object.assign(popup.current.style,{width:`${width}px`,left:`${Math.max(12,Math.min(box.right-width,window.innerWidth-width-12))}px`,top:`${Math.max(12,Math.min(box.bottom+6,window.innerHeight-340))}px`,maxHeight:`${Math.min(480,window.innerHeight-24)}px`})
    popup.current.showPopover()
    const height=popup.current.getBoundingClientRect().height
    popup.current.style.top=`${Math.max(12,Math.min(box.bottom+6,window.innerHeight-height-12))}px`
    popup.current.querySelector('button,input,a,select')?.focus()
  }
  return <><button ref={trigger} type="button" className={styles.offerTrigger} aria-expanded={open} aria-controls={id} onClick={toggle}>{label} ▾</button><div ref={popup} id={id} popover="auto" role="dialog" aria-label={`Alternatives for ${title}`} className={styles.offerPopup} onToggle={e=>setOpen(e.newState==='open')}><div className={styles.offerPopupHeader}><strong>Alternatives</strong><button type="button" aria-label="Close alternatives" onClick={()=>{popup.current.hidePopover();trigger.current.focus()}}>×</button></div>{children}</div></>
}
