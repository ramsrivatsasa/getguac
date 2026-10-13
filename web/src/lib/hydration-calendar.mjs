export function calendarDayKey(date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function calendarDate(key) {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key||''))
 if(!match)return null
 const [,year,month,day]=match.map(Number)
 const date=new Date(year,month-1,day,12)
 return calendarDayKey(date)===key?date:null
}
