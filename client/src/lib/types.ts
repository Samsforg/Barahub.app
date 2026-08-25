export interface Profile {
  id: string
  phone: string | null
  full_name: string
  username: string | null
  avatar_url: string | null
  location: string | null
  is_artisan: boolean
  phone_verified: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
  description: string | null
}

export interface Artisan {
  id: number
  user_id: string
  category_id: number | null
  description: string | null
  status: 'online' | 'offline' | 'busy'
  rating: number
  review_count: number
  services: string[]
  specialties: string[]
  work_images: string[]
  hourly_rate: number | null
  commune: string | null
  verified: boolean
  years_experience: number
  created_at: string
  updated_at: string
  profiles?: Profile
  categories?: Category
  reviews?: Review[]
}

export interface Message {
  id: number
  from_user_id: string
  to_user_id: string
  content: string
  read: boolean
  created_at: string
  profiles?: Profile
}

export interface QuoteRequest {
  id: number
  user_id: string
  artisan_id: number
  service_type: string
  description: string
  address: string | null
  budget: number | null
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
}

export interface Review {
  id: number
  user_id: string
  artisan_id: number
  rating: number
  comment: string | null
  created_at: string
  profiles?: Profile
}

export interface UrgentRequest {
  id: number
  user_id: string | null
  problem_type: string
  description: string
  commune: string
  phone: string
  status: 'pending' | 'assigned' | 'resolved'
  created_at: string
}

export interface Notification {
  id: number
  user_id: string
  title: string
  body: string
  type: 'info' | 'quote' | 'message' | 'payment' | 'urgent'
  read: boolean
  data: Record<string, unknown>
  created_at: string
}
