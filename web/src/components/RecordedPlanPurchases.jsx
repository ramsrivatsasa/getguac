'use client'
import {Fragment,useState} from 'react'
import Link from 'next/link'
import {StoreLogo} from './StoreLogo'
import {money} from '../lib/find-your-10/wizard.mjs'
import styles from './Find10Plan.module.css'
import {recordedExpenses} from '../lib/find-your-10/recorded-expenses.mjs'

function recordedDescription(title) {
  const patterns = [/\d+(?:\.\d+)?\s*["″]?\s*[x×]\s*\d+(?:\.\d+)?\s*["″]?\s*[x×]\s*\d+(?:\.\d+)?/i, /MERV\s*\d+/i, /MPR\s*\d+/i, /\d+\s*-?\s*pack/i]
  const specs = patterns.map(pattern=>title.match(pattern)?.[0]).filter(Boolean)
  return {title:specs.length ? patterns.reduce((value,pattern)=>value.replace(pattern,''),title).replace(/\s+/g,' ').trim() : title,specs}
}

export default function RecordedPlanPurchases({data,excludeKeys=[],limit}) {
  const [expanded,setExpanded]=useState({})
  const records=recordedExpenses(data)
  const groups=records.groups.filter(g=>!excludeKeys.includes(g.key))
  const window=records.window
  if(!groups.length)return null
  const shown=limit?groups.slice(0,limit):groups
  return <section id="recorded-expenses" aria-label="Your recorded expenses" className="mt-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Your recorded expenses</h2><span className="text-sm text-slate-600">{groups.length} recorded expenses{window.historical?` · older receipts through ${window.end}`:''}</span></div>
    <div className={styles.planTableScroll}><table className={`${styles.planRows} ${styles.recordedRows}`}><thead><tr><th scope="col">Store</th><th scope="col">Purchase</th><th scope="col">Recorded price</th><th scope="col">Recorded</th><th scope="col">Receipt</th></tr></thead><tbody>{shown.map(group=>{
      const rows=[...group.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date)),row=rows[0]
      const id=`recorded-${row.id}`
      const description=recordedDescription(group.title)
      return <Fragment key={group.key}><tr>
        <td><span className={styles.purchaseMerchant}><StoreLogo storeName={row.receipts.store_name} size={22} fallbackEmoji=""/><span>{row.receipts.store_name||'Merchant not recorded'}</span></span></td>
        <th scope="row"><button type="button" className="min-h-11 text-left font-semibold text-violet-700" aria-expanded={!!expanded[group.key]} aria-controls={id} onClick={()=>setExpanded(previous=>({...previous,[group.key]:!previous[group.key]}))}>{description.title}</button>{description.specs.length>0&&<div className={styles.specChips}>{description.specs.map(spec=><span key={spec}>{spec}</span>)}</div>}</th>
        <td data-label="Recorded price"><strong>{money(Math.round(Number(row.price)*100/Number(row.qty)))}</strong><span className="block text-sm text-slate-500">{group.receiptTotal?'receipt total':'per unit'}</span></td>
        <td data-label="Recorded">{row.receipts.date}</td>
        <td><div className="flex flex-wrap items-center gap-x-3"><Link className="inline-flex min-h-11 items-center text-violet-700" href={`/receipts/${row.receipt_id}`}>View receipt →</Link><Link className="inline-flex min-h-11 items-center text-violet-700" href={`/validate?receipt=${row.receipt_id}&returnTo=%2Fmy-plan`}>Worth It?</Link></div></td>
      </tr><tr hidden={!expanded[group.key]} className={styles.detailsRow}><td colSpan={5}><div id={id} className="p-3 text-sm text-slate-600"><p className="mb-2">{group.title}</p><p>{group.receiptTotal?'This is the saved receipt total. Add item details in the receipt to compare individual purchases.':'Recorded prices are purchase history.'} Savings are counted only after you choose a supported alternative.</p><ul className="mt-2 space-y-1">{rows.map(r=><li key={r.id}>{r.receipts.date} · {r.receipts.store_name} · {r.qty} × {money(Math.round(Number(r.price)*100/Number(r.qty)))}</li>)}</ul></div></td></tr></Fragment>
    })}</tbody></table></div>
    {limit&&groups.length>shown.length&&<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700" href="/my-plan#recorded-expenses">View all recorded expenses →</Link>}
  </section>
}
