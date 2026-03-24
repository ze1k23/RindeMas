import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Badge, BarraProgreso, ConfirmarEliminar, Vacio, Spinner } from "./UI"
import { estadoService, TIPOS_MAQUINA } from "../utils"
import { getMaquinas, addMaquina, updateMaquina, deleteMaquina } from "../db"

function FormMaquina({ inicial, onGuardar, onCerrar }) {
  const v = { nombre:"", tipo:"Cosechadora", marca:"", modelo:"", año:new Date().getFullYear(), horasTotales:0, horasService:0, intervalo:250, consumo:15, notas:"" }
  const [form, setForm] = useState(inicial?{...inicial}:v)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const guardar = () => {
    if (!form.nombre.trim()) { alert("Ingresá un nombre para la máquina."); return }
    if (!form.marca.trim())  { alert("Ingresá la marca."); return }
    onGuardar({ ...form, año:parseInt(form.año)||new Date().getFullYear(), horasTotales:parseFloat(form.horasTotales)||0, horasService:parseFloat(form.horasService)||0, intervalo:parseFloat(form.intervalo)||250, consumo:parseFloat(form.consumo)||0 })
  }
  return (
    <Modal titulo={inicial?"Editar máquina":"Nueva máquina"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar":"Agregar"}</BtnPrimario></>}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Nombre">
          <input className={IC} placeholder="ej: Cosechadora 150" value={form.nombre} onChange={e=>set("nombre",e.target.value)}/>
        </Campo>
        <Campo label="Tipo">
          <select className={SC} value={form.tipo} onChange={e=>set("tipo",e.target.value)}>
            {TIPOS_MAQUINA.map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Marca"><input className={IC} placeholder="John Deere" value={form.marca} onChange={e=>set("marca",e.target.value)}/></Campo>
        <Campo label="Modelo"><input className={IC} placeholder="S670" value={form.modelo} onChange={e=>set("modelo",e.target.value)}/></Campo>
        <Campo label="Año"><input className={IC} type="number" value={form.año} onChange={e=>set("año",e.target.value)}/></Campo>
      </div>
      <div className="border-t border-white/8 pt-3">
        <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Horas actuales</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Horas en motor"><input className={IC} type="number" min="0" value={form.horasTotales} onChange={e=>set("horasTotales",e.target.value)}/></Campo>
          <Campo label="Hs desde service"><input className={IC} type="number" min="0" value={form.horasService} onChange={e=>set("horasService",e.target.value)}/></Campo>
          <Campo label="Intervalo service (h)"><input className={IC} type="number" min="1" value={form.intervalo} onChange={e=>set("intervalo",e.target.value)}/></Campo>
          <Campo label="Consumo (L/h)"><input className={IC} type="number" min="0" step="0.5" value={form.consumo} onChange={e=>set("consumo",e.target.value)}/></Campo>
        </div>
      </div>
      <Campo label="Notas (opcional)"><input className={IC} placeholder="observaciones" value={form.notas} onChange={e=>set("notas",e.target.value)}/></Campo>
    </Modal>
  )
}

export default function Flota({ userId }) {
  const [maquinas, setMaquinas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [eliminar, setEliminar] = useState(null)

  useEffect(() => {
    getMaquinas(userId).then(d=>{setMaquinas(d);setLoading(false)})
  }, [userId])

  if (loading) return <Spinner texto="Cargando flota..."/>

  const guardar = async (datos) => {
    if (modal==="nuevo") {
      const nueva = await addMaquina(userId, datos)
      if (nueva) setMaquinas(prev=>[...prev,nueva])
    } else {
      const act = {...modal,...datos}
      await updateMaquina(act)
      setMaquinas(prev=>prev.map(m=>m.id===modal.id?act:m))
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteMaquina(eliminar.id)
    setMaquinas(prev=>prev.filter(m=>m.id!==eliminar.id))
    setEliminar(null)
  }

  const registrarService = async (id) => {
    const m = maquinas.find(m=>m.id===id); if (!m) return
    const act = {...m, horasService:0}
    await updateMaquina(act)
    setMaquinas(prev=>prev.map(m=>m.id===id?act:m))
  }

  const urgentes = maquinas.filter(m=>estadoService(m.horasService,m.intervalo).pct>=100).length
  const alertas  = maquinas.filter(m=>{const s=estadoService(m.horasService,m.intervalo);return s.pct>=80&&s.pct<100}).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Flota</h2>
          <p className="text-sm text-white/30 mt-0.5">
            {maquinas.length} máquinas
            {urgentes>0&&<span className="text-red-400"> · {urgentes} urgente</span>}
            {alertas>0&&<span className="text-amber-400"> · {alertas} próximo</span>}
          </p>
        </div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Nueva</BtnPrimario>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total"   value={maquinas.length} color="text-white"      />
        <KpiCard label="Urgente" value={urgentes}        color="text-red-400"    />
        <KpiCard label="Próximo" value={alertas}         color="text-amber-400"  />
      </div>

      {maquinas.length===0
        ? <div className="rounded-2xl border border-white/8 bg-white/3">
            <Vacio icon="🚜" titulo="No hay máquinas" sub='Agregá tu primera máquina para empezar.'
              accion={<BtnPrimario onClick={()=>setModal("nuevo")}>+ Nueva máquina</BtnPrimario>}/>
          </div>
        : <div className="space-y-3">
            {maquinas.map(m=>{
              const est = estadoService(m.horasService, m.intervalo)
              return (
                <div key={m.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold">{m.nombre}</p>
                        <Badge color={est.color}>{est.label}</Badge>
                      </div>
                      <p className="text-white/35 text-xs mt-0.5">{m.marca} {m.modelo} · {m.año} · {m.tipo}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <BtnIcono onClick={()=>setModal(m)} icon="✏️" title="Editar"/>
                      <BtnIcono onClick={()=>setEliminar(m)} icon="🗑️" title="Eliminar" danger/>
                    </div>
                  </div>
                  <BarraProgreso pct={est.pct}/>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-white/30 text-xs font-mono">{m.horasService}h / {m.intervalo}h · {est.pct.toFixed(0)}%</p>
                    <button onClick={()=>registrarService(m.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/8 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all">
                      ✓ Service
                    </button>
                  </div>
                  <p className="text-white/20 text-xs mt-1">Horas totales: {(m.horasTotales||0).toLocaleString()}h · Consumo: {m.consumo} L/h</p>
                </div>
              )
            })}
          </div>
      }

      {modal    && <FormMaquina inicial={modal!=="nuevo"?modal:null} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.nombre} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
