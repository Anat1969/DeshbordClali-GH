// פיצול טקסט למשפטים: שורה חדשה אחרי כל נקודה, סימן קריאה או סימן שאלה
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean)
}
