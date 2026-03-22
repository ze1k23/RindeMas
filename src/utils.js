// =============================================================================
// utils.js — funciones y constantes compartidas
// =============================================================================

// ─── FORMATO ─────────────────────────────────────────────────────────────────
export function formatPeso(n) {
  if (!n && n !== 0) return "$0"
  if (isNaN(n)) return "$0"
  return `$${Math.round(n).toLocaleString("es-AR")}`
}

export function formatNum(n, dec = 0) {
  if (!n && n !== 0) return "0"
  if (isNaN(n)) return "0"
  return dec > 0 ? parseFloat(n).toFixed(dec) : Math.round(n).toLocaleString("es-AR")
}

// ─── STORAGE (fallback para config) ──────────────────────────────────────────
export function leerStorage(key, fallback = []) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch { return fallback }
}

export function escribirStorage(key, valor) {
  try { localStorage.setItem(key, JSON.stringify(valor)) } catch {}
}

// ─── CÁLCULOS ─────────────────────────────────────────────────────────────────
export function calcCostoTrabajo(t) {
  return ((t.litros || 0) * (t.precioGasoil || 0)) + (t.gastoExtra || 0)
}

export function calcRentabilidadLoteDB(lote, trabajos = []) {
  const trabajosLote = trabajos.filter(t => t.lote === lote.nombre)
  const combMonto    = trabajosLote.reduce((s, t) => s + calcCostoTrabajo(t), 0)
  const combLitros   = trabajosLote.reduce((s, t) => s + (t.litros || 0), 0)
  const gastosManual = (lote.gastos || []).reduce((s, g) => s + (g.monto || 0), 0)
  const costoTotal   = gastosManual + combMonto
  const costoPorHa   = lote.ha > 0 ? costoTotal / lote.ha : 0
  const comb         = { monto: combMonto, litros: combLitros, trabajos: trabajosLote.length }

  if (!lote.cosecha?.rinde || !lote.cosecha?.precioCereal) {
    return { costoTotal, costoPorHa, comb, sinCosecha: true }
  }

  const ingresoPorHa  = (lote.cosecha.rinde || 0) * (lote.cosecha.precioCereal || 0)
  const ingresoTotal  = ingresoPorHa * (lote.ha || 0)
  const gananciaPorHa = ingresoPorHa - costoPorHa
  const gananciaTotal = gananciaPorHa * (lote.ha || 0)
  const margen        = ingresoPorHa > 0 ? (gananciaPorHa / ingresoPorHa) * 100 : 0

  return {
    costoTotal, costoPorHa, comb, sinCosecha: false,
    ingresoPorHa, ingresoTotal, gananciaPorHa, gananciaTotal, margen,
    rentable: gananciaPorHa >= 0,
  }
}

// ─── MÁQUINAS POR TIPO ────────────────────────────────────────────────────────
export const MAQUINAS_POR_TIPO = {
  "Siembra":       ["Sembradora", "Tractor"],
  "Cosecha":       ["Cosechadora", "Tractor"],
  "Fumigacion":    ["Pulverizador", "Tractor", "Otro"],
  "Fertilizacion": ["Fertilizadora", "Tractor", "Pulverizador", "Otro"],
  "Labranza":      ["Tractor", "Otro"],
  "Transporte":    ["Tractor", "Acoplado", "Otro"],
  "Otro":          null,
}

export function filtrarMaquinas(maquinas, tipoTrabajo) {
  const permitidos = MAQUINAS_POR_TIPO[tipoTrabajo]
  if (!permitidos) return maquinas
  return maquinas.filter(m => permitidos.includes(m.tipo))
}

// ─── GASTOS EXTRA POR TIPO ────────────────────────────────────────────────────
export const GASTOS_POR_TIPO = {
  "Siembra": [
    { id: "semilla_especie",   label: "Especie / Variedad",       tipo: "texto",  placeholder: "ej: DM 4615 RR",  requerido: true  },
    { id: "semilla_kg_ha",     label: "Semilla (kg/ha)",           tipo: "numero", placeholder: "ej: 65",          requerido: true  },
    { id: "semilla_precio_kg", label: "Precio semilla ($/kg)",     tipo: "numero", placeholder: "ej: 2800",        requerido: true  },
    { id: "semilla_trat",      label: "Tratamiento semilla ($/ha)",tipo: "numero", placeholder: "0 si no aplica",  requerido: false },
  ],
  "Fumigacion": [
    { id: "agro_producto",  label: "Producto aplicado",       tipo: "texto",  placeholder: "ej: Glifosato 48%", requerido: true  },
    { id: "agro_dosis",     label: "Dosis (L o kg/ha)",       tipo: "numero", placeholder: "ej: 2.5",           requerido: true  },
    { id: "agro_precio",    label: "Precio unitario ($/L)",   tipo: "numero", placeholder: "ej: 1800",          requerido: true  },
    { id: "agro_producto2", label: "2do producto (opcional)", tipo: "texto",  placeholder: "ej: 2,4-D",         requerido: false },
    { id: "agro_dosis2",    label: "Dosis 2do producto",      tipo: "numero", placeholder: "ej: 0.5",           requerido: false },
    { id: "agro_precio2",   label: "Precio 2do producto",     tipo: "numero", placeholder: "ej: 2200",          requerido: false },
  ],
  "Fertilizacion": [
    { id: "fert_producto",  label: "Fertilizante",            tipo: "texto",  placeholder: "ej: Urea 46%", requerido: true  },
    { id: "fert_dosis",     label: "Dosis (kg/ha)",           tipo: "numero", placeholder: "ej: 150",       requerido: true  },
    { id: "fert_precio",    label: "Precio ($/kg)",           tipo: "numero", placeholder: "ej: 420",       requerido: true  },
    { id: "fert_producto2", label: "2do fertilizante (opc.)", tipo: "texto",  placeholder: "ej: MAP",       requerido: false },
    { id: "fert_dosis2",    label: "Dosis 2do (kg/ha)",       tipo: "numero", placeholder: "ej: 80",        requerido: false },
    { id: "fert_precio2",   label: "Precio 2do ($/kg)",       tipo: "numero", placeholder: "ej: 650",       requerido: false },
  ],
  "Cosecha": [
    { id: "flete_ha",  label: "Flete ($/ha)",         tipo: "numero", placeholder: "0 si no hay flete", requerido: false },
    { id: "secado_pct",label: "% secado / merma",     tipo: "numero", placeholder: "ej: 2",             requerido: false },
  ],
  "Labranza":   [],
  "Transporte": [],
  "Otro":       [],
}

export function calcGastosExtra(tipo, extras) {
  if (!extras) return 0
  const ha = parseFloat(extras._ha) || 0
  let total = 0

  if (tipo === "Siembra") {
    const kgHa  = parseFloat(extras.semilla_kg_ha)    || 0
    const preKg = parseFloat(extras.semilla_precio_kg) || 0
    const trat  = parseFloat(extras.semilla_trat)     || 0
    total = (kgHa * preKg + trat) * ha
  }
  if (tipo === "Fumigacion") {
    const d1 = parseFloat(extras.agro_dosis)    || 0
    const p1 = parseFloat(extras.agro_precio)   || 0
    const d2 = parseFloat(extras.agro_dosis2)   || 0
    const p2 = parseFloat(extras.agro_precio2)  || 0
    total = (d1 * p1 + d2 * p2) * ha
  }
  if (tipo === "Fertilizacion") {
    const d1 = parseFloat(extras.fert_dosis)   || 0
    const p1 = parseFloat(extras.fert_precio)  || 0
    const d2 = parseFloat(extras.fert_dosis2)  || 0
    const p2 = parseFloat(extras.fert_precio2) || 0
    total = (d1 * p1 + d2 * p2) * ha
  }
  if (tipo === "Cosecha") {
    const flete = parseFloat(extras.flete_ha) || 0
    total = flete * ha
  }
  return total
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
export const TIPOS_TRABAJO = ["Siembra","Cosecha","Fumigacion","Fertilizacion","Labranza","Transporte","Otro"]
export const CULTIVOS      = ["Soja","Maíz","Trigo","Girasol","Cebada","Sorgo","Algodón","Maní","Otro"]
export const ESTADOS_LOTE  = ["En preparación","Sembrado","En crecimiento","Listo para cosechar","Cosechado"]
export const TIPOS_MAQUINA = ["Cosechadora","Tractor","Pulverizador","Sembradora","Fertilizadora","Acoplado","Otro"]

export const CATEGORIAS_GASTO = [
  { id: "semillas",      label: "Semillas",       icon: "🌱" },
  { id: "agroquimicos",  label: "Agroquímicos",    icon: "🧪" },
  { id: "fertilizantes", label: "Fertilizantes",   icon: "💊" },
  { id: "mano_obra",     label: "Mano de obra",    icon: "👷" },
  { id: "flete",         label: "Flete",           icon: "🚛" },
  { id: "reparaciones",  label: "Reparaciones",    icon: "🔧" },
  { id: "otros",         label: "Otros",           icon: "📋" },
]

export function estadoService(horasService, intervalo) {
  const p = Math.min(100, ((horasService || 0) / (intervalo || 1)) * 100)
  if (p >= 100) return { label: "URGENTE", text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25",    pct: p }
  if (p >= 80)  return { label: "PRÓXIMO", text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25",  pct: p }
  return              { label: "OK",       text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", pct: p }
}
