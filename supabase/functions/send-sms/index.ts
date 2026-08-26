// Send SMS Hook — Barahub
// Envoie le code OTP par WhatsApp (prioritaire) avec repli SMS.
// Doc : https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_NUMBER') // ex: +14155238886 (sandbox ou numéro validé)
const smsFrom = Deno.env.get('TWILIO_SMS_NUMBER') // ex: +1415xxxxxx

async function sendMessage(
  messageBody: string,
  toNumber: string,
  useWhatsApp: boolean,
): Promise<any> {
  if (!accountSid || !authToken) {
    throw new Error('Credentials Twilio manquants (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)')
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const encodedCredentials = btoa(`${accountSid}:${authToken}`)

  const body = new URLSearchParams({
    To: useWhatsApp ? `whatsapp:${toNumber}` : toNumber,
    From: useWhatsApp ? `whatsapp:${whatsappFrom}` : smsFrom!,
    Body: messageBody,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedCredentials}`,
    },
    body,
  })

  return response.json()
}

Deno.serve(async (req) => {
  const payload = await req.text()
  const base64Secret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.replace('v1,whsec_', '') ?? ''
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(base64Secret)

  try {
    const { user, sms } = wh.verify(payload, headers)
    const messageBody = `Barahub 🔨\nVotre code de vérification est : ${sms.otp}\nCe code expire dans 5 minutes.`

    // 1) Tentative WhatsApp (moins cher, plus lu en Côte d'Ivoire)
    let response = await sendMessage(messageBody, user.phone, true)

    // 2) Repli SMS si le canal WhatsApp échoue et qu'un numéro SMS est configuré
    if (!['queued', 'accepted'].includes(response.status) && smsFrom) {
      console.log(`WhatsApp KO (${response.code}: ${response.message}), repli SMS`)
      response = await sendMessage(messageBody, user.phone, false)
    }

    if (!['queued', 'accepted'].includes(response.status)) {
      return new Response(
        JSON.stringify({
          error: {
            http_code: response.code ?? 500,
            message: `Échec envoi : ${response.message}`,
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: `Erreur hook SMS : ${String(error)}`,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
