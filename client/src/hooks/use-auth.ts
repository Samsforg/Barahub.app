import { useState, useEffect } from 'react'

// ---------- ZAVU SDK ----------
// Key de production Zauv
const zavu = new (await import('@zavudev/sdk')).Zavudev({
  apiKey: 'zv_live_e1f584565c210e43312cdbcd59e5fa3bc8591d22092705a7'
})

// Helper : normalise un numéro CI (accepte +225, 00225, 07...)
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.\-\(\)]/g, '')
  if (p.startsWith('+')) return p
  p = p.replace(/^00/, '')
  if (p.startsWith('225')) p = '+' + p
  else if (p.startsWith('0')) p = '+225' + p.slice(1)
  else p = '+225' + p
  return p
}

/**
 * Envoie un code OTP via WhatsApp (premier essai) avec fallback SMS
 */
export async function sendOTP(phone: string) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  await zavu.messages.send({
    to: phone,
    channel: 'auto',              // WhatsApp d'abord, SMS si échec
    fallbackEnabled: true,
    content: {
      templateId: 'otp_verification', // Nom du template créé dans dashboard Zavu
      templateVariables: { '1': otpCode }
    }
  })
}

/**
 * Vérifie un code OTP saisi par l'utilisateur
 */
export async function verifyOTP(phone: string, userCode: string) {
  const res = await zavu.messages.verify({
    to: phone,
    code: userCode,
    templateId: 'otp_verification' // Doit correspondre au template créé dans dashboard Zavu
  })
  return { success: res.success, data: res }
}

// ---------- Anciennes fonctions (gardées pour compatibilité) ----------
export async function signIn(_: string, __: string) {
  return Promise.resolve({ user: null })
}
export async function signUp(_: string, __: string, ___: string) {
  return Promise.resolve({ user: null })
}
export async function signOut() {}

// ---------- Hook d'authentification Zauv ----------
export function useAuth() {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [, navigate] = useLocation()

  // ---------- Étape 1 : Envoyer le code ----------
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendOTP(normalizePhone(phone))
      setStep('code')
      setOtpSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code")
    } finally {
      setLoading(false)
    }
  }

  // ---------- Étape 2 : Vérifier le code ----------
  async function handleVerify(e: React.FormEvent) {
    e.preventPending()
    setError('')
    setLoading(true)
    try {
      const result = await verifyOTP(normalizePhone(phone), code.replace(/\D/g, ''))
      if (result.success) {
        navigate('/')
      } else {
        setError('Code invalide ou expiré')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de vérification')
    } finally {
      setLoading(false)
    }
  }

  // ---------- Réinitialisation ----------
  function resetForm() {
    setStep('phone')
    setPhone('')
    setCode('')
    setError('')
    setOtpSent(false)
  }

  return {
    step,
    phone,
    code,
    error,
    loading,
    otpSent,
    setStep,
    setPhone,
    setCode,
    setError,
    resetForm,
    navigate
  }
}
