'use client'
import {COUNTRIES,CURRENCIES} from '../lib/registration-region.mjs'
export default function ProfileLocation({value,onChange,disabled,forPlan=false}) {
 const set=key=>e=>onChange(previous=>({...previous,[key]:e.target.value,...(key==='country_code'&&e.target.value==='US'?{preferred_currency:'USD'}:{})}))
 return <fieldset className="space-y-3" disabled={disabled}><legend className="font-bold">{forPlan?'Plan location':'Location (optional)'}</legend><p className="text-sm text-slate-600">{forPlan?'Street address and preferred currency are optional.':'You can add these details later. When creating a plan, we need your postal code, city, state or region, and country to provide the best alternative options. Street address is optional.'}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div><label className="label" htmlFor="profile-country">Country or region</label><select id="profile-country" className="input w-full" autoComplete="country" value={value.country_code||''} onChange={set('country_code')}><option value="">Choose country</option>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}</select></div>
 <div><label className="label" htmlFor="profile-currency">Preferred currency</label><select id="profile-currency" className="input w-full" value={value.preferred_currency||''} onChange={set('preferred_currency')}><option value="">Choose currency</option>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
 {[[ 'address_line1','Street address','address-line1',200,true],['address_line2','Apartment, suite, etc. (optional)','address-line2',200,true],['city','City / locality','address-level2',100],['address_region','State / province / region','address-level1',100],['postal_code','ZIP / postal code','postal-code',20]].map(([key,label,autocomplete,maxLength,wide])=><div key={key} className={wide?'sm:col-span-2':undefined}><label className="label" htmlFor={`profile-${key}`}>{label}</label><input id={`profile-${key}`} className="input" autoComplete={autocomplete} maxLength={maxLength} value={value[key]||''} onChange={set(key)}/></div>)}
 </div></fieldset>
}

