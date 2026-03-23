import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Tabla, Tr, Td, Badge, Vacio, ConfirmarEliminar, Spinner, Seccion } from "./UI"
import { formatPeso } from "../utils"
import { getRepuestos, addRepuesto, updateRepuesto, deleteRepuesto, getMaquinas, getTrabajos } from "../db"
import { analizarRepuestos } from "../gemini"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function FormRepuesto({ inicial, maquinas, onGuardar, onCerrar }) {
  const hoy = new Date().toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
  const vacio = { fecha: hoy, maquina: "", descripcion: "", cantidad: 1, costo: "", proveedor: "", notas: "" }
  const [form, setForm] = useState(inicial ? { ...inicial, costo: inicial.costo?.toString() } : vacio)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const guardar = () => {
    if (!form.maquina) { alert("Seleccioná una máquina."); return }
    if (!form.descripcion.trim()) { alert("Ingresá una descripción del repuesto."); return }
    onGuardar({
      ...form,
      cantidad: parseFloat(form.cantidad) || 1,
      costo: parseFloat(form.costo) || 0,
    })
  }
  return (
    <Modal titulo={inicial ? "Editar repuesto" : "Registrar repuesto"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial ? "Guardar" : "Agregar"}</BtnPrimario></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Fecha"><input className={IC} value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Campo>
        <Campo label="Máquina">
          <select className={SC} value={form.maquina} onChange={e=>set("maquina",e.target.value)}>
            <option value="">— Seleccioná una máquina —</option>
            {maquinas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Descripción"><input className={IC} placeholder="ej: Filtro de aceite, correa, etc." value={form.descripcion} onChange={e=>set("descripcion",e.target.value)}/></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Cantidad"><input className={IC} type="number" min="0.1" step="1" value={form.cantidad} onChange={e=>set("cantidad",e.target.value)}/></Campo>
        <Campo label="Costo estimado ($)"><input className={IC} type="number" min="0" step="100" placeholder="ej: 25000" value={form.costo} onChange={e=>set("costo",e.target.value)}/></Campo>
      </div>
      <Campo label="Proveedor (opcional)"><input className={IC} placeholder="ej: John Deere Agro" value={form.proveedor} onChange={e=>set("proveedor",e.target.value)}/></Campo>
      <Campo label="Notas (opcional)"><input className={IC} placeholder="observaciones" value={form.notas} onChange={e=>set("notas",e.target.value)}/></Campo>
    </Modal>
  )
}

function ModalCompra({ repuesto, onGuardar, onCerrar }) {
  const [costoReal, setCostoReal] = useState(repuesto.costo_real || repuesto.costo || 0)
  const guardar = () => {
    onGuardar({ comprado: true, costo_real: parseFloat(costoReal) || 0 })
  }
  return (
    <Modal titulo="Marcar como comprado" onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>Guardar</BtnPrimario></>}>
      <p className="text-white/60 text-sm mb-4">Repuesto: <span className="text-white font-semibold">{repuesto.descripcion}</span></p>
      <Campo label="Costo real pagado ($)">
        <input type="number" className={IC} value={costoReal} onChange={e=>setCostoReal(e.target.value)} placeholder="ej: 28000" />
      </Campo>
      <p className="text-white/30 text-xs mt-2">El costo estimado era {formatPeso(repuesto.costo)}.</p>
    </Modal>
  )
}

export default function Repuestos({ userId, user }) {
  const [repuestos, setRepuestos] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [trabajos, setTrabajos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalCompra, setModalCompra] = useState(null)
  const [eliminar, setEliminar] = useState(null)
  const [analisis, setAnalisis] = useState({})
  const [cargandoIA, setCargandoIA] = useState({})

  // Filtros
  const [filtroMaquina, setFiltroMaquina] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [costoMin, setCostoMin] = useState("")
  const [costoMax, setCostoMax] = useState("")

  useEffect(() => {
    Promise.all([getRepuestos(userId), getMaquinas(userId), getTrabajos(userId)])
      .then(([r, m, t]) => { setRepuestos(r); setMaquinas(m); setTrabajos(t); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando repuestos..." />

  const repuestosFiltrados = repuestos.filter(r => {
    if (filtroMaquina && r.maquina !== filtroMaquina) return false
    if (fechaDesde) {
      const [d, m, y] = r.fecha.split('/')
      const f = new Date(`${y}-${m}-${d}`)
      const desde = new Date(fechaDesde)
      if (f < desde) return false
    }
    if (fechaHasta) {
      const [d, m, y] = r.fecha.split('/')
      const f = new Date(`${y}-${m}-${d}`)
      const hasta = new Date(fechaHasta)
      if (f > hasta) return false
    }
    const costo = r.costo || 0
    if (costoMin && costo < parseFloat(costoMin)) return false
    if (costoMax && costo > parseFloat(costoMax)) return false
    return true
  })

  const guardar = async (datos) => {
    let nuevoRepuesto = null
    if (modal === "nuevo") {
      const nuevo = await addRepuesto(userId, datos)
      if (nuevo) {
        setRepuestos(prev => [nuevo, ...prev])
        nuevoRepuesto = nuevo
      }
    } else {
      const act = { ...modal, ...datos }
      await updateRepuesto(act)
      setRepuestos(prev => prev.map(r => r.id === modal.id ? act : r))
      nuevoRepuesto = act
    }

    if (nuevoRepuesto && user?.user_metadata?.whatsapp) {
      try {
        await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.user_metadata.whatsapp,
            repuesto: nuevoRepuesto
          })
        })
      } catch (error) {
        console.error('Error al enviar notificación WhatsApp:', error)
      }
    }
    setModal(null)
  }

  const guardarCompra = async (id, compra) => {
    const repuesto = repuestos.find(r => r.id === id)
    if (!repuesto) return
    const actualizado = { ...repuesto, comprado: true, costo_real: compra.costo_real }
    await updateRepuesto(actualizado)
    setRepuestos(prev => prev.map(r => r.id === id ? actualizado : r))
    setModalCompra(null)
  }

  const confirmarEliminar = async () => {
    await deleteRepuesto(eliminar.id)
    setRepuestos(prev => prev.filter(r => r.id !== eliminar.id))
    setEliminar(null)
  }

  const totalGastoEstimado = repuestosFiltrados.reduce((s, r) => s + (r.costo || 0), 0)
  const totalGastoReal = repuestosFiltrados.reduce((s, r) => s + (r.costo_real || 0), 0)
  const totalRepuestos = repuestosFiltrados.length

  const porMaquina = repuestosFiltrados.reduce((acc, r) => {
    if (!acc[r.maquina]) acc[r.maquina] = { cantidad: 0, costoEstimado: 0, costoReal: 0, repuestos: [] }
    acc[r.maquina].cantidad += r.cantidad
    acc[r.maquina].costoEstimado += r.costo || 0
    acc[r.maquina].costoReal += r.costo_real || 0
    acc[r.maquina].repuestos.push(r)
    return acc
  }, {})

  const pedirAnalisis = async (maquinaNombre) => {
    if (cargandoIA[maquinaNombre]) return
    setCargandoIA(prev => ({ ...prev, [maquinaNombre]: true }))
    const maquina = maquinas.find(m => m.nombre === maquinaNombre)
    const repuestosMaq = repuestos.filter(r => r.maquina === maquinaNombre)
    const trabajosMaq = trabajos.filter(t => t.maquina === maquinaNombre)
    const texto = await analizarRepuestos(maquinaNombre, repuestosMaq, maquina, trabajosMaq)
    setAnalisis(prev => ({ ...prev, [maquinaNombre]: texto }))
    setCargandoIA(prev => ({ ...prev, [maquinaNombre]: false }))
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Reporte de Repuestos", 14, 20)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 14, 28)
    if (filtroMaquina) doc.text(`Máquina: ${filtroMaquina}`, 14, 36)
    if (fechaDesde || fechaHasta) doc.text(`Período: ${fechaDesde || "inicio"} → ${fechaHasta || "hoy"}`, 14, 44)
    if (costoMin || costoMax) doc.text(`Costo: ${costoMin || "mín"} → ${costoMax || "máx"}`, 14, 52)

    const tableData = repuestosFiltrados.map(r => [
      r.fecha,
      r.maquina,
      r.descripcion,
      r.cantidad.toString(),
      `$${r.costo.toLocaleString()}`,
      r.comprado ? `$${r.costo_real.toLocaleString()}` : "Pendiente",
      r.proveedor || "",
    ])
    autoTable(doc, {
      startY: 60,
      head: [["Fecha", "Máquina", "Descripción", "Cant.", "Costo est.", "Costo real", "Proveedor"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    })
    doc.save(`repuestos_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const limpiarFiltros = () => {
    setFiltroMaquina("")
    setFechaDesde("")
    setFechaHasta("")
    setCostoMin("")
    setCostoMax("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-white">Repuestos y Mantenimiento</h2>
          <p className="text-sm text-white/30 mt-0.5">{repuestos.length} repuestos totales · {totalRepuestos} filtrados</p></div>
        <div className="flex gap-2">
          <BtnPrimario onClick={()=>setModal("nuevo")} color="emerald">+ Registrar repuesto</BtnPrimario>
          <BtnSecundario onClick={exportarPDF}><span className="flex items-center gap-1">📄 Exportar PDF</span></BtnSecundario>
        </div>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-white/35 uppercase tracking-wider block mb-1">Máquina</label>
            <select className={SC} value={filtroMaquina} onChange={e=>setFiltroMaquina(e.target.value)}>
              <option value="">Todas</option>
              {maquinas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-white/35 uppercase tracking-wider block mb-1">Desde</label>
            <input type="date" className={IC} value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-white/35 uppercase tracking-wider block mb-1">Hasta</label>
            <input type="date" className={IC} value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-white/35 uppercase tracking-wider block mb-1">Costo mín.</label>
            <input type="number" className={IC} placeholder="$" value={costoMin} onChange={e=>setCostoMin(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-white/35 uppercase tracking-wider block mb-1">Costo máx.</label>
            <input type="number" className={IC} placeholder="$" value={costoMax} onChange={e=>setCostoMax(e.target.value)} />
          </div>
          <div>
            <BtnSecundario onClick={limpiarFiltros}>Limpiar</BtnSecundario>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Repuestos filtrados" value={totalRepuestos} color="text-sky-400" />
        <KpiCard label="Gasto estimado" value={formatPeso(totalGastoEstimado)} color="text-red-400" />
        <KpiCard label="Gasto real" value={formatPeso(totalGastoReal)} color="text-emerald-400" />
        <KpiCard label="Diferencia" value={formatPeso(totalGastoReal - totalGastoEstimado)} color={totalGastoReal > totalGastoEstimado ? "text-red-400" : "text-green-400"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(porMaquina).sort((a,b) => b[1].costoReal - a[1].costoReal).map(([maq, datos]) => (
          <Seccion key={maq} titulo={`${maq} · Estimado: ${formatPeso(datos.costoEstimado)} · Real: ${formatPeso(datos.costoReal)}`}
            accion={<button onClick={() => pedirAnalisis(maq)} className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              {cargandoIA[maq] ? "Analizando..." : "🤖 Analizar"}
            </button>}>
            <div className="px-5 py-3 border-b border-white/8 flex justify-between text-sm">
              <span className="text-white/40">Repuestos: {datos.repuestos.length}</span>
              <span className="text-white/40">Cantidad total: {datos.cantidad}</span>
            </div>
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {datos.repuestos.slice(0,5).map(r => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-sm font-semibold">{r.descripcion}</p>
                      <p className="text-white/30 text-xs">{r.fecha} · {r.proveedor || "sin proveedor"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-sm">{formatPeso(r.costo)}</p>
                      {r.comprado && <p className="text-white/25 text-xs">Real: {formatPeso(r.costo_real)}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {datos.repuestos.length > 5 && (
                <div className="px-5 py-2 text-center text-white/25 text-xs">+ {datos.repuestos.length - 5} más</div>
              )}
            </div>
            {analisis[maq] && (
              <div className="p-4 border-t border-white/8 bg-emerald-500/5">
                <p className="text-xs text-emerald-400/60 uppercase font-bold mb-2">Análisis IA</p>
                <p className="text-white/70 text-sm whitespace-pre-line">{analisis[maq]}</p>
              </div>
            )}
          </Seccion>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <Tabla headers={["Fecha","Máquina","Descripción","Cant.","Costo est.","Costo real","Proveedor",""]}
          vacio={repuestosFiltrados.length===0 && <Vacio icon="🔧" titulo="Sin repuestos" sub="Ajustá los filtros o registrá repuestos."/>}>
          {repuestosFiltrados.map(r => (
            <Tr key={r.id}>
              <Td muted mono>{r.fecha}</Td>
              <Td bold>{r.maquina}</Td>
              <Td>{r.descripcion}</Td>
              <Td muted>{r.cantidad}</Td>
              <Td mono color="text-emerald-400">{formatPeso(r.costo)}</Td>
              <Td mono color={r.comprado ? "text-white" : "text-white/30"}>
                {r.comprado ? formatPeso(r.costo_real) : "Pendiente"}
              </Td>
              <Td muted>{r.proveedor || "—"}</Td>
              <td className="px-5 py-3">
                <div className="flex gap-1">
                  {!r.comprado && (
                    <BtnIcono onClick={()=>setModalCompra(r)} icon="🛒" title="Marcar comprado" />
                  )}
                  <BtnIcono onClick={()=>setModal(r)} icon="✏️" title="Editar"/>
                  <BtnIcono onClick={()=>setEliminar(r)} icon="🗑️" title="Eliminar" danger/>
                </div>
              </td>
            </Tr>
          ))}
        </Tabla>
      </div>

      {modal && <FormRepuesto inicial={modal!=="nuevo"?modal:null} maquinas={maquinas} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {modalCompra && <ModalCompra repuesto={modalCompra} onGuardar={(compra) => guardarCompra(modalCompra.id, compra)} onCerrar={()=>setModalCompra(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.descripcion} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}