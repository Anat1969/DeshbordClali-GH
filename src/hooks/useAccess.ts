// בלי התחברות: הגישה תמיד פתוחה
export function useAccess() {
  return { allowed: true, leave: () => undefined }
}
