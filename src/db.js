import { supabase } from "./supabase"

function log(op, err) { console.error(`[DB] ${op}:`, err?.message || err) }

const mapMaquina = m => ({
  id: m.id, nombre: m.nombre, tipo: m.tipo, marca: m.marca,
  modelo: m.modelo, año: m.año,
  horasTotales: m.horas_totales || 0,
  horasService: m.horas_service || 0,
  intervalo: m.intervalo || 250,
  consumo: m.consumo || 0,
  notas: m.notas || "",
})

const mapTrabajo = t => ({
  id: t.id, fecha: t.fecha, maquina: t.maquina, tipo: t.tipo,
  lote: t.lote, cultivo: t.cultivo, ha: t.ha || 0, horas: t.horas || 0,
  litros: t.litros || 0, precioGasoil: t.precio_gasoil || 0,
  gastoExtra: t.gasto_extra || 0,
  rinde: t.rinde || null, precioCereal: t.precio_cereal || null,
  extras: t.extras || {},
})

const mapCombustible = c => ({
  id: c.id, fecha: c.fecha, maquina: c.maquina,
  litros: c.litros || 0, precio: c.precio || 0,
  proveedor: c.proveedor || "", notas: c.notas || "",
})

const mapLote = l => ({
  id: l.id, nombre: l.nombre, productor: l.productor || "",
  cultivo: l.cultivo, ha: l.ha || 0, estado: l.estado,
  campaña: l.campaña || "", cosecha: l.cosecha || null,
  gastos: l.gastos || [],
})

// ─── MÁQUINAS ────────────────────────────────────────────────────────────────
export async function getMaquinas(userId) {
  const { data, error } = await supabase.from("maquinas").select("*").eq("user_id", userId).order("created_at")
  if (error) { log("getMaquinas", error); return [] }
  return data.map(mapMaquina)
}

export async function addMaquina(userId, m) {
  const { data, error } = await supabase.from("maquinas").insert({
    user_id: userId, nombre: m.nombre, tipo: m.tipo, marca: m.marca,
    modelo: m.modelo, año: m.año, horas_totales: m.horasTotales || 0,
    horas_service: m.horasService || 0, intervalo: m.intervalo || 250,
    consumo: m.consumo || 0, notas: m.notas || "",
  }).select().single()
  if (error) { log("addMaquina", error); return null }
  return mapMaquina(data)
}

export async function updateMaquina(m) {
  const { error } = await supabase.from("maquinas").update({
    nombre: m.nombre, tipo: m.tipo, marca: m.marca, modelo: m.modelo,
    año: m.año, horas_totales: m.horasTotales || 0,
    horas_service: m.horasService || 0, intervalo: m.intervalo || 250,
    consumo: m.consumo || 0, notas: m.notas || "",
  }).eq("id", m.id)
  if (error) log("updateMaquina", error)
}

export async function deleteMaquina(id) {
  const { error } = await supabase.from("maquinas").delete().eq("id", id)
  if (error) log("deleteMaquina", error)
}

// ✅ Nueva función: obtener máquina por nombre
export async function getMaquinaPorNombre(userId, nombre) {
  const { data, error } = await supabase
    .from("maquinas")
    .select("*")
    .eq("user_id", userId)
    .eq("nombre", nombre)
    .maybeSingle()
  if (error) { log("getMaquinaPorNombre", error); return null }
  return data ? mapMaquina(data) : null
}

// ─── LOTES ───────────────────────────────────────────────────────────────────
export async function getLotes(userId) {
  const { data, error } = await supabase.from("lotes").select("*").eq("user_id", userId).order("created_at")
  if (error) { log("getLotes", error); return [] }
  return data.map(mapLote)
}

export async function addLote(userId, l) {
  const { data, error } = await supabase.from("lotes").insert({
    user_id: userId, nombre: l.nombre, productor: l.productor || "",
    cultivo: l.cultivo, ha: l.ha, estado: l.estado,
    campaña: l.campaña || "", cosecha: l.cosecha || null, gastos: l.gastos || [],
  }).select().single()
  if (error) { log("addLote", error); return null }
  return mapLote(data)
}

export async function updateLote(l) {
  const { error } = await supabase.from("lotes").update({
    nombre: l.nombre, productor: l.productor || "", cultivo: l.cultivo,
    ha: l.ha, estado: l.estado, campaña: l.campaña || "",
    cosecha: l.cosecha || null, gastos: l.gastos || [],
  }).eq("id", l.id)
  if (error) log("updateLote", error)
}

export async function deleteLote(id) {
  const { error } = await supabase.from("lotes").delete().eq("id", id)
  if (error) log("deleteLote", error)
}

// ─── TRABAJOS ─────────────────────────────────────────────────────────────────
export async function getTrabajos(userId) {
  const { data, error } = await supabase.from("trabajos").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) { log("getTrabajos", error); return [] }
  return data.map(mapTrabajo)
}

export async function addTrabajo(userId, t) {
  const { data, error } = await supabase.from("trabajos").insert({
    user_id: userId, fecha: t.fecha, maquina: t.maquina, tipo: t.tipo,
    lote: t.lote, cultivo: t.cultivo, ha: t.ha || 0, horas: t.horas || 0,
    litros: t.litros || 0, precio_gasoil: t.precioGasoil || 0,
    gasto_extra: t.gastoExtra || 0, rinde: t.rinde || null,
    precio_cereal: t.precioCereal || null, extras: t.extras || {},
  }).select().single()
  if (error) { log("addTrabajo", error); return null }
  return mapTrabajo(data)
}

export async function updateTrabajo(t) {
  const { error } = await supabase.from("trabajos").update({
    fecha: t.fecha, maquina: t.maquina, tipo: t.tipo, lote: t.lote,
    cultivo: t.cultivo, ha: t.ha || 0, horas: t.horas || 0,
    litros: t.litros || 0, precio_gasoil: t.precioGasoil || 0,
    gasto_extra: t.gastoExtra || 0, rinde: t.rinde || null,
    precio_cereal: t.precioCereal || null, extras: t.extras || {},
  }).eq("id", t.id)
  if (error) log("updateTrabajo", error)
}

export async function deleteTrabajo(id) {
  const { error } = await supabase.from("trabajos").delete().eq("id", id)
  if (error) log("deleteTrabajo", error)
}

// ─── COMBUSTIBLE ──────────────────────────────────────────────────────────────
export async function getCombustible(userId) {
  const { data, error } = await supabase.from("combustible").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) { log("getCombustible", error); return [] }
  return data.map(mapCombustible)
}

export async function addCombustible(userId, c) {
  const { data, error } = await supabase.from("combustible").insert({
    user_id: userId, fecha: c.fecha, maquina: c.maquina,
    litros: c.litros || 0, precio: c.precio || 0,
    proveedor: c.proveedor || "", notas: c.notas || "",
  }).select().single()
  if (error) { log("addCombustible", error); return null }
  return mapCombustible(data)
}

export async function updateCombustible(c) {
  const { error } = await supabase.from("combustible").update({
    fecha: c.fecha, maquina: c.maquina, litros: c.litros || 0,
    precio: c.precio || 0, proveedor: c.proveedor || "", notas: c.notas || "",
  }).eq("id", c.id)
  if (error) log("updateCombustible", error)
}

export async function deleteCombustible(id) {
  const { error } = await supabase.from("combustible").delete().eq("id", id)
  if (error) log("deleteCombustible", error)
}
// ─── REPUESTOS ──────────────────────────────────────────────────────────────
const mapRepuesto = r => ({
  id: r.id,
  maquina: r.maquina_nombre,
  fecha: r.fecha,
  descripcion: r.descripcion,
  cantidad: r.cantidad || 1,
  costo: r.costo || 0,
  proveedor: r.proveedor || "",
  notas: r.notas || "",
})

export async function getRepuestos(userId) {
  const { data, error } = await supabase
    .from("repuestos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { log("getRepuestos", error); return [] }
  return data.map(mapRepuesto)
}

export async function addRepuesto(userId, r) {
  const { data, error } = await supabase
    .from("repuestos")
    .insert({
      user_id: userId,
      maquina_nombre: r.maquina,
      fecha: r.fecha,
      descripcion: r.descripcion,
      cantidad: r.cantidad || 1,
      costo: r.costo || 0,
      proveedor: r.proveedor || "",
      notas: r.notas || "",
    })
    .select()
    .single()
  if (error) { log("addRepuesto", error); return null }
  return mapRepuesto(data)
}

export async function updateRepuesto(r) {
  const { error } = await supabase
    .from("repuestos")
    .update({
      maquina_nombre: r.maquina,
      fecha: r.fecha,
      descripcion: r.descripcion,
      cantidad: r.cantidad || 1,
      costo: r.costo || 0,
      proveedor: r.proveedor || "",
      notas: r.notas || "",
    })
    .eq("id", r.id)
  if (error) log("updateRepuesto", error)
}

export async function deleteRepuesto(id) {
  const { error } = await supabase.from("repuestos").delete().eq("id", id)
  if (error) log("deleteRepuesto", error)
}
// ─── EMPLEADOS ──────────────────────────────────────────────────────────────
const mapEmpleado = e => ({
  id: e.id,
  user_id: e.user_id,
  nombre: e.nombre,
  telefono: e.telefono,
  activo: e.activo,
})

export async function getEmpleados(userId) {
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("user_id", userId)
    .order("created_at")
  if (error) { log("getEmpleados", error); return [] }
  return data.map(mapEmpleado)
}

export async function addEmpleado(userId, empleado) {
  const { data, error } = await supabase
    .from("empleados")
    .insert({
      user_id: userId,
      nombre: empleado.nombre,
      telefono: empleado.telefono,
      activo: empleado.activo !== undefined ? empleado.activo : true,
    })
    .select()
    .single()
  if (error) { log("addEmpleado", error); return null }
  return mapEmpleado(data)
}

export async function updateEmpleado(empleado) {
  const { error } = await supabase
    .from("empleados")
    .update({
      nombre: empleado.nombre,
      telefono: empleado.telefono,
      activo: empleado.activo,
    })
    .eq("id", empleado.id)
  if (error) log("updateEmpleado", error)
}

export async function deleteEmpleado(id) {
  const { error } = await supabase.from("empleados").delete().eq("id", id)
  if (error) log("deleteEmpleado", error)
}