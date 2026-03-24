// api/send-whatsapp.js
// Envía notificaciones de WhatsApp via Twilio al encargado de compras

import twilio from 'twilio'

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" })

  const { to, repuesto } = req.body
  if (!to || !repuesto)  return res.status(400).json({ error: "Faltan datos" })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_NUMBER // ej: +14155238886

  if (!accountSid || !authToken || !from) {
    console.error("Falta configuración de Twilio")
    return res.status(500).json({ error: "Configuración de Twilio incompleta" })
  }

  const client = twilio(accountSid, authToken)

  const mensaje = `🔧 *Nuevo pedido de repuesto* — RindeMás\n\n*${repuesto.descripcion}*\n🚜 Máquina: ${repuesto.maquina}\n📦 Cantidad: ${repuesto.cantidad}\n👤 Pedido por: ${repuesto.pedidoPor || "empleado"}\n\nEntrá a la app para gestionarlo.`

  try {
    await client.messages.create({
      body: mensaje,
      from: `whatsapp:${from}`,
      to:   `whatsapp:+${to}`,
    })
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error("Error Twilio:", err)
    return res.status(500).json({ error: err.message })
  }
}
