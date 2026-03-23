// api/send-whatsapp.js
import twilio from 'twilio'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const { to, repuesto } = req.body
  if (!to || !repuesto) return res.status(400).json({ error: 'Faltan datos' })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: 'Falta configuración de Twilio' })
  }

  const client = twilio(accountSid, authToken)

  const message = `🔧 Nuevo repuesto registrado en RindeMás:\n\nMáquina: ${repuesto.maquina}\nDescripción: ${repuesto.descripcion}\nCantidad: ${repuesto.cantidad}\nCosto: $${repuesto.costo}\nProveedor: ${repuesto.proveedor || 'N/A'}\n\nRevisá la app para más detalles.`

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`
    })
    res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}