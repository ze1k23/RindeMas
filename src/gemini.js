import Groq from "groq-sdk"

const client = new Groq({
  apiKey: "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",
  dangerouslyAllowBrowser: true
})

async function preguntar(prompt) {
  try {
    const resp = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    })
    return resp.choices[0]?.message?.content || null
  } catch (error) {
    console.error("Groq error:", error)
    return null
  }
}

export async function getPrecioCereal(cereal) {
  const nombres = {
    "Soja":    "soja",
    "Maíz":    "maiz",
    "Trigo":   "trigo",
    "Girasol": "girasol",
    "Cebada":  "cebada",
    "Sorgo":   "sorgo",
  }

  const nombre = nombres[cereal]
  if (!nombre) return null

  try {
    const url = `https://corsproxy.io/?https://www.argentina.gob.ar/sites/default/files/precios_agro.json`
    const resp = await fetch(url)
    const data = await resp.json()
    
    // Buscamos el cereal en los datos
    const item = data.find(d => d.producto?.toLowerCase().includes(nombre))
    if (item?.precio) {
      // El precio viene en $/tonelada, convertimos a $/kg
      const precioPorTon = parseFloat(item.precio)
      return Math.round(precioPorTon / 1000)
    }
  } catch (e) {
    console.log("No se pudo obtener precio oficial:", e)
  }

  return null
}
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

Respondé en español con viñetas (•), máximo 120 palabras total.`

  return await preguntar(prompt)
}