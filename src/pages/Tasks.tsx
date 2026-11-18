import Icon from '../components/Icon'
import TaskList from '../components/TaskList'

// מסך משימות: דף בפני עצמו, גדול, בלי היומן. הוספה, סימון בוצע, הערה, מסמכים ומחיקה
export default function Tasks() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-5 flex items-center gap-3 text-3xl font-light"><Icon name="check" size={28} />משימות <b>לביצוע</b></h1>
      <TaskList page />
    </div>
  )
}
