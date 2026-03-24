import Groq from "groq-sdk"

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_KEY || "",
  dangerouslyAllowBrowser: true,
})

const SISTEMA = `Sos un asesor agrícola experto en Argentina, especializado en contratistas rurales de la zona pampeana. 
Conocés muy bien los costos operativos, precios de cereales, agroquímicos, combustible y rentabilidad agrícola.
Respondé siempre en español rioplatense, de forma concisa y práctica.
Cuando el usuario comparte datos de su operación, analizalos y dá recomendaciones concretas.
Usá números y porcentajes cuando sea relevante. Sé directo y útil.`

export async function chatIA(mensajes) {
  try {
    const resp = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SISTEMA },
        ...mensajes
      ],
      max_tokens: 500,
      temperature: 0.7,
    })
    return resp.choices[0]?.message?.content || "No pude generar una respuesta."
  } catch (error) {
    console.error("Groq error:", error)
    if (error.message?.includes("API key")) return "⚠️ Error de configuración de IA. Verificá la API key."
    if (error.message?.includes("rate limit")) return "⚠️ Límite de requests alcanzado. Esperá unos segundos y volvé a intentar."
    return "⚠️ No se pudo conectar con la IA. Verificá tu conexión a internet."
  }
}

export function construirContexto(datos) {
  const { trabajos=[], lotes=[], maquinas=[], cargas=[] } = datos
  const totalHa     = trabajos.reduce((s,t)=>s+(t.ha||0),0)
  const totalLitros = trabajos.reduce((s,t)=>s+(t.litros||0),0)
  const totalCosto  = trabajos.reduce((s,t)=>s+((t.litros||0)*(t.precioGasoil||0))+(t.gastoExtra||0),0)
  const promPorHa   = totalHa>0 ? totalCosto/totalHa : 0
  const lotesCosechados = lotes.filter(l=>l.cosecha?.rinde && l.cosecha?.precioCereal)
  const cultivos = [...new Set(trabajos.map(t=>t.cultivo).filter(Boolean))].join(", ")

  return `
DATOS DE LA OPERACIÓN:
- Hectáreas totales trabajadas: ${totalHa.toLocaleString()} ha
- Gasoil total consumido: ${totalLitros.toLocaleString()} L
- Costo operativo total: $${Math.round(totalCosto).toLocaleString("es-AR")}
- Costo promedio por hectárea: $${Math.round(promPorHa).toLocaleString("es-AR")}/ha
- Consumo promedio: ${totalHa>0?(totalLitros/totalHa).toFixed(2):0} L/ha
- Trabajos registrados: ${trabajos.length}
- Lotes activos: ${lotes.length} (${lotesCosechados.length} cosechados)
- Máquinas en flota: ${maquinas.length}
- Cultivos principales: ${cultivos || "no especificado"}
${lotesCosechados.map(l=>{
  const ingPorHa = l.cosecha.rinde * l.cosecha.precioCereal
  const costTrab = trabajos.filter(t=>t.lote===l.nombre).reduce((s,t)=>s+((t.litros||0)*(t.precioGasoil||0))+(t.gastoExtra||0),0)
  const cPorHa   = (l.ha||0)>0 ? costTrab/l.ha : 0
  const ganPorHa = ingPorHa - cPorHa
  return `- Lote "${l.nombre}" (${l.cultivo}): rinde ${l.cosecha.rinde} kg/ha, precio $${l.cosecha.precioCereal}/kg, ganancia ${ganPorHa>=0?"+":""}$${Math.round(ganPorHa).toLocaleString("es-AR")}/ha`
}).join("\n")}
`.trim()
}
