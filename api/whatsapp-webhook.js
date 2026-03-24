// api/whatsapp-webhook.js
// Webhook de Twilio — recibe mensajes de WhatsApp, usa Groq para interpretarlos
// y guarda el repuesto en Supabase.

import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // necesitás agregar esto a Vercel
)

const groq = new Groq({ apiKey: process.env.VITE_GROQ_KEY })

// ─── PARSEO CON IA ────────────────────────────────────────────────────────────
async function parsearMensaje(mensaje) {
  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Sos un asistente que extrae información de pedidos de repuestos de maquinaria agrícola. 
Cuando recibas un mensaje, extraé:
- maquina: el nombre de la máquina (si no se menciona, usá "Sin especificar")
- descripcion: qué repuesto o pieza necesitan (lo más detallado posible)
- cantidad: cuántas unidades (si no se menciona, usá 1)
Respondé ÚNICAMENTE con JSON válido, sin texto extra, sin markdown.
Ejemplo: {"maquina":"Cosechadora 150","descripcion":"Filtro de aceite Donaldson","cantidad":2}`
        },
        { role: "user", content: mensaje }
      ],
      max_tokens: 150,
      temperature: 0.1,
    })
    const texto = resp.choices[0]?.message?.content?.trim()
    return JSON.parse(texto)
  } catch (err) {
    console.error("Error Groq parsing:", err)
    // Fallback: devolver el mensaje completo como descripción
    return { maquina: "Sin especificar", descripcion: mensaje, cantidad: 1 }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed")

  const { Body, From } = req.body
  if (!Body || !From) return res.status(400).send("Faltan datos")

  const telefono = From.replace("whatsapp:", "").replace(/^\+/, "")
  const mensaje  = Body.trim()

  // 1. Verificar que el empleado está autorizado
  const { data: empleado, error: empError } = await supabase
    .from("empleados")
    .select("user_id, nombre")
    .eq("telefono", telefono)
    .eq("activo", true)
    .maybeSingle()

  if (empError || !empleado) {
    console.error("Empleado no autorizado:", telefono)
    res.setHeader("Content-Type", "text/plain")
    return res.status(200).send("❌ Tu número no está autorizado. Contactá al administrador.")
  }

  // 2. Parsear el mensaje con IA
  const parsed = await parsearMensaje(mensaje)
  const hoy    = new Date().toISOString().split("T")[0]

  // 3. Guardar el repuesto
  const { data: repuesto, error: insertError } = await supabase
    .from("repuestos")
    .insert({
      user_id:       empleado.user_id,
      maquina_nombre:parsed.maquina || "Sin especificar",
      descripcion:   parsed.descripcion || mensaje,
      cantidad:      parsed.cantidad || 1,
      costo_estimado:0,
      costo_real:    0,
      comprado:      false,
      fecha_pedido:  hoy,
      origen:        "whatsapp",
      pedido_por:    empleado.nombre,
      notas:         `Mensaje original: "${mensaje}"`,
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error guardando repuesto:", insertError)
    res.setHeader("Content-Type", "text/plain")
    return res.status(200).send("❌ No se pudo registrar el pedido. Intentá de nuevo.")
  }

  // 4. Notificar al encargado de compras
  const { data: notificador } = await supabase
    .from("empleados")
    .select("telefono, nombre")
    .eq("user_id", empleado.user_id)
    .eq("recibe_notificaciones", true)
    .maybeSingle()

  if (notificador?.telefono) {
    try {
      await fetch(`${process.env.VERCEL_URL || "https://rinde-mas-fawn.vercel.app"}/api/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: notificador.telefono,
          repuesto: {
            maquina:      repuesto.maquina_nombre,
            descripcion:  repuesto.descripcion,
            cantidad:     repuesto.cantidad,
            pedidoPor:    empleado.nombre,
          }
        })
      })
    } catch (err) {
      console.error("Error notificando:", err)
    }
  }

  // 5. Responder al empleado confirmando el pedido
  const respuesta = `✅ Pedido registrado en RindeMás:\n\n🔧 ${parsed.descripcion}\n🚜 Máquina: ${parsed.maquina}\n📦 Cantidad: ${parsed.cantidad}\n\n${notificador ? `📱 Se notificó a ${notificador.nombre}.` : "El administrador verá el pedido en la app."}`

  res.setHeader("Content-Type", "text/plain")
  res.status(200).send(respuesta)
}
