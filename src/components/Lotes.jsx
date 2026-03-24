import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Badge, BarraProgreso, ConfirmarEliminar, Seccion, Vacio, Spinner } from "./UI"
import { calcRentabilidadLote, formatPeso, CULTIVOS, CATEGORIAS_GASTO } from "../utils"
import { getLotes, addLote, updateLote, deleteLote, getTrabajos } from "../db"

function FormLote({ inicial, onGuardar, onCerrar }) {
  const año = new Date().getFullYear()
  const v   = { nombre:"", productor:"", cultivo:"Soja", ha:"", campaña:`${año-1}/${año}` }
  const [form, setForm] = useState(inicial?{...inicial,ha:inicial.ha?.toString()}:v)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const guardar = () => {
    if (!form.nombre.trim())                  { alert("Ingresá el nombre del lote."); return }
    if (!form.ha||isNaN(parseFloat(form.ha))) { alert("Ingresá las hectáreas."); return }
    onGuardar({ ...form, ha:parseFloat(form.ha) })
  }
  return (
    <Modal titulo={inicial?"Editar lote":"Nuevo lote"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar":"Crear lote"}</BtnPrimario></>}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Nombre del lote"><input className={IC} placeholder="ej: El Talar" value={form.nombre} onChange={e=>set("nombre",e.target.value)}/></Campo>
        <Campo label="Productor / Dueño"><input className={IC} placeholder="ej: Juan Pérez" value={form.productor} onChange={e=>set("productor",e.target.value)}/></Campo>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Cultivo">
          <select className={SC} value={form.cultivo} onChange={e=>set("cultivo",e.target.value)}>
            {CULTIVOS.map(c=><option key={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label="Hectáreas"><input className={IC} type="number" min="0.1" placeholder="150" value={form.ha} onChange={e=>set("ha",e.target.value)}/></Campo>
        <Campo label="Campaña"><input className={IC} placeholder="2025/26" value={form.campaña} onChange={e=>set("campaña",e.target.value)}/></Campo>
      </div>
    </Modal>
  )
}

function FormCosecha({ lote, trabajos, onGuardar, onCerrar }) {
  const hoy = new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"})
  const [form, setForm] = useState(lote.cosecha?{...lote.cosecha,rinde:lote.cosecha.rinde?.toString(),precioCereal:lote.cosecha.precioCereal?.toString()}:{rinde:"",precioCereal:"",fecha:hoy})
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const rinde = parseFloat(form.rinde)||0
  const precio= parseFloat(form.precioCereal)||0
  const rent  = rinde>0&&precio>0 ? calcRentabilidadLote({...lote,cosecha:{rinde,precioCereal:precio}},trabajos) : null
  const guardar = () => {
    if (!rinde||rinde<=0) { alert("Ingresá el rinde en kg/ha."); return }
    if (!precio||precio<=0){ alert("Ingresá el precio del cereal."); return }
    onGuardar({ rinde, precioCereal:precio, fecha:form.fecha })
  }
  return (
    <Modal titulo="Registrar cosecha" subtitulo={`${lote.nombre} · ${lote.cultivo} · ${lote.ha} ha`} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>Guardar cosecha</BtnPrimario></>}>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Rinde (kg/ha)" hint="kilos por hectárea"><input className={IC} type="number" min="0" placeholder="3200" value={form.rinde} onChange={e=>set("rinde",e.target.value)}/></Campo>
        <Campo label="Precio ($/kg)"><input className={IC} type="number" min="0" placeholder="380" value={form.precioCereal} onChange={e=>set("precioCereal",e.target.value)}/></Campo>
        <Campo label="Fecha"><input className={IC} value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Campo>
      </div>
      {rent&&!rent.sinCosecha&&(
        <div className={`rounded-2xl p-4 border ${rent.rentable?"bg-emerald-500/5 border-emerald-500/20":"bg-red-500/5 border-red-500/20"}`}>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3 font-bold">Resultado del lote</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><p className="text-xs text-white/30">Ingreso bruto/ha</p><p className="text-sky-400 font-bold text-lg">{formatPeso(rent.ingresoPorHa)}</p></div>
            <div><p className="text-xs text-white/30">Costo total/ha</p><p className="text-red-400 font-bold text-lg">{formatPeso(rent.costoPorHa)}</p></div>
          </div>
          <div className={`rounded-xl p-3 ${rent.rentable?"bg-emerald-500/10":"bg-red-500/10"} flex justify-between items-center`}>
            <div><p className="text-xs text-white/30 mb-1">Ganancia neta/ha</p>
              <p className={`font-black text-2xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.rentable?"+":""}{formatPeso(rent.gananciaPorHa)}</p></div>
            <div className="text-right"><p className="text-xs text-white/30">Margen</p>
              <p className={`font-black text-xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.margen?.toFixed(1)}%</p></div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function DetalleLote({ lote, trabajos, onVolver, onActualizar }) {
  const [modalCosecha, setModalCosecha] = useState(false)
  const [modalEditar,  setModalEditar]  = useState(false)
  const rent = calcRentabilidadLote(lote, trabajos)
  const comb = rent.comb
  const estadoColors = {"Cosechado":"emerald","Listo para cosechar":"amber","En crecimiento":"sky","Sembrado":"blue","En preparación":"white"}

  const guardarCosecha = async (cosecha) => {
    const act = {...lote,cosecha,estado:"Cosechado"}
    await updateLote(act); onActualizar(act); setModalCosecha(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button onClick={onVolver} className="p-2.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-all shrink-0">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white">{lote.nombre}</h2>
            <Badge color={estadoColors[lote.estado]||"white"}>{lote.estado}</Badge>
          </div>
          <p className="text-white/35 text-sm mt-0.5">{lote.cultivo} · {lote.ha} ha · {lote.productor} · {lote.campaña}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <BtnIcono onClick={()=>setModalEditar(true)} icon="✏️" title="Editar"/>
          <BtnPrimario onClick={()=>setModalCosecha(true)}>🌾 {lote.cosecha?"Editar":"Cosechar"}</BtnPrimario>
        </div>
      </div>

      {!rent.sinCosecha ? (
        <div className={`rounded-2xl border p-5 ${rent.rentable?"bg-emerald-500/5 border-emerald-500/20":"bg-red-500/5 border-red-500/20"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/35">Resultado del lote</p>
            <Badge color={rent.rentable?"emerald":"red"}>{rent.rentable?"✅ RENTABLE":"❌ PÉRDIDA"}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><p className="text-xs text-white/30 mb-1">Ingreso bruto/ha</p> <p className="text-sky-400 font-black text-xl">{formatPeso(rent.ingresoPorHa)}</p></div>
            <div><p className="text-xs text-white/30 mb-1">Costo total/ha</p>   <p className="text-red-400 font-black text-xl">{formatPeso(rent.costoPorHa)}</p></div>
            <div><p className="text-xs text-white/30 mb-1">Ganancia/ha</p>      <p className={`font-black text-xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.rentable?"+":""}{formatPeso(rent.gananciaPorHa)}</p></div>
            <div><p className="text-xs text-white/30 mb-1">Ganancia total</p>   <p className={`font-black text-xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.rentable?"+":""}{formatPeso(rent.gananciaTotal)}</p></div>
          </div>
          <div className="flex gap-4 text-xs text-white/35 border-t border-white/8 pt-3 flex-wrap">
            <span>Rinde: <span className="text-white font-semibold">{lote.cosecha.rinde?.toLocaleString()} kg/ha</span></span>
            <span>Precio: <span className="text-white font-semibold">{formatPeso(lote.cosecha.precioCereal)}/kg</span></span>
            <span>Margen: <span className={`font-semibold ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.margen?.toFixed(1)}%</span></span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <p className="text-amber-400 font-bold text-sm">Sin cosecha registrada</p>
            <p className="text-white/30 text-xs mt-0.5">Costo acumulado: <span className="text-white font-semibold">{formatPeso(rent.costoTotal)}</span> ({formatPeso(rent.costoPorHa)}/ha)</p>
          </div>
          <button onClick={()=>setModalCosecha(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shrink-0">Registrar</button>
        </div>
      )}

      <Seccion titulo={`Costos por categoría — ${formatPeso(rent.costoTotal)}`}>
        <div className="divide-y divide-white/5 px-4">
          {CATEGORIAS_GASTO.map(cat=>{
            const gs = (lote.gastos||[]).filter(g=>g.categoria===cat.id)
            const total = gs.reduce((s,g)=>s+(g.monto||0),0)
            if (total===0) return null
            const pct = rent.costoTotal>0?(total/rent.costoTotal)*100:0
            return (
              <div key={cat.id} className="py-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-white/60">{cat.icon} {cat.label}</span>
                  <div className="text-right">
                    <span className="text-white font-semibold text-sm">{formatPeso(total)}</span>
                    {lote.ha>0&&<span className="text-white/25 text-xs ml-2">{formatPeso(total/lote.ha)}/ha</span>}
                  </div>
                </div>
                <BarraProgreso pct={pct} color="bg-emerald-500/50"/>
              </div>
            )
          })}
          {comb.monto>0&&(
            <div className="py-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-white/60">⛽ Combustible <span className="text-white/25 text-xs">({comb.trabajos} trabajos)</span></span>
                <div className="text-right">
                  <span className="text-amber-400 font-semibold text-sm">{formatPeso(comb.monto)}</span>
                  {lote.ha>0&&<span className="text-white/25 text-xs ml-2">{formatPeso(comb.monto/lote.ha)}/ha</span>}
                </div>
              </div>
              <BarraProgreso pct={rent.costoTotal>0?(comb.monto/rent.costoTotal)*100:0} color="bg-amber-500/50"/>
            </div>
          )}
          {(lote.gastos||[]).length===0&&comb.monto===0&&(
            <p className="py-5 text-center text-white/25 text-sm">Los costos se cargan automáticamente al registrar trabajos en este lote.</p>
          )}
        </div>
      </Seccion>

      {modalEditar  && <FormLote inicial={lote} onGuardar={async d=>{const act={...lote,...d};await updateLote(act);onActualizar(act);setModalEditar(false)}} onCerrar={()=>setModalEditar(false)}/>}
      {modalCosecha && <FormCosecha lote={lote} trabajos={trabajos} onGuardar={guardarCosecha} onCerrar={()=>setModalCosecha(false)}/>}
    </div>
  )
}

export default function Lotes({ userId }) {
  const [lotes,    setLotes]    = useState([])
  const [trabajos, setTrabajos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [detalle,  setDetalle]  = useState(null)
  const [eliminar, setEliminar] = useState(null)

  useEffect(() => {
    Promise.all([getLotes(userId),getTrabajos(userId)])
      .then(([l,t])=>{setLotes(l);setTrabajos(t);setLoading(false)})
  }, [userId])

  if (loading) return <Spinner texto="Cargando lotes..."/>

  const agregar = async (datos) => {
    const nuevo = await addLote(userId,{...datos,gastos:[],cosecha:null})
    if (nuevo) setLotes(prev=>[...prev,nuevo])
    setModal(false)
  }

  const actualizar = async (loteAct) => {
    await updateLote(loteAct)
    setLotes(prev=>prev.map(l=>l.id===loteAct.id?loteAct:l))
    setDetalle(loteAct)
  }

  const confirmarEliminar = async () => {
    await deleteLote(eliminar.id)
    setLotes(prev=>prev.filter(l=>l.id!==eliminar.id))
    setEliminar(null); setDetalle(null)
  }

  if (detalle) return <DetalleLote lote={detalle} trabajos={trabajos} onVolver={()=>setDetalle(null)} onActualizar={actualizar}/>

  const totalHa         = lotes.reduce((s,l)=>s+(l.ha||0),0)
  const lotesCosechados = lotes.map(l=>({l,r:calcRentabilidadLote(l,trabajos)})).filter(({r})=>!r.sinCosecha)
  const totalGanancia   = lotesCosechados.reduce((s,{r})=>s+r.gananciaTotal,0)
  const rentables       = lotesCosechados.filter(({r})=>r.rentable).length
  const estadoColors    = {"Cosechado":"emerald","Listo para cosechar":"amber","En crecimiento":"sky","Sembrado":"blue","En preparación":"white"}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Lotes</h2>
          <p className="text-sm text-white/30 mt-0.5">{lotes.length} lotes · {totalHa.toLocaleString()} ha</p>
        </div>
        <BtnPrimario onClick={()=>setModal(true)}>+ Nuevo lote</BtnPrimario>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Lotes activos"   value={lotes.length}                                                color="text-white"       />
        <KpiCard label="Hectáreas"       value={`${totalHa.toLocaleString()} ha`}                            color="text-sky-400"     />
        <KpiCard label="Lotes rentables" value={rentables}                                                   color="text-emerald-400" />
        <KpiCard label="Ganancia neta"   value={`${totalGanancia>=0?"+":""}${formatPeso(totalGanancia)}`}    color={lotesCosechados.length===0?"text-white/30":totalGanancia>=0?"text-emerald-400":"text-red-400"} />
      </div>

      {lotes.length===0
        ? <div className="rounded-2xl border border-white/8 bg-white/3">
            <Vacio icon="🗺️" titulo="No hay lotes registrados" sub="Creá un lote para empezar a registrar costos y calcular rentabilidad."
              accion={<BtnPrimario onClick={()=>setModal(true)}>+ Crear primer lote</BtnPrimario>}/>
          </div>
        : <div className="space-y-3">
            {lotes.map(lote=>{
              const rent = calcRentabilidadLote(lote,trabajos)
              return (
                <div key={lote.id} className="rounded-2xl border border-white/8 bg-white/3 p-4 cursor-pointer hover:border-white/15 transition-all active:bg-white/5"
                  onClick={()=>setDetalle(lote)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-white font-bold">{lote.nombre}</p>
                        <Badge color={estadoColors[lote.estado]||"white"}>{lote.estado}</Badge>
                      </div>
                      <p className="text-white/35 text-xs">{lote.productor} · {lote.cultivo} · {lote.ha} ha · {lote.campaña}</p>
                    </div>
                    <BtnIcono onClick={e=>{e.stopPropagation();setEliminar(lote)}} icon="🗑️" danger/>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div><p className="text-white/25">Costo total</p><p className="text-red-400 font-semibold">{formatPeso(rent.costoTotal)}</p></div>
                    <div><p className="text-white/25">Costo/ha</p><p className="text-white font-semibold">{formatPeso(rent.costoPorHa)}</p></div>
                    <div><p className="text-white/25">Combustible</p><p className="text-amber-400 font-semibold">{formatPeso(rent.comb?.monto||0)}</p></div>
                  </div>

                  {!rent.sinCosecha
                    ? <div className={`rounded-xl p-3 flex justify-between items-center ${rent.rentable?"bg-emerald-500/8 border border-emerald-500/20":"bg-red-500/8 border border-red-500/20"}`}>
                        <div>
                          <p className="text-xs text-white/25 mb-0.5">Ganancia/ha</p>
                          <p className={`font-black text-xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.rentable?"+":""}{formatPeso(rent.gananciaPorHa)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white/25 mb-0.5">Margen</p>
                          <p className={`font-black text-xl ${rent.rentable?"text-emerald-400":"text-red-400"}`}>{rent.margen?.toFixed(1)}%</p>
                        </div>
                      </div>
                    : <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/15 flex items-center gap-2">
                        <span className="text-amber-400">⏳</span>
                        <p className="text-amber-400/70 text-xs">Sin cosecha — tocá para registrar</p>
                      </div>
                  }
                </div>
              )
            })}
          </div>
      }

      {modal    && <FormLote onGuardar={agregar} onCerrar={()=>setModal(false)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.nombre} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
