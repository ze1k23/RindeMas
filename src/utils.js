// utils.js — funciones y constantes compartidas

export function formatPeso(n) {
  if (n === null || n === undefined || isNaN(n)) return "$0"
  return `$${Math.round(n).toLocaleString("es-AR")}`
}

export function formatNum(n, dec = 0) {
  if (n === null || n === undefined || isNaN(n)) return "0"
  return dec > 0 ? parseFloat(n).toFixed(dec) : Math.round(n).toLocaleString("es-AR")
}

export function calcCostoTrabajo(t) {
  return ((t.litros||0) * (t.precioGasoil||0)) + (t.gastoExtra||0)
}

export function calcRentabilidadLote(lote, trabajos = []) {
  const tLote      = trabajos.filter(t => t.lote === lote.nombre)
  const combMonto  = tLote.reduce((s, t) => s + calcCostoTrabajo(t), 0)
  const combLitros = tLote.reduce((s, t) => s + (t.litros||0), 0)
  const gastosOp   = (lote.gastos||[]).reduce((s, g) => s + (g.monto||0), 0)
  const costoTotal = gastosOp + combMonto
  const costoPorHa = (lote.ha||0) > 0 ? costoTotal / lote.ha : 0
  const comb       = { monto:combMonto, litros:combLitros, trabajos:tLote.length }

  if (!lote.cosecha?.rinde || !lote.cosecha?.precioCereal) {
    return { costoTotal, costoPorHa, comb, sinCosecha:true }
  }
  const ingPorHa  = lote.cosecha.rinde * lote.cosecha.precioCereal
  const ganPorHa  = ingPorHa - costoPorHa
  const ganTotal  = ganPorHa * (lote.ha||0)
  const margen    = ingPorHa > 0 ? (ganPorHa / ingPorHa) * 100 : 0

  return { costoTotal, costoPorHa, comb, sinCosecha:false,
           ingresoPorHa:ingPorHa, ingresoTotal:ingPorHa*(lote.ha||0),
           gananciaPorHa:ganPorHa, gananciaTotal:ganTotal, margen, rentable:ganPorHa>=0 }
}

export function estadoService(horasService, intervalo) {
  const p = Math.min(100, ((horasService||0) / (intervalo||1)) * 100)
  if (p >= 100) return { label:"URGENTE", color:"red",    pct:p }
  if (p >= 80)  return { label:"PRÓXIMO", color:"amber",  pct:p }
  return              { label:"OK",       color:"emerald", pct:p }
}

export const MAQUINAS_POR_TIPO = {
  "Siembra":       ["Sembradora","Tractor"],
  "Cosecha":       ["Cosechadora","Tractor"],
  "Fumigacion":    ["Pulverizador","Tractor","Otro"],
  "Fertilizacion": ["Fertilizadora","Tractor","Pulverizador","Otro"],
  "Labranza":      ["Tractor","Otro"],
  "Transporte":    ["Tractor","Acoplado","Otro"],
  "Otro":          null,
}

export function filtrarMaquinas(maquinas, tipo) {
  const p = MAQUINAS_POR_TIPO[tipo]
  if (!p) return maquinas
  return maquinas.filter(m => p.includes(m.tipo))
}

export const GASTOS_POR_TIPO = {
  "Siembra": [
    { id:"semilla_especie",   label:"Especie / Variedad",        tipo:"texto",  placeholder:"ej: DM 4615 RR",   req:true  },
    { id:"semilla_kg_ha",     label:"Semilla (kg/ha)",            tipo:"numero", placeholder:"ej: 65",           req:true  },
    { id:"semilla_precio_kg", label:"Precio semilla ($/kg)",      tipo:"numero", placeholder:"ej: 2800",         req:true  },
    { id:"semilla_trat",      label:"Tratamiento semilla ($/ha)", tipo:"numero", placeholder:"0 si no aplica",   req:false },
  ],
  "Fumigacion": [
    { id:"agro_producto",  label:"Producto aplicado",        tipo:"texto",  placeholder:"ej: Glifosato 48%", req:true  },
    { id:"agro_dosis",     label:"Dosis (L o kg/ha)",        tipo:"numero", placeholder:"ej: 2.5",           req:true  },
    { id:"agro_precio",    label:"Precio unitario ($/L)",    tipo:"numero", placeholder:"ej: 1800",          req:true  },
    { id:"agro_producto2", label:"2do producto (opcional)",  tipo:"texto",  placeholder:"ej: 2,4-D",         req:false },
    { id:"agro_dosis2",    label:"Dosis 2do producto",       tipo:"numero", placeholder:"ej: 0.5",           req:false },
    { id:"agro_precio2",   label:"Precio 2do producto",      tipo:"numero", placeholder:"ej: 2200",          req:false },
  ],
  "Fertilizacion": [
    { id:"fert_producto",  label:"Fertilizante",             tipo:"texto",  placeholder:"ej: Urea 46%", req:true  },
    { id:"fert_dosis",     label:"Dosis (kg/ha)",            tipo:"numero", placeholder:"ej: 150",       req:true  },
    { id:"fert_precio",    label:"Precio ($/kg)",            tipo:"numero", placeholder:"ej: 420",       req:true  },
    { id:"fert_producto2", label:"2do fertilizante (opc.)",  tipo:"texto",  placeholder:"ej: MAP",       req:false },
    { id:"fert_dosis2",    label:"Dosis 2do (kg/ha)",        tipo:"numero", placeholder:"ej: 80",        req:false },
    { id:"fert_precio2",   label:"Precio 2do ($/kg)",        tipo:"numero", placeholder:"ej: 650",       req:false },
  ],
  "Cosecha": [
    { id:"flete_ha",   label:"Flete ($/ha)",     tipo:"numero", placeholder:"0 si no hay flete", req:false },
    { id:"secado_pct", label:"% secado / merma", tipo:"numero", placeholder:"ej: 2",             req:false },
  ],
  "Labranza":[], "Transporte":[], "Otro":[],
}

export function calcGastosExtra(tipo, extras) {
  if (!extras) return 0
  const ha = parseFloat(extras._ha)||0
  if (tipo==="Siembra") {
    return ((parseFloat(extras.semilla_kg_ha)||0)*(parseFloat(extras.semilla_precio_kg)||0) + (parseFloat(extras.semilla_trat)||0)) * ha
  }
  if (tipo==="Fumigacion") {
    return ((parseFloat(extras.agro_dosis)||0)*(parseFloat(extras.agro_precio)||0) + (parseFloat(extras.agro_dosis2)||0)*(parseFloat(extras.agro_precio2)||0)) * ha
  }
  if (tipo==="Fertilizacion") {
    return ((parseFloat(extras.fert_dosis)||0)*(parseFloat(extras.fert_precio)||0) + (parseFloat(extras.fert_dosis2)||0)*(parseFloat(extras.fert_precio2)||0)) * ha
  }
  if (tipo==="Cosecha") {
    return (parseFloat(extras.flete_ha)||0) * ha
  }
  return 0
}

export const TIPOS_TRABAJO = ["Siembra","Cosecha","Fumigacion","Fertilizacion","Labranza","Transporte","Otro"]
export const CULTIVOS      = ["Soja","Maíz","Trigo","Girasol","Cebada","Sorgo","Algodón","Maní","Otro"]
export const TIPOS_MAQUINA = ["Cosechadora","Tractor","Pulverizador","Sembradora","Fertilizadora","Acoplado","Otro"]
export const CATEGORIAS_GASTO = [
  { id:"semillas",      label:"Semillas",       icon:"🌱" },
  { id:"agroquimicos",  label:"Agroquímicos",    icon:"🧪" },
  { id:"fertilizantes", label:"Fertilizantes",   icon:"💊" },
  { id:"mano_obra",     label:"Mano de obra",    icon:"👷" },
  { id:"flete",         label:"Flete",           icon:"🚛" },
  { id:"reparaciones",  label:"Reparaciones",    icon:"🔧" },
  { id:"otros",         label:"Otros",           icon:"📋" },
]

export function calcEstadoLote(nombreLote, trabajos) {
  const tipos = trabajos.filter(t => t.lote === nombreLote).map(t => t.tipo)
  if (tipos.includes("Cosecha"))                                    return "Cosechado"
  if (tipos.some(t => t==="Fumigacion" || t==="Fertilizacion"))     return "En crecimiento"
  if (tipos.includes("Siembra"))                                    return "Sembrado"
  if (tipos.includes("Labranza"))                                   return "En preparación"
  return null
}
