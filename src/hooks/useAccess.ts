import { useEffect, useState } from 'react'
import { clearKey, getKey, setKey } from '../lib/api'
import { demoMode } from '../lib/supabase'

// גישה: מפתח אישי בדפדפן. במצב הדגמה אין צורך במפתח
export function useAccess() {
  const [has, setHas] = useState(demoMode || Boolean(getKey()))

  useEffect(() => {
    const lost = () => setHas(false)
    window.addEventListener('yoman-auth-lost', lost)
    return () => window.removeEventListener('yoman-auth-lost', lost)
  }, [])

  return {
    allowed: demoMode || has,
    enter: (k: string) => (setKey(k.trim()), setHas(true)),
    leave: () => (clearKey(), setHas(false)),
  }
}
