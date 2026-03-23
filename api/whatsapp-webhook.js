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

  // 🔁 Asigna tu user_id fijo (reemplazá por el UUID que copiaste)
  const userId = 'f8b6eb81-29a0-4763-800c-53806562d806'

  // Parseo simple: busca palabras clave
  let maquina = ''
  let descripcion = mensaje
  let cantidad = 1

  const maquinaMatch = mensaje.match(/maquina[: ]+([^\n]+)/i)
  if (maquinaMatch) maquina = maquinaMatch[1].trim()

  const descMatch = mensaje.match(/descripcion[: ]+([^\n]+)/i)
  if (descMatch) descripcion = descMatch[1].trim()

  const cantMatch = mensaje.match(/cantidad[: ]+(\d+)/i)
  if (cantMatch) cantidad = parseInt(cantMatch[1], 10)

  // Insertar en Supabase
  const { error: insertError } = await supabase
    .from('repuestos')
    .insert({
      user_id: userId,
      maquina_nombre: maquina || 'Sin especificar',
      fecha: new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }),
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

  // Respuesta de confirmación
  res.setHeader('Content-Type', 'text/plain')
  res.status(200).send(`✅ Pedido registrado:\nMáquina: ${maquina || 'Sin especificar'}\nDescripción: ${descripcion}\nCantidad: ${cantidad}`)
}