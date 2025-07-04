import type { Database } from './database-extended.types'

type Album = Database['public']['Tables']['albums']['Row']
type Track = Database['public']['Tables']['tracks']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']


export {}
