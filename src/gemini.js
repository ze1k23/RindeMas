// gemini.js
import Groq from "groq-sdk"

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_KEY,
  dangerouslyAllowBrowser: true
})

async function preguntar(prompt) {
  try {
    const resp = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    })
    return resp.choices[0]?.message?.content || null
  } catch (error) {
    console.error("Groq error:", error)
    return "Lo siento, hubo un error al procesar tu consulta."
  }
}

// Función principal para el chat
export async function sendChatMessage(historial, userData) {
  // Preparamos un resumen de los datos del usuario para contexto
  const contexto = `
Eres un asesor agrícola experto en Argentina. Ayudas a contratistas rurales a mejorar su rentabilidad.

Datos actuales del contratista:
- Máquinas: ${userData.maquinas.length} máquinas registradas.
- Trabajos: ${userData.trabajos.length} trabajos, total de ${userData.trabajos.reduce((s,t)=>s+(t.ha||0),0)} ha.
- Lotes: ${userData.lotes.length} lotes.
- Lista de máquinas (nombre, tipo, horas totales): ${userData.maquinas.map(m => `${m.nombre} (${m.tipo}) - ${m.horasTotales}h`).join(', ')}
- Últimos 5 trabajos: ${userData.trabajos.slice(0,5).map(t => `${t.tipo} en ${t.lote} (${t.ha} ha, costo ${t.litros*t.precioGasoil} gasoil)`).join('; ')}

Respondé en español de manera clara, práctica y útil. Si te preguntan por rentabilidad, analizá los datos que te doy. Si no sabés algo, decilo honestamente. No inventes datos.

Historial de la conversación:
${historial.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}

Ahora respondé al último mensaje del usuario.
  `

  return await preguntar(contexto)
}

// Mantenemos la función anterior por compatibilidad
export async function analizarRentabilidad(datos) {
  const prompt = `Sos un asesor agrícola experto en Argentina. Analizá estos datos operativos de un contratista rural y dá exactamente 3 recomendaciones concretas y accionables para mejorar su rentabilidad. Sé directo y práctico.

DATOS:
- Costo promedio por hectárea: $${Math.round(datos.costoPorHa || 0)}
- Consumo de combustible: ${datos.litrosPorHa?.toFixed(2) || 0} L/ha
- Hectáreas trabajadas: ${datos.totalHa || 0} ha
- Trabajos registrados: ${datos.totalTrabajos || 0}
- Lotes rentables: ${datos.loteRentables || 0} de ${datos.totalLotes || 0}
- Ganancia neta promedio: $${Math.round(datos.gananciaPorHa || 0)}/ha
- Cultivos principales: ${datos.cultivos || "no especificado"}

Respondé en español con viñetas, máximo 120 palabras total.`

  return await preguntar(prompt)
}

// También puedes conservar getPrecioCereal si quieres implementarlo después
export async function getPrecioCereal(cereal) {
  // Implementación pendiente
  return null
}
export async function analizarRepuestos(maquinaNombre, repuestos, maquina, trabajos) {
  if (!repuestos.length) return "No hay repuestos registrados para esta máquina todavía."

  const totalGasto = repuestos.reduce((s, r) => s + (r.costo || 0), 0)
  const repuestosAgrupados = repuestos.reduce((acc, r) => {
    const key = r.descripcion.toLowerCase()
    acc[key] = (acc[key] || 0) + r.cantidad
    return acc
  }, {})
  const repuestosFrecuentes = Object.entries(repuestosAgrupados)
    .sort((a,b) => b[1] - a[1])
    .slice(0,3)
    .map(([desc, cant]) => `${desc} (${cant} veces)`)
    .join(", ")

  const horasTotales = maquina?.horasTotales || 0
  const años = maquina?.año ? new Date().getFullYear() - maquina.año : "desconocido"
  const ultimosTrabajos = trabajos.slice(0,3).map(t => `${t.tipo} en ${t.lote} (${t.ha} ha)`).join("; ")

  const prompt = `
Eres un mecánico agrícola y asesor de maquinaria pesada con experiencia en John Deere, Agrometal, etc.
Analizá los siguientes datos de una máquina y respondé en español de forma clara y práctica:

Máquina: ${maquinaNombre}
- Tipo: ${maquina?.tipo || "desconocido"}
- Año: ${maquina?.año || "desconocido"} (antigüedad ~${años} años)
- Horas totales: ${horasTotales} h

Historial de repuestos (${repuestos.length} registros):
- Gasto total: $${totalGasto.toLocaleString()}
- Repuestos más frecuentes: ${repuestosFrecuentes}

Trabajos recientes con esta máquina:
${ultimosTrabajos || "No hay trabajos registrados"}

Respondé en este formato (sin asteriscos, con viñetas):
- Recomendación: [reparar / cambiar / mantener vigilancia] explicando por qué.
- Posibles causas de fallas: [basado en repuestos frecuentes y tipo de máquina]
- Sugerencias de mantenimiento preventivo.

Usá un tono práctico, máximo 100 palabras.
  `
  return await preguntar(prompt)
}