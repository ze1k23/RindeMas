Trabajos.jsx
import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Badge, Tabla, Tr, Td, Vacio, ConfirmarEliminar, Spinner } from "./UI"
import { calcCostoTrabajo, filtrarMaquinas, formatPeso, TIPOS_TRABAJO, GASTOS_POR_TIPO, calcGastosExtra } from "../utils"
import { getTrabajos, addTrabajo, updateTrabajo, deleteTrabajo, getLotes, getMaquinas, updateLote } from "../db"
import { getPrecioCereal } from "../gemini"

// ─── SECCIÓN GASTOS EXTRA ─────────────────────────────────────────────────────
function SeccionGastos({ tipo, ha, extras, onChange }) {
  const campos = GASTOS_POR_TIPO[tipo] || []
  if (campos.length === 0) return null
  const titulos = { "Siembra":"🌱 Datos de siembra", "Fumigacion":"🧪 Productos aplicados", "Fertilizacion":"💊 Fertilizantes", "Cosecha":"🚛 Costos adicionales" }
  const costoExtra = calcGastosExtra(tipo, { ...extras, _ha: ha })
  return (
    <div className="border-t border-white/8 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white/35">{titulos[tipo]}</p>
        {costoExtra > 0 && <span className="text-xs text-emerald-400 font-bold">Total: {formatPeso(costoExtra)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {campos.map(c => (
          <Campo key={c.id} label={c.label} hint={!c.requerido?"Opcional":undefined}>
            <input className={IC} type={c.tipo==="numero"?"number":"text"} min={c.tipo==="numero"?"0":undefined}
              placeholder={c.placeholder} value={extras[c.id]||""}
              onChange={e => onChange({ ...extras, [c.id]: e.target.value })}/>
          </Campo>
        ))}
      </div>
    </div>
  )
}

// ─── FORMULARIO ──────────────────────────────────────────────────────────────
function FormTrabajo({ inicial, maquinas, lotes, onGuardar, onCerrar }) {
  const hoy  = new Date().toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
  const vacio = { fecha:hoy, maquina:"", tipo:"Siembra", lote:"", cultivo:"", ha:"", horas:"", litros:"", precioGasoil:1350, rinde:"", precioCereal:"", extras:{} }

  const [form, setForm] = useState(inicial ? {
    ...vacio, ...inicial,
    ha: inicial.ha?.toString(), horas: inicial.horas?.toString(),
    litros: inicial.litros?.toString(), rinde: inicial.rinde?.toString()||"",
    precioCereal: inicial.precioCereal?.toString()||"", extras: inicial.extras||{}
  } : vacio)

  const [buscandoPrecio, setBuscandoPrecio] = useState(false)

  const set = (k, v) => setForm(prev => {
    const n = { ...prev, [k]: v }
    if (k==="tipo") { n.maquina=""; n.extras={} }
    if (k==="lote") {
      const l = lotes.find(l => l.nombre===v)
      if (l) n.cultivo = l.cultivo
    }
    return n
  })

  const maquinasPermitidas = filtrarMaquinas(maquinas, form.tipo)
  const esCosecha = form.tipo === "Cosecha"
  const ha       = parseFloat(form.ha)          || 0
  const litros   = parseFloat(form.litros)       || 0
  const precio   = parseFloat(form.precioGasoil) || 0
  const rinde    = parseFloat(form.rinde)        || 0
  const precCer  = parseFloat(form.precioCereal) || 0
  const costoExtras = calcGastosExtra(form.tipo, { ...form.extras, _ha: ha })
  const costoComb   = litros * precio
  const costoTotal  = costoComb + costoExtras
  const costoPorHa  = ha > 0 ? costoTotal / ha : 0
  const ingBruto    = rinde * precCer
  const ganancia    = ingBruto - costoPorHa

  const buscarPrecio = async () => {
    setBuscandoPrecio(true)
    const p = await getPrecioCereal(form.cultivo || "Soja")
    if (p) set("precioCereal", p.toString())
    else alert("No se pudo obtener el precio automáticamente. Ingresalo manualmente.")
    setBuscandoPrecio(false)
  }

  const guardar = () => {
    if (!form.lote)    { alert("Seleccioná un lote."); return }
    if (!form.maquina) { alert("Seleccioná una máquina."); return }
    if (!ha||ha<=0)    { alert("Ingresá las hectáreas."); return }
    if (!litros)       { alert("Ingresá los litros."); return }
    if (esCosecha && (!rinde||!precCer)) { alert("Para cosecha, ingresá rinde y precio del cereal."); return }
    onGuardar({
      ...(inicial||{}), ...form,
      ha, horas: parseFloat(form.horas)||0, litros, precioGasoil: precio,
      gastoExtra: costoExtras,
      rinde:        esCosecha ? rinde   : null,
      precioCereal: esCosecha ? precCer : null,
      extras: form.extras,
    })
  }

  return (
    <Modal titulo={inicial?"Editar trabajo":"Registrar trabajo"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar cambios":"Guardar trabajo"}</BtnPrimario></>}>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Fecha"><input className={IC} value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Campo>
        <Campo label="Tipo de trabajo">
          <select className={SC} value={form.tipo} onChange={e=>set("tipo",e.target.value)}>
            {TIPOS_TRABAJO.map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Lote">
          {lotes.length>0
            ? <select className={SC} value={form.lote} onChange={e=>set("lote",e.target.value)}>
                <option value="">— Seleccioná un lote —</option>
                {lotes.map(l=><option key={l.id} value={l.nombre}>{l.nombre} ({l.cultivo} · {l.ha} ha)</option>)}
              </select>
            : <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-amber-400">Creá un lote primero en Lotes</div>}
        </Campo>
        <Campo label="Cultivo">
          <input className={IC} readOnly value={form.cultivo} placeholder="Se completa al elegir el lote" style={{opacity:0.6,cursor:"default"}}/>
        </Campo>
      </div>

      <Campo label="Máquina">
        {maquinas.length===0
          ? <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-400">Agregá máquinas primero en Flota</div>
          : maquinasPermitidas.length===0
            ? <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-amber-400">No tenés máquinas compatibles con "{form.tipo}"</div>
            : <select className={SC} value={form.maquina} onChange={e=>set("maquina",e.target.value)}>
                <option value="">— Seleccioná una máquina —</option>
                {maquinasPermitidas.map(m=><option key={m.id} value={m.nombre}>{m.nombre} ({m.tipo})</option>)}
              </select>}
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Hectáreas trabajadas"><input className={IC} type="number" min="0.1" placeholder="ej: 150" value={form.ha} onChange={e=>set("ha",e.target.value)}/></Campo>
        <Campo label="Horas trabajadas"><input className={IC} type="number" min="0" placeholder="ej: 8" value={form.horas} onChange={e=>set("horas",e.target.value)}/></Campo>
      </div>

      <div className="border-t border-white/8 pt-4">
        <p className="text-xs text-white/25 uppercase tracking-wider mb-3">⛽ Combustible</p>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Litros consumidos"><input className={IC} type="number" min="0" placeholder="ej: 360" value={form.litros} onChange={e=>set("litros",e.target.value)}/></Campo>
          <Campo label="Precio gasoil ($/L)"><input className={IC} type="number" min="0" value={form.precioGasoil} onChange={e=>set("precioGasoil",e.target.value)}/></Campo>
        </div>
      </div>

      <SeccionGastos tipo={form.tipo} ha={ha} extras={form.extras} onChange={v=>set("extras",v)}/>

      {esCosecha && (
        <div className="border-t border-emerald-500/20 pt-4">
          <p className="text-xs text-emerald-400/60 uppercase tracking-wider mb-3 font-bold">🌾 Resultado de cosecha</p>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Rinde (kg/ha)" hint="kilos por hectárea">
              <input className={IC} type="number" min="0" placeholder="ej: 3200" value={form.rinde} onChange={e=>set("rinde",e.target.value)}/>
            </Campo>
            <Campo label="Precio cereal ($/kg)">
              <div className="flex gap-2">
                <input className={IC} type="number" min="0" placeholder="ej: 380" value={form.precioCereal} onChange={e=>set("precioCereal",e.target.value)}/>
                <button onClick={buscarPrecio} disabled={buscandoPrecio}
                  className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all shrink-0 disabled:opacity-40"
                  title="Buscar precio actual con IA">
                  {buscandoPrecio ? "..." : "🤖"}
                </button>
              </div>
              {form.precioCereal && <p className="text-xs text-white/25 mt-1">💡 Verificá con tu acopio antes de usar</p>}
            </Campo>
          </div>
        </div>
      )}

      {litros>0 && ha>0 && (
        <div className={`rounded-xl p-4 border ${esCosecha&&rinde>0&&precCer>0?(ganancia>=0?"bg-emerald-500/5 border-emerald-500/20":"bg-red-500/5 border-red-500/20"):"bg-white/4 border-white/8"}`}>
          <p className="text-xs text-white/25 uppercase tracking-wider mb-2 font-bold">Resumen</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-white/25">Combustible</p><p className="text-white font-semibold">{formatPeso(costoComb)}</p></div>
            {costoExtras>0&&<div><p className="text-xs text-white/25">Insumos</p><p className="text-sky-400 font-semibold">{formatPeso(costoExtras)}</p></div>}
            <div><p className="text-xs text-white/25">Costo total</p><p className="text-white font-bold">{formatPeso(costoTotal)}</p></div>
            <div><p className="text-xs text-white/25">Costo/ha</p><p className="text-white font-bold">{formatPeso(costoPorHa)}</p></div>
            {esCosecha&&rinde>0&&precCer>0&&<>
              <div><p className="text-xs text-white/25">Ingreso bruto/ha</p><p className="text-sky-400 font-bold">{formatPeso(ingBruto)}</p></div>
              <div><p className="text-xs text-white/25">Ganancia/ha</p><p className={`font-black text-lg ${ganancia>=0?"text-emerald-400":"text-red-400"}`}>{ganancia>=0?"+":""}{formatPeso(ganancia)}</p></div>
            </>}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Trabajos({ userId }) {
  const [trabajos,  setTrabajos]  = useState([])
  const [lotes,     setLotes]     = useState([])
  const [maquinas,  setMaquinas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [eliminar,  setEliminar]  = useState(null)
  const [filtro,    setFiltro]    = useState("Todos")


  useEffect(() => {
    Promise.all([getTrabajos(userId), getLotes(userId), getMaquinas(userId)])
      .then(([t, l, m]) => { setTrabajos(t); setLotes(l); setMaquinas(m); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando trabajos..." />

  // Calcula el estado del lote según los trabajos registrados
  const calcEstadoLote = (nombreLote, trabajosActuales) => {
    const tLote = trabajosActuales.filter(t => t.lote === nombreLote).map(t => t.tipo)
    if (tLote.includes("Cosecha"))                                          return "Cosechado"
    if (tLote.some(t => t === "Fumigacion" || t === "Fertilizacion"))       return "En crecimiento"
    if (tLote.includes("Siembra"))                                          return "Sembrado"
    if (tLote.includes("Labranza"))                                         return "En preparación"
    return null // sin cambio
  }

  const guardar = async (datos) => {
    if (modal === "nuevo") {
      const nuevo = await addTrabajo(userId, datos)
      if (nuevo) {
        setTrabajos(prev => [nuevo, ...prev])
      }
    } else {
      const act = { ...modal, ...datos }
      await updateTrabajo(act)
      setTrabajos(prev => prev.map(t => t.id===modal.id ? act : t))
    }
    // Actualizamos el estado del lote según los trabajos registrados
    const todosTrabajos = modal === "nuevo"
      ? [...trabajos, { ...datos }]
      : trabajos.map(t => t.id === modal.id ? { ...t, ...datos } : t)

    const loteAct = lotes.find(l => l.nombre === datos.lote)
    if (loteAct) {
      const nuevoEstado = calcEstadoLote(datos.lote, todosTrabajos)
      const cosechaAct  = datos.tipo === "Cosecha" && datos.rinde && datos.precioCereal
        ? { rinde: datos.rinde, precioCereal: datos.precioCereal, fecha: datos.fecha }
        : loteAct.cosecha

      if (nuevoEstado || cosechaAct !== loteAct.cosecha) {
        const loteActualizado = {
          ...loteAct,
          ...(nuevoEstado ? { estado: nuevoEstado } : {}),
          ...(cosechaAct !== loteAct.cosecha ? { cosecha: cosechaAct } : {}),
        }
        await updateLote(loteActualizado)
        setLotes(prev => prev.map(l => l.id === loteAct.id ? loteActualizado : l))
      }
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteTrabajo(eliminar.id)
    setTrabajos(prev => prev.filter(t => t.id !== eliminar.id))
    setEliminar(null)
  }


  const filtrados  = filtro==="Todos" ? trabajos : trabajos.filter(t=>t.tipo===filtro)
  const totalHa    = trabajos.reduce((s,t)=>s+(t.ha||0),0)
  const totalLit   = trabajos.reduce((s,t)=>s+(t.litros||0),0)
  const totalCosto = trabajos.reduce((s,t)=>s+calcCostoTrabajo(t),0)
  const promPorHa  = totalHa>0 ? totalCosto/totalHa : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Trabajos de Campo</h2>
          <p className="text-sm text-white/30 mt-0.5">{trabajos.length} trabajos registrados</p></div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Registrar trabajo</BtnPrimario>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Hectáreas"     value={`${totalHa.toLocaleString()} ha`} color="text-sky-400"    />
        <KpiCard label="Gasoil total"  value={`${totalLit.toLocaleString()} L`} color="text-orange-400" />
        <KpiCard label="Costo total"   value={formatPeso(totalCosto)}            color="text-red-400"    />
        <KpiCard label="Costo/ha prom" value={formatPeso(promPorHa)}             color="text-emerald-400"/>
      </div>



      <div className="flex gap-2 flex-wrap">
            {["Todos",...TIPOS_TRABAJO].map(tipo=>(
              <button key={tipo} onClick={()=>setFiltro(tipo)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filtro===tipo?"bg-emerald-500 text-white":"bg-white/4 text-white/35 hover:text-white/60 border border-white/8"}`}>{tipo}</button>
            ))}
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
            <Tabla headers={["Fecha","Máquina","Tipo","Lote","Ha","Insumos","Comb.","Total/ha",""]}
              vacio={filtrados.length===0&&<Vacio icon="🌾" titulo="No hay trabajos registrados"/>}>
              {filtrados.map(t=>{
                const comb=((t.litros||0)*(t.precioGasoil||0)), ins=t.gastoExtra||0
                const total=comb+ins, cPorHa=(t.ha||0)>0?total/(t.ha||1):0
                return (
                  <Tr key={t.id} highlight={t.tipo==="Cosecha"}>
                    <Td muted mono>{t.fecha}</Td>
                    <Td bold>{t.maquina}</Td>
                    <Td><Badge color={t.tipo==="Cosecha"?"emerald":"white"}>{t.tipo}</Badge></Td>
                    <Td muted>{t.lote}</Td>
                    <Td mono>{t.ha}</Td>
                    <Td mono color={ins>0?"text-sky-400":"text-white/25"}>{ins>0?formatPeso(ins):"—"}</Td>
                    <Td muted mono>{formatPeso(comb)}</Td>
                    <Td bold color="text-emerald-400">{formatPeso(cPorHa)}</Td>
                    <td className="px-5 py-3"><div className="flex gap-1">
                      <BtnIcono onClick={()=>setModal(t)} icon="✏️" title="Editar"/>
                      <BtnIcono onClick={()=>setEliminar(t)} icon="🗑️" title="Eliminar" danger/>
                    </div></td>
                  </Tr>
                )
              })}
            </Tabla>
          </div>


      {modal    && <FormTrabajo inicial={modal!=="nuevo"?modal:null} maquinas={maquinas} lotes={lotes} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={`${eliminar.tipo} en ${eliminar.lote}`} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}