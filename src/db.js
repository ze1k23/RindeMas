import { supabase }    from "./supabase"
import { guardarLocal, leerLocal, guardarPendiente, isOnline } from "./offlineStorage"

function log(op, err) { console.error(`[DB] ${op}:`, err?.message || err) }

// ─── MAPPERS ─────────────────────────────────────────────────────────────────
const toMaquina = m => ({ id:m.id, nombre:m.nombre, tipo:m.tipo, marca:m.marca, modelo:m.modelo, año:m.año, horasTotales:m.horas_totales||0, horasService:m.horas_service||0, intervalo:m.intervalo||250, consumo:m.consumo||0, notas:m.notas||"" })
const toTrabajo = t => ({ id:t.id, fecha:t.fecha, maquina:t.maquina, tipo:t.tipo, lote:t.lote, cultivo:t.cultivo, ha:t.ha||0, horas:t.horas||0, litros:t.litros||0, precioGasoil:t.precio_gasoil||0, gastoExtra:t.gasto_extra||0, rinde:t.rinde||null, precioCereal:t.precio_cereal||null, extras:t.extras||{} })
const toCarga   = c => ({ id:c.id, fecha:c.fecha, maquina:c.maquina, litros:c.litros||0, precio:c.precio||0, proveedor:c.proveedor||"", notas:c.notas||"" })
const toLote    = l => ({ id:l.id, nombre:l.nombre, productor:l.productor||"", cultivo:l.cultivo, ha:l.ha||0, estado:l.estado, campaña:l.campaña||"", cosecha:l.cosecha||null, gastos:l.gastos||[] })

// ─── HELPER: fetch con fallback offline ──────────────────────────────────────
async function fetchConFallback(queryFn, cacheKey, mapper) {
  if (isOnline()) {
    try {
      const { data, error } = await queryFn()
      if (error) throw error
      const mapped = data.map(mapper)
      await guardarLocal(cacheKey, mapped) // actualizamos cache
      return mapped
    } catch (err) {
      log(`fetch ${cacheKey}`, err)
    }
  }
  // offline o error: usamos cache local
  return await leerLocal(cacheKey)
}

// ─── MÁQUINAS ────────────────────────────────────────────────────────────────
export async function getMaquinas(userId) {
  return fetchConFallback(
    () => supabase.from("maquinas").select("*").eq("user_id",userId).order("created_at"),
    "maquinas", toMaquina
  )
}

export async function addMaquina(userId, m) {
  if (!isOnline()) {
    const tmp = { id:`tmp_${Date.now()}`, ...m }
    await guardarLocal("maquinas", tmp)
    await guardarPendiente({ tipo:"addMaquina", userId, datos:m })
    return tmp
  }
  const { data, error } = await supabase.from("maquinas").insert({ user_id:userId, nombre:m.nombre, tipo:m.tipo, marca:m.marca, modelo:m.modelo, año:m.año, horas_totales:m.horasTotales||0, horas_service:m.horasService||0, intervalo:m.intervalo||250, consumo:m.consumo||0, notas:m.notas||"" }).select().single()
  if (error) { log("addMaquina", error); return null }
  const mapped = toMaquina(data)
  await guardarLocal("maquinas", mapped)
  return mapped
}

export async function updateMaquina(m) {
  if (!isOnline()) {
    await guardarLocal("maquinas", m)
    await guardarPendiente({ tipo:"updateMaquina", datos:m })
    return
  }
  const { error } = await supabase.from("maquinas").update({ nombre:m.nombre, tipo:m.tipo, marca:m.marca, modelo:m.modelo, año:m.año, horas_totales:m.horasTotales||0, horas_service:m.horasService||0, intervalo:m.intervalo||250, consumo:m.consumo||0, notas:m.notas||"" }).eq("id",m.id)
  if (error) log("updateMaquina", error)
  else await guardarLocal("maquinas", m)
}

export async function deleteMaquina(id) {
  if (!isOnline()) { await guardarPendiente({ tipo:"deleteMaquina", id }); return }
  const { error } = await supabase.from("maquinas").delete().eq("id",id)
  if (error) log("deleteMaquina", error)
}

// ─── LOTES ───────────────────────────────────────────────────────────────────
export async function getLotes(userId) {
  return fetchConFallback(
    () => supabase.from("lotes").select("*").eq("user_id",userId).order("created_at"),
    "lotes", toLote
  )
}

export async function addLote(userId, l) {
  if (!isOnline()) {
    const tmp = { id:`tmp_${Date.now()}`, ...l }
    await guardarLocal("lotes", tmp)
    await guardarPendiente({ tipo:"addLote", userId, datos:l })
    return tmp
  }
  const { data, error } = await supabase.from("lotes").insert({ user_id:userId, nombre:l.nombre, productor:l.productor||"", cultivo:l.cultivo, ha:l.ha, estado:l.estado, campaña:l.campaña||"", cosecha:l.cosecha||null, gastos:l.gastos||[] }).select().single()
  if (error) { log("addLote", error); return null }
  const mapped = toLote(data)
  await guardarLocal("lotes", mapped)
  return mapped
}

export async function updateLote(l) {
  if (!isOnline()) {
    await guardarLocal("lotes", l)
    await guardarPendiente({ tipo:"updateLote", datos:l })
    return
  }
  const { error } = await supabase.from("lotes").update({ nombre:l.nombre, productor:l.productor||"", cultivo:l.cultivo, ha:l.ha, estado:l.estado, campaña:l.campaña||"", cosecha:l.cosecha||null, gastos:l.gastos||[] }).eq("id",l.id)
  if (error) log("updateLote", error)
  else await guardarLocal("lotes", l)
}

export async function deleteLote(id) {
  if (!isOnline()) { await guardarPendiente({ tipo:"deleteLote", id }); return }
  const { error } = await supabase.from("lotes").delete().eq("id",id)
  if (error) log("deleteLote", error)
}

// ─── TRABAJOS ─────────────────────────────────────────────────────────────────
export async function getTrabajos(userId) {
  return fetchConFallback(
    () => supabase.from("trabajos").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
    "trabajos", toTrabajo
  )
}

export async function addTrabajo(userId, t) {
  if (!isOnline()) {
    const tmp = { id:`tmp_${Date.now()}`, ...t }
    await guardarLocal("trabajos", tmp)
    await guardarPendiente({ tipo:"addTrabajo", userId, datos:t })
    return tmp
  }
  const { data, error } = await supabase.from("trabajos").insert({ user_id:userId, fecha:t.fecha, maquina:t.maquina, tipo:t.tipo, lote:t.lote, cultivo:t.cultivo, ha:t.ha||0, horas:t.horas||0, litros:t.litros||0, precio_gasoil:t.precioGasoil||0, gasto_extra:t.gastoExtra||0, rinde:t.rinde||null, precio_cereal:t.precioCereal||null, extras:t.extras||{} }).select().single()
  if (error) { log("addTrabajo", error); return null }
  const mapped = toTrabajo(data)
  await guardarLocal("trabajos", mapped)
  return mapped
}

export async function updateTrabajo(t) {
  if (!isOnline()) {
    await guardarLocal("trabajos", t)
    await guardarPendiente({ tipo:"updateTrabajo", datos:t })
    return
  }
  const { error } = await supabase.from("trabajos").update({ fecha:t.fecha, maquina:t.maquina, tipo:t.tipo, lote:t.lote, cultivo:t.cultivo, ha:t.ha||0, horas:t.horas||0, litros:t.litros||0, precio_gasoil:t.precioGasoil||0, gasto_extra:t.gastoExtra||0, rinde:t.rinde||null, precio_cereal:t.precioCereal||null, extras:t.extras||{} }).eq("id",t.id)
  if (error) log("updateTrabajo", error)
  else await guardarLocal("trabajos", t)
}

export async function deleteTrabajo(id) {
  if (!isOnline()) { await guardarPendiente({ tipo:"deleteTrabajo", id }); return }
  const { error } = await supabase.from("trabajos").delete().eq("id",id)
  if (error) log("deleteTrabajo", error)
}

// ─── COMBUSTIBLE ──────────────────────────────────────────────────────────────
export async function getCombustible(userId) {
  return fetchConFallback(
    () => supabase.from("combustible").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
    "combustible", toCarga
  )
}

export async function addCombustible(userId, c) {
  if (!isOnline()) {
    const tmp = { id:`tmp_${Date.now()}`, ...c }
    await guardarLocal("combustible", tmp)
    await guardarPendiente({ tipo:"addCombustible", userId, datos:c })
    return tmp
  }
  const { data, error } = await supabase.from("combustible").insert({ user_id:userId, fecha:c.fecha, maquina:c.maquina, litros:c.litros||0, precio:c.precio||0, proveedor:c.proveedor||"", notas:c.notas||"" }).select().single()
  if (error) { log("addCombustible", error); return null }
  const mapped = toCarga(data)
  await guardarLocal("combustible", mapped)
  return mapped
}

export async function updateCombustible(c) {
  if (!isOnline()) {
    await guardarLocal("combustible", c)
    await guardarPendiente({ tipo:"updateCombustible", datos:c })
    return
  }
  const { error } = await supabase.from("combustible").update({ fecha:c.fecha, maquina:c.maquina, litros:c.litros||0, precio:c.precio||0, proveedor:c.proveedor||"", notas:c.notas||"" }).eq("id",c.id)
  if (error) log("updateCombustible", error)
  else await guardarLocal("combustible", c)
}

export async function deleteCombustible(id) {
  if (!isOnline()) { await guardarPendiente({ tipo:"deleteCombustible", id }); return }
  const { error } = await supabase.from("combustible").delete().eq("id",id)
  if (error) log("deleteCombustible", error)
}

// ─── SINCRONIZACIÓN ───────────────────────────────────────────────────────────
// Se llama automáticamente cuando vuelve la conexión
export async function sincronizarPendientes(userId) {
  const { getPendientes, borrarPendiente } = await import("./offlineStorage")
  const pendientes = await getPendientes()
  if (pendientes.length === 0) return 0

  let sincronizados = 0
  for (const p of pendientes) {
    try {
      switch (p.tipo) {
        case "addMaquina":    await addMaquina(userId, p.datos);    break
        case "updateMaquina": await updateMaquina(p.datos);         break
        case "deleteMaquina": await deleteMaquina(p.id);            break
        case "addLote":       await addLote(userId, p.datos);       break
        case "updateLote":    await updateLote(p.datos);            break
        case "deleteLote":    await deleteLote(p.id);               break
        case "addTrabajo":    await addTrabajo(userId, p.datos);    break
        case "updateTrabajo": await updateTrabajo(p.datos);         break
        case "deleteTrabajo": await deleteTrabajo(p.id);            break
        case "addCombustible":    await addCombustible(userId, p.datos); break
        case "updateCombustible": await updateCombustible(p.datos);      break
        case "deleteCombustible": await deleteCombustible(p.id);         break
      }
      await borrarPendiente(p.id)
      sincronizados++
    } catch (err) {
      console.error("Error sincronizando:", p.tipo, err)
    }
  }
  return sincronizados
}

// =============================================================================
// EMPLEADOS
// =============================================================================

const toEmpleado = e => ({
  id:                  e.id,
  nombre:              e.nombre,
  telefono:            e.telefono,
  activo:              e.activo,
  recibeNotificaciones:e.recibe_notificaciones || false,
})

export async function getEmpleados(userId) {
  const { data, error } = await supabase.from("empleados").select("*").eq("user_id", userId).order("created_at")
  if (error) { log("getEmpleados", error); return [] }
  return data.map(toEmpleado)
}

export async function addEmpleado(userId, e) {
  const { data, error } = await supabase.from("empleados").insert({
    user_id: userId, nombre: e.nombre, telefono: e.telefono,
    activo: e.activo ?? true, recibe_notificaciones: e.recibeNotificaciones ?? false,
  }).select().single()
  if (error) { log("addEmpleado", error); return null }
  return toEmpleado(data)
}

export async function updateEmpleado(e) {
  const { error } = await supabase.from("empleados").update({
    nombre: e.nombre, telefono: e.telefono,
    activo: e.activo, recibe_notificaciones: e.recibeNotificaciones,
  }).eq("id", e.id)
  if (error) log("updateEmpleado", error)
}

export async function deleteEmpleado(id) {
  const { error } = await supabase.from("empleados").delete().eq("id", id)
  if (error) log("deleteEmpleado", error)
}

// =============================================================================
// REPUESTOS
// =============================================================================

const toRepuesto = r => ({
  id:            r.id,
  maquinaNombre: r.maquina_nombre,
  descripcion:   r.descripcion,
  cantidad:      r.cantidad || 1,
  costoEstimado: r.costo_estimado || 0,
  costoReal:     r.costo_real || 0,
  proveedor:     r.proveedor || "",
  comprado:      r.comprado || false,
  fechaPedido:   r.fecha_pedido,
  fechaCompra:   r.fecha_compra || "",
  origen:        r.origen || "manual",
  pedidoPor:     r.pedido_por || "",
  notas:         r.notas || "",
})

export async function getRepuestos(userId) {
  const { data, error } = await supabase.from("repuestos").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false })
  if (error) { log("getRepuestos", error); return [] }
  return data.map(toRepuesto)
}

export async function addRepuesto(userId, r) {
  const { data, error } = await supabase.from("repuestos").insert({
    user_id:       userId,
    maquina_nombre:r.maquinaNombre,
    descripcion:   r.descripcion,
    cantidad:      r.cantidad || 1,
    costo_estimado:r.costoEstimado || 0,
    costo_real:    r.costoReal || 0,
    proveedor:     r.proveedor || "",
    comprado:      r.comprado || false,
    fecha_pedido:  r.fechaPedido,
    fecha_compra:  r.fechaCompra || "",
    origen:        r.origen || "manual",
    pedido_por:    r.pedidoPor || "",
    notas:         r.notas || "",
  }).select().single()
  if (error) { log("addRepuesto", error); return null }
  return toRepuesto(data)
}

export async function updateRepuesto(r) {
  const { error } = await supabase.from("repuestos").update({
    maquina_nombre: r.maquinaNombre,
    descripcion:    r.descripcion,
    cantidad:       r.cantidad || 1,
    costo_estimado: r.costoEstimado || 0,
    costo_real:     r.costoReal || 0,
    proveedor:      r.proveedor || "",
    comprado:       r.comprado || false,
    fecha_pedido:   r.fechaPedido,
    fecha_compra:   r.fechaCompra || "",
    notas:          r.notas || "",
  }).eq("id", r.id)
  if (error) log("updateRepuesto", error)
}

export async function deleteRepuesto(id) {
  const { error } = await supabase.from("repuestos").delete().eq("id", id)
  if (error) log("deleteRepuesto", error)
}
