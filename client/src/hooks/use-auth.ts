import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState(s => ({ ...s, user: session.user }))
        loadProfile(session.user.id)
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState(s => ({ ...s, user: session.user }))
        loadProfile(session.user.id)
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setState(s => ({ ...s, profile: data, loading: false }))
  }

  async function signUp(email: string, password: string, fullName: string, phone?: string, isArtisan = false) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone: phone || '', is_artisan: isArtisan },
      },
    })
    if (error) throw error
    return data
  }

  async function signInWithPhone(phone: string, fullName?: string, isArtisan = false) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName || '',
          is_artisan: isArtisan,
          phone,
        },
      },
    })
    if (error) throw error
  }

  async function verifyOtp(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
    if (error) throw error
    return data
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { ...state, signInWithPhone, verifyOtp, signUp, signIn, signOut }
}
