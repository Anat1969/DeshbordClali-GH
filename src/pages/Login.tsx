// כניסה: Google ישיר, בלי טפסים
export default function Login({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-5xl font-light text-navy">יומן <b>חכם</b></h1>
      <p className="max-w-sm text-lg text-mute">זורקים מסמך, והיומן מארגן את הפגישה ושולח תזכורת ביום שלפני.</p>
      <button type="button" className="btn btn-primary min-h-12 min-w-64 text-lg" onClick={onSignIn}>המשך עם Google</button>
    </main>
  )
}
