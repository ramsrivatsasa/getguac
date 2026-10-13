// Source calendar dates must behave identically across server time zones.
export function sourceCalendarDate(text) {
  if (!text) return null
  const iso = text.match(/^(20\d{2})-(\d{2})-(\d{2})$/)
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/)
  const normalized = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : us ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : text
  return Date.parse(`${normalized} 00:00:00 UTC`)
}
