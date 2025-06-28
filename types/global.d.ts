import type { Database } from './database.types'

type Album = Database['public']['Tables']['albums']['Row']
type Track = Database['public']['Tables']['tracks']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']


export {}
