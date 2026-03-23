// api/whatsapp-webhook.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { Body, From } = req.body
  const telefono = From.replace('whatsapp:', '')
  const mensaje = Body.trim()

  // 🔁 Reemplazá con tu UUID real de Supabase
  const userId = 'f8b6eb81-29a0-4763-800c-53806562d806'

  // Parseo básico
  let maquina = ''
  let descripcion = mensaje
  let cantidad = 1

  const maquinaMatch = mensaje.match(/maquina[: ]+([^\n]+)/i)
  if (maquinaMatch) maquina = maquinaMatch[1].trim()

  const descMatch = mensaje.match(/descripcion[: ]+([^\n]+)/i)
  if (descMatch) descripcion = descMatch[1].trim()

  const cantMatch = mensaje.match(/cantidad[: ]+(\d+)/i)
  if (cantMatch) cantidad = parseInt(cantMatch[1], 10)

  // ✅ Fecha en formato YYYY-MM-DD
  const hoy = new Date()
  const fechaISO = hoy.toISOString().split('T')[0] // "2026-03-23"

  const { error: insertError } = await supabase
    .from('repuestos')
    .insert({
      user_id: userId,
      maquina_nombre: maquina || 'Sin especificar',
      fecha: fechaISO,
      descripcion: descripcion,
      cantidad: cantidad,
      costo: 0,
      proveedor: 'WhatsApp',
      notas: `Pedido desde ${telefono}`
    })

  if (insertError) {
    console.error('Error al insertar:', insertError)
    return res.status(200).send('❌ Error al guardar el pedido.')
  }

  res.setHeader('Content-Type', 'text/plain')
  res.status(200).send(`✅ Pedido registrado:\nMáquina: ${maquina || 'Sin especificar'}\nDescripción: ${descripcion}\nCantidad: ${cantidad}`)
}