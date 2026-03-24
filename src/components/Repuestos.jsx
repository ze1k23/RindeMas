import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Badge, Vacio, ConfirmarEliminar, Spinner, Seccion } from "./UI"
import { getRepuestos, addRepuesto, updateRepuesto, deleteRepuesto, getMaquinas } from "../db"
import { formatPeso } from "../utils"

// ─── MODAL MARCAR COMO COMPRADO ───────────────────────────────────────────────
function FormCompra({ repuesto, onGuardar, onCerrar }) {
  const hoy = new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"})
  const [costoReal, setCostoReal] = useState(repuesto.costoReal?.toString() || "")
  const [proveedor, setProveedor] = useState(repuesto.proveedor || "")
  const [fecha,     setFecha]     = useState(hoy)
  const [notas,     setNotas]     = useState(repuesto.notas || "")

  const guardar = () => {
    if (!costoReal || parseFloat(costoReal) < 0) { alert("Ingresá el costo real."); return }
    onGuardar({ costoReal:parseFloat(costoReal), proveedor, fechaCompra:fecha, notas })
  }

  return (
    <Modal titulo="Marcar como comprado" subtitulo={`${repuesto.descripcion} · ${repuesto.maquinaNombre}`} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar} color="emerald">Confirmar compra</BtnPrimario></>}>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-sm text-white/50">
        Pedido: <span className="text-white font-semibold">{repuesto.cantidad}x {repuesto.descripcion}</span> para <span className="text-white font-semibold">{repuesto.maquinaNombre}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Costo real ($)" hint="Lo que pagaste">
          <input className={IC} type="number" min="0" placeholder="ej: 15000" value={costoReal} onChange={e=>setCostoReal(e.target.value)}/>
        </Campo>
        <Campo label="Fecha de compra">
          <input className={IC} value={fecha} onChange={e=>setFecha(e.target.value)}/>
        </Campo>
      </div>
      <Campo label="Proveedor (opcional)">
        <input className={IC} placeholder="ej: Casa del Repuesto SA" value={proveedor} onChange={e=>setProveedor(e.target.value)}/>
      </Campo>
      <Campo label="Notas (opcional)">
        <input className={IC} placeholder="observaciones" value={notas} onChange={e=>setNotas(e.target.value)}/>
      </Campo>

      {costoReal && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-3 flex justify-between items-center">
          <p className="text-white/40 text-sm">Costo total del repuesto</p>
          <p className="text-white font-black text-lg">{formatPeso(parseFloat(costoReal)||0)}</p>
        </div>
      )}
    </Modal>
  )
}

// ─── MODAL NUEVO REPUESTO MANUAL ──────────────────────────────────────────────
function FormRepuesto({ inicial, maquinas, onGuardar, onCerrar }) {
  const hoy = new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"})
  const v   = { maquinaNombre:"", descripcion:"", cantidad:"1", costoEstimado:"", fechaPedido:hoy, notas:"" }
  const [form, setForm] = useState(inicial
    ? { ...inicial, cantidad:inicial.cantidad?.toString(), costoEstimado:inicial.costoEstimado?.toString() }
    : v)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const guardar = () => {
    if (!form.maquinaNombre.trim()) { alert("Seleccioná o escribí la máquina."); return }
    if (!form.descripcion.trim())   { alert("Describí el repuesto."); return }
    onGuardar({
      ...form,
      cantidad:      parseInt(form.cantidad)||1,
      costoEstimado: parseFloat(form.costoEstimado)||0,
    })
  }

  return (
    <Modal titulo={inicial?"Editar pedido":"Nuevo pedido de repuesto"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar":"Registrar pedido"}</BtnPrimario></>}>

      <Campo label="Máquina">
        {maquinas.length > 0
          ? <select className={SC} value={form.maquinaNombre} onChange={e=>set("maquinaNombre",e.target.value)}>
              <option value="">— Elegí una máquina —</option>
              {maquinas.map(m=><option key={m.id} value={m.nombre}>{m.nombre} ({m.tipo})</option>)}
              <option value="General">General (sin máquina específica)</option>
            </select>
          : <input className={IC} placeholder="Nombre de la máquina" value={form.maquinaNombre} onChange={e=>set("maquinaNombre",e.target.value)}/>
        }
      </Campo>

      <Campo label="Descripción del repuesto" hint="Sé lo más específico posible">
        <input className={IC} placeholder="ej: Filtro de aceite Donaldson P550248" value={form.descripcion} onChange={e=>set("descripcion",e.target.value)}/>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Cantidad">
          <input className={IC} type="number" min="1" value={form.cantidad} onChange={e=>set("cantidad",e.target.value)}/>
        </Campo>
        <Campo label="Costo estimado ($)" hint="Opcional">
          <input className={IC} type="number" min="0" placeholder="ej: 8000" value={form.costoEstimado} onChange={e=>set("costoEstimado",e.target.value)}/>
        </Campo>
      </div>

      <Campo label="Fecha del pedido">
        <input className={IC} value={form.fechaPedido} onChange={e=>set("fechaPedido",e.target.value)}/>
      </Campo>

      <Campo label="Notas (opcional)">
        <input className={IC} placeholder="cualquier observación" value={form.notas} onChange={e=>set("notas",e.target.value)}/>
      </Campo>
    </Modal>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Repuestos({ userId }) {
  const [repuestos, setRepuestos] = useState([])
  const [maquinas,  setMaquinas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // null | "nuevo" | repuesto
  const [comprar,   setComprar]   = useState(null)   // repuesto a marcar como comprado
  const [eliminar,  setEliminar]  = useState(null)
  const [filtro,    setFiltro]    = useState("pendientes") // "pendientes" | "comprados" | "todos"

  useEffect(() => {
    Promise.all([getRepuestos(userId), getMaquinas(userId)])
      .then(([r, m]) => { setRepuestos(r); setMaquinas(m); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando repuestos..."/>

  const guardarNuevo = async (datos) => {
    if (modal === "nuevo") {
      const nuevo = await addRepuesto(userId, { ...datos, origen:"manual", comprado:false })
      if (nuevo) setRepuestos(prev=>[nuevo, ...prev])
    } else {
      const act = { ...modal, ...datos }
      await updateRepuesto(act)
      setRepuestos(prev=>prev.map(r=>r.id===modal.id?act:r))
    }
    setModal(null)
  }

  const confirmarCompra = async ({ costoReal, proveedor, fechaCompra, notas }) => {
    const act = { ...comprar, comprado:true, costoReal, proveedor, fechaCompra, notas }
    await updateRepuesto(act)
    setRepuestos(prev=>prev.map(r=>r.id===comprar.id?act:r))
    setComprar(null)
  }

  const confirmarEliminar = async () => {
    await deleteRepuesto(eliminar.id)
    setRepuestos(prev=>prev.filter(r=>r.id!==eliminar.id))
    setEliminar(null)
  }

  const pendientes      = repuestos.filter(r=>!r.comprado)
  const comprados       = repuestos.filter(r=>r.comprado)
  const gastoPendiente  = pendientes.reduce((s,r)=>s+(r.costoEstimado||0),0)
  const gastoTotal      = comprados.reduce((s,r)=>s+(r.costoReal||0),0)

  const filtrados = filtro==="pendientes" ? pendientes : filtro==="comprados" ? comprados : repuestos

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Repuestos</h2>
          <p className="text-sm text-white/30 mt-0.5">{pendientes.length} pendientes · {comprados.length} comprados</p>
        </div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Pedido</BtnPrimario>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Pendientes"        value={pendientes.length}         color="text-amber-400"   />
        <KpiCard label="Costo estimado"    value={formatPeso(gastoPendiente)} color="text-red-400"    />
        <KpiCard label="Comprados"         value={comprados.length}          color="text-emerald-400" />
        <KpiCard label="Gasto real total"  value={formatPeso(gastoTotal)}    color="text-white"       />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { id:"pendientes", label:`Pendientes (${pendientes.length})` },
          { id:"comprados",  label:`Comprados (${comprados.length})`  },
          { id:"todos",      label:"Todos"                             },
        ].map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filtro===f.id?"bg-emerald-500 text-white":"bg-white/4 text-white/35 hover:text-white/60 border border-white/8"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0
        ? <div className="rounded-2xl border border-white/8 bg-white/3">
            <Vacio icon="🔧" titulo={filtro==="pendientes"?"No hay pedidos pendientes":"Sin repuestos"}
              sub={filtro==="pendientes"?"¡Todo al día! O agregá un pedido manualmente.":"Registrá pedidos de repuestos manualmente o por WhatsApp."}
              accion={filtro!=="comprados"&&<BtnPrimario onClick={()=>setModal("nuevo")}>+ Nuevo pedido</BtnPrimario>}/>
          </div>
        : <div className="space-y-3">
            {filtrados.map(r=>(
              <div key={r.id} className={`rounded-2xl border p-4 ${r.comprado?"border-white/8 bg-white/3":"border-amber-500/20 bg-amber-500/4"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-white font-bold truncate">{r.descripcion}</p>
                      <Badge color={r.comprado?"emerald":"amber"}>{r.comprado?"Comprado":"Pendiente"}</Badge>
                      {r.origen==="whatsapp" && <Badge color="sky">📱 WhatsApp</Badge>}
                    </div>
                    <p className="text-white/40 text-xs">
                      {r.maquinaNombre} · {r.cantidad}x · {r.fechaPedido}
                      {r.pedidoPor && ` · Pedido por: ${r.pedidoPor}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!r.comprado && <BtnIcono onClick={()=>setModal(r)} icon="✏️" title="Editar"/>}
                    <BtnIcono onClick={()=>setEliminar(r)} icon="🗑️" danger/>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-4 text-xs">
                    {!r.comprado && r.costoEstimado > 0 && (
                      <div><p className="text-white/25">Estimado</p><p className="text-amber-400 font-semibold">{formatPeso(r.costoEstimado)}</p></div>
                    )}
                    {r.comprado && (
                      <>
                        <div><p className="text-white/25">Costo real</p><p className="text-emerald-400 font-bold">{formatPeso(r.costoReal)}</p></div>
                        {r.proveedor && <div><p className="text-white/25">Proveedor</p><p className="text-white/60">{r.proveedor}</p></div>}
                        {r.fechaCompra && <div><p className="text-white/25">Comprado</p><p className="text-white/60">{r.fechaCompra}</p></div>}
                      </>
                    )}
                  </div>
                  {!r.comprado && (
                    <button onClick={()=>setComprar(r)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all shrink-0">
                      ✓ Marcar comprado
                    </button>
                  )}
                </div>

                {r.notas && <p className="text-white/25 text-xs mt-2 border-t border-white/5 pt-2">{r.notas}</p>}
              </div>
            ))}
          </div>
      }

      {modal   && <FormRepuesto inicial={modal!=="nuevo"?modal:null} maquinas={maquinas} onGuardar={guardarNuevo} onCerrar={()=>setModal(null)}/>}
      {comprar && <FormCompra repuesto={comprar} onGuardar={confirmarCompra} onCerrar={()=>setComprar(null)}/>}
      {eliminar&& <ConfirmarEliminar nombre={eliminar.descripcion} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
