import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Tabla, Tr, Td, Badge, BarraProgreso, ConfirmarEliminar, Vacio, Spinner } from "./UI"
import { estadoService, TIPOS_MAQUINA } from "../utils"
import { getMaquinas, addMaquina, updateMaquina, deleteMaquina } from "../db"

function FormMaquina({ inicial, onGuardar, onCerrar }) {
  const vacio = { nombre:"", tipo:"Cosechadora", marca:"", modelo:"", año:new Date().getFullYear(), horasTotales:0, horasService:0, intervalo:250, consumo:15, notas:"" }
  const [form, setForm] = useState(inicial ? { ...inicial } : vacio)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = () => {
    if (!form.nombre.trim()) { alert("Ingresá un nombre."); return }
    if (!form.marca.trim())  { alert("Ingresá la marca."); return }
    onGuardar({
      ...form,
      año:          parseInt(form.año)            || new Date().getFullYear(),
      horasTotales: parseFloat(form.horasTotales) || 0,
      horasService: parseFloat(form.horasService) || 0,
      intervalo:    parseFloat(form.intervalo)    || 250,
      consumo:      parseFloat(form.consumo)      || 0,
    })
  }

  return (
    <Modal titulo={inicial ? "Editar máquina" : "Nueva máquina"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar cambios":"Agregar máquina"}</BtnPrimario></>}>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nombre identificatorio">
          <input className={IC} placeholder="ej: Cosechadora 150" value={form.nombre} onChange={e=>set("nombre",e.target.value)}/>
        </Campo>
        <Campo label="Tipo">
          <select className={SC} value={form.tipo} onChange={e=>set("tipo",e.target.value)}>
            {TIPOS_MAQUINA.map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Campo label="Marca"><input className={IC} placeholder="ej: John Deere" value={form.marca} onChange={e=>set("marca",e.target.value)}/></Campo>
        <Campo label="Modelo"><input className={IC} placeholder="ej: S670" value={form.modelo} onChange={e=>set("modelo",e.target.value)}/></Campo>
        <Campo label="Año"><input className={IC} type="number" value={form.año} onChange={e=>set("año",e.target.value)}/></Campo>
      </div>
      <div className="border-t border-white/8 pt-4">
        <p className="text-xs text-white/25 uppercase tracking-wider mb-3">Estado actual del horario</p>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Horas totales en motor"><input className={IC} type="number" min="0" value={form.horasTotales} onChange={e=>set("horasTotales",e.target.value)}/></Campo>
          <Campo label="Horas desde último service"><input className={IC} type="number" min="0" value={form.horasService} onChange={e=>set("horasService",e.target.value)}/></Campo>
          <Campo label="Intervalo de service (h)"><input className={IC} type="number" min="1" value={form.intervalo} onChange={e=>set("intervalo",e.target.value)}/></Campo>
          <Campo label="Consumo estimado (L/h)"><input className={IC} type="number" min="0" step="0.5" value={form.consumo} onChange={e=>set("consumo",e.target.value)}/></Campo>
        </div>
      </div>
      <Campo label="Notas (opcional)"><input className={IC} placeholder="cualquier observación" value={form.notas} onChange={e=>set("notas",e.target.value)}/></Campo>
    </Modal>
  )
}

export default function Flota({ userId }) {
  const [maquinas, setMaquinas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [eliminar, setEliminar] = useState(null)

  useEffect(() => {
    getMaquinas(userId).then(data => { setMaquinas(data); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando flota..." />

  const guardar = async (datos) => {
    if (modal === "nuevo") {
      const nueva = await addMaquina(userId, datos)
      if (nueva) setMaquinas(prev => [...prev, nueva])
    } else {
      const act = { ...modal, ...datos }
      await updateMaquina(act)
      setMaquinas(prev => prev.map(m => m.id===modal.id ? act : m))
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteMaquina(eliminar.id)
    setMaquinas(prev => prev.filter(m => m.id !== eliminar.id))
    setEliminar(null)
  }

  const registrarService = async (id) => {
    const m = maquinas.find(m => m.id === id)
    if (!m) return
    const act = { ...m, horasService: 0 }
    await updateMaquina(act)
    setMaquinas(prev => prev.map(m => m.id===id ? act : m))
  }

  const urgentes = maquinas.filter(m => estadoService(m.horasService, m.intervalo).pct >= 100).length
  const alertas  = maquinas.filter(m => { const s = estadoService(m.horasService, m.intervalo); return s.pct>=80 && s.pct<100 }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gestión de Flota</h2>
          <p className="text-sm text-white/30 mt-0.5">
            {maquinas.length} máquinas
            {urgentes>0 && <span className="text-red-400"> · {urgentes} con service urgente</span>}
            {alertas>0  && <span className="text-amber-400"> · {alertas} próximas a service</span>}
          </p>
        </div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Nueva máquina</BtnPrimario>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total"            value={maquinas.length} color="text-white"       />
        <KpiCard label="Service urgente"  value={urgentes}        color="text-red-400"     />
        <KpiCard label="Próximas"         value={alertas}         color="text-amber-400"   />
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <Tabla headers={["Máquina","Tipo","Horas","Service","Estado","Acciones"]}
          vacio={maquinas.length===0&&<Vacio icon="🚜" titulo="No hay máquinas registradas" sub='Hacé click en "Nueva máquina" para empezar.'/>}>
          {maquinas.map(m => {
            const est = estadoService(m.horasService, m.intervalo)
            return (
              <Tr key={m.id}>
                <Td><p className="font-semibold">{m.nombre}</p><p className="text-white/30 text-xs">{m.marca} {m.modelo} · {m.año}</p></Td>
                <Td muted>{m.tipo}</Td>
                <Td mono muted>{(m.horasTotales||0).toLocaleString()}h</Td>
                <Td>
                  <div className="w-40">
                    <BarraProgreso pct={est.pct}/>
                    <p className="text-white/25 text-xs mt-1 font-mono">{m.horasService}h / {m.intervalo}h</p>
                  </div>
                </Td>
                <Td><Badge color={est.pct>=100?"red":est.pct>=80?"amber":"emerald"}>{est.label}</Badge></Td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={()=>registrarService(m.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/8 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all">✓ Service</button>
                    <BtnIcono onClick={()=>setModal(m)} icon="✏️" title="Editar"/>
                    <BtnIcono onClick={()=>setEliminar(m)} icon="🗑️" title="Eliminar" danger/>
                  </div>
                </td>
              </Tr>
            )
          })}
        </Tabla>
      </div>

      {modal    && <FormMaquina inicial={modal!=="nuevo"?modal:null} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.nombre} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
