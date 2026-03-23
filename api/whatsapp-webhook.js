// api/whatsapp-webhook.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { Body, From } = req.body
  const telefono = From.replace('whatsapp:', '').replace(/^\+/, '')

  // Buscar empleado por teléfono
  const { data: empleado, error: empError } = await supabase
    .from('empleados')
    .select('user_id, nombre')
    .eq('telefono', telefono)
    .eq('activo', true)
    .maybeSingle()

  if (empError || !empleado) {
    console.error('Empleado no autorizado', telefono)
    return res.status(200).send('❌ Número no autorizado. Contactá al administrador.')
  }

  const userId = empleado.user_id
  const mensaje = Body.trim()

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

  const hoy = new Date()
  const fechaISO = hoy.toISOString().split('T')[0]

  // Insertar repuesto
  const { data: nuevoRepuesto, error: insertError } = await supabase
    .from('repuestos')
    .insert({
      user_id: userId,
      maquina_nombre: maquina || 'Sin especificar',
      fecha: fechaISO,
      descripcion: descripcion,
      cantidad: cantidad,
      costo: 0,
      proveedor: 'WhatsApp',
      notas: `Pedido por ${empleado.nombre} (${telefono})`
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error al insertar:', insertError)
    return res.status(200).send('❌ Error al guardar el pedido.')
  }

  // Notificar al dueño (opcional)
  const { data: ownerData } = await supabase.auth.admin.getUserById(userId)
  const ownerWhatsapp = ownerData?.user?.user_metadata?.whatsapp
  if (ownerWhatsapp) {
    try {
      await fetch(`${process.env.VERCEL_URL || 'https://rinde-mas-fawn.vercel.app'}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ownerWhatsapp,
          repuesto: {
            maquina: nuevoRepuesto.maquina_nombre,
            descripcion: nuevoRepuesto.descripcion,
            cantidad: nuevoRepuesto.cantidad,
            costo: nuevoRepuesto.costo,
            proveedor: 'WhatsApp'
          }
        })
      })
    } catch (err) {
      console.error('Error notificando al dueño:', err)
    }
  }

  // Respuesta al empleado
  res.setHeader('Content-Type', 'text/plain')
  res.status(200).send(`✅ Pedido registrado:\nMáquina: ${maquina || 'Sin especificar'}\nDescripción: ${descripcion}\nCantidad: ${cantidad}\n\nEl dueño será notificado.`)
}