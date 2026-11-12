// אירוע כפי שהוא נשמר בטבלת events
export interface CalEvent {
  id: string
  user_id: string | null
  title: string
  event_date: string // YYYY-MM-DD
  event_time: string | null // HH:MM
  location: string | null
  people: string[]
  description: string | null
  raw_source: string | null
  source_file_url: string | null // נתיב ב-Storage
  source_file_name: string | null
  category: string | null // מפתח צבע: red, orange, yellow, green, blue, indigo, violet
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

// טיוטה: מה שחולץ מהמסמך, לפני אישור
export interface EventDraft {
  title: string
  event_date: string | null
  event_time: string | null
  location: string | null
  people: string[]
  description: string | null
  raw_source: string | null
  source_file_url: string | null
  source_file_name: string | null
  category: string | null
}

export const emptyDraft = (): EventDraft => ({
  title: '',
  event_date: null,
  event_time: null,
  location: null,
  people: [],
  description: null,
  raw_source: null,
  source_file_url: null,
  source_file_name: null,
  category: null,
})

export interface Profile {
  whatsapp_number: string
}

// משימה ברשימה הצדדית
export interface Task {
  id: string
  text: string
  note: string | null
  done: boolean
  done_at: string | null
  created_at: string
}
