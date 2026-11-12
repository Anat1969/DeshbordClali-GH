// סימן האפליקציה: לוח שנה עם ניצוץ. נקודת הכניסה הקבועה חזרה לדף הבית
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#1A2B4A" />
      <rect x="7" y="9" width="18" height="16" rx="2.5" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M7 14h18" stroke="#fff" strokeWidth="2" />
      <path d="M16 15.8l1.3 2.9 2.9 1.3-2.9 1.3L16 24.2l-1.3-2.9-2.9-1.3 2.9-1.3z" fill="#fff" />
    </svg>
  )
}
