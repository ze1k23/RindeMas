// api/whatsapp-webhook.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ¡usa la service role key para evitar RLS!
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  // Twilio envía los datos en formato application/x-www-form-urlencoded
  const { Body, From, WaId } = req.body  // Body = mensaje, From = número del remitente (con código)

  const telefono = From.replace('whatsapp:', '')  // ej: "+5491123456789"

  // Buscar a qué usuario pertenece este número en la tabla empleados
 // Temporal: usa tu user_id fijo para pruebas
const userId = 'f8b6eb81-29a0-4763-800c-53806562d806' // pega el UUID que copiaste



  // Intentar parsear el mensaje con un formato simple
  // Ejemplo esperado: "repuesto maquina: cosechadora descripcion: filtro aceite cantidad: 2"
  // Podés usar regex o split. Por simplicidad, buscamos palabras clave:
  let maquina = ''
  let descripcion = ''
  let cantidad = 1
  let costo = 0

  const maquinaMatch = mensaje.match(/maquina[: ]+([^\n]+)/i)
  if (maquinaMatch) maquina = maquinaMatch[1].trim()

  const descMatch = mensaje.match(/descripcion[: ]+([^\n]+)/i)
  if (descMatch) descripcion = descMatch[1].trim()

  const cantMatch = mensaje.match(/cantidad[: ]+(\d+)/i)
  if (cantMatch) cantidad = parseInt(cantMatch[1], 10)

  // Si no se detecta formato estructurado, tomamos todo el mensaje como descripción
  if (!descripcion) {
    descripcion = Body.trim()
  }

  // Registrar repuesto en la tabla repuestos
  const { error: insertError } = await supabase
    .from('repuestos')
    .insert({
      user_id: userId,
      maquina_nombre: maquina || 'Sin especificar',
      fecha: new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }),
      descripcion: descripcion,
      cantidad: cantidad,
      costo: 0,   // precio pendiente, el dueño lo completará luego
      proveedor: 'WhatsApp',
      notas: `Pedido por ${empleado.nombre} (${telefono})`
    })

  if (insertError) {
    console.error('Error al insertar repuesto:', insertError)
    return res.status(200).send('❌ Error al guardar el pedido. Contactá al administrador.')
  }

  // Respuesta de confirmación al remitente
  const respuesta = `✅ Pedido registrado:\nMáquina: ${maquina || 'Sin especificar'}\nDescripción: ${descripcion}\nCantidad: ${cantidad}\n\nEl dueño revisará el costo y proveedor.`

  res.setHeader('Content-Type', 'text/plain')
  res.status(200).send(respuesta)
}