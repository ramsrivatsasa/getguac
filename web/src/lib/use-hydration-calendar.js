'use client'
import {useEffect,useState} from 'react'
import {calendarDate} from './hydration-calendar.mjs'
export function useHydrationCalendar(initialDay) {
 const [today,setToday]=useState(()=>calendarDate(initialDay))
 useEffect(()=>setToday(new Date()),[])
 return today
}
