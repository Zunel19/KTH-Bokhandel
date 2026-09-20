import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: courses, error } = await supabase.from('courses').select()

  if (error) {
    return <p>Något gick fel: {error.message}</p>
  }

  return (
    <div>
      <h1>Mina kurser</h1>
      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            {course.code} — {course.name}
          </li>
        ))}
      </ul>
    </div>
  )
}