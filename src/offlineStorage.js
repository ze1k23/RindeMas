// =============================================================================
// offlineStorage.js — almacenamiento local para modo offline
// Cuando no hay internet, guardamos en IndexedDB y sincronizamos después
// =============================================================================

const DB_NAME    = "rindemas_offline"
const DB_VERSION = 1
const STORES     = ["maquinas","lotes","trabajos","combustible","pendientes"]

let db = null

async function getDB() {
  if (db) return db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const d = e.target.result
      STORES.forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" }) })
    }
    req.onsuccess = e => { db = e.target.result; resolve(db) }
    req.onerror   = e => reject(e)
  })
}

export async function guardarLocal(store, items) {
  const d = await getDB()
  const tx = d.transaction(store, "readwrite")
  const s  = tx.objectStore(store)
  if (Array.isArray(items)) items.forEach(i => s.put(i))
  else s.put(items)
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej })
}

export async function leerLocal(store) {
  const d = await getDB()
  return new Promise((res, rej) => {
    const tx  = d.transaction(store, "readonly")
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => res(req.result || [])
    req.onerror   = rej
  })
}

export async function borrarLocal(store, id) {
  const d = await getDB()
  return new Promise((res, rej) => {
    const tx = d.transaction(store, "readwrite")
    tx.objectStore(store).delete(id)
    tx.oncomplete = res; tx.onerror = rej
  })
}

export async function limpiarLocal(store) {
  const d = await getDB()
  return new Promise((res, rej) => {
    const tx = d.transaction(store, "readwrite")
    tx.objectStore(store).clear()
    tx.oncomplete = res; tx.onerror = rej
  })
}

// Guarda operaciones pendientes para sincronizar cuando haya internet
export async function guardarPendiente(operacion) {
  const pendiente = { id: Date.now().toString(), ...operacion, timestamp: new Date().toISOString() }
  await guardarLocal("pendientes", pendiente)
}

export async function getPendientes() {
  return await leerLocal("pendientes")
}

export async function borrarPendiente(id) {
  await borrarLocal("pendientes", id)
}

export function isOnline() {
  return navigator.onLine
}
