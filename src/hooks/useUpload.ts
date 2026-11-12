import { useState } from 'react'
import type { EventDraft } from '../types'
import { emptyDraft } from '../types'
import { extractEvent } from '../lib/claude'
import { uploadSource } from '../lib/store'

export type UploadStage = 'idle' | 'working' | 'review' | 'error'

// זרימת ההעלאה: קובץ או טקסט, אחסון, חילוץ, ואז טיוטה לאישור
export function useUpload() {
  const [stage, setStage] = useState<UploadStage>('idle')
  const [step, setStep] = useState('')
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (input: { file?: File; text?: string }) => {
    setStage('working')
    setError(null)
    try {
      setStep(input.file ? 'מעלה ומחלץ פרטים מהקובץ' : 'מחלץ פרטים מהטקסט')
      // העלאה וחילוץ רצים במקביל. כשל באחסון לא עוצר את החילוץ
      const [extracted, stored] = await Promise.all([
        extractEvent(input),
        input.file ? uploadSource(input.file).catch(() => null) : Promise.resolve(null),
      ])
      setDraft({ ...extracted, source_file_url: stored?.path ?? null, source_file_name: stored?.name ?? input.file?.name ?? null })
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'משהו השתבש')
      setStage('error')
    }
  }

  const manual = () => {
    setDraft(emptyDraft())
    setStage('review')
  }

  const reset = () => {
    setStage('idle')
    setDraft(null)
    setError(null)
  }

  return { stage, step, draft, error, fromFile: (file: File) => run({ file }), fromText: (text: string) => run({ text }), manual, reset }
}
