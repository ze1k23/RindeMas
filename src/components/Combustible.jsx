import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Tabla, Tr, Td, Seccion, Vacio, ConfirmarEliminar, Spinner } from "./UI"
import { formatPeso } from "../utils"
import { getCombustible, addCombustible, updateCombustible, deleteCombustible, getMaquinas } from "../db"

function FormCarga({ inicial, maquinas, onGuardar, onCerrar }) {
  const hoy  = new Date().toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
  const vacio = { fecha:hoy, maquina:maquinas[0]?.nombre||"", litros:"", precio:1350, proveedor:"", notas:"" }
  const [form, setForm] = useState(inicial ? { ...inicial, litros:inicial.litros?.toString(), precio:inicial.precio?.toString() } : vacio)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const litros = parseFloat(form.litros)||0, precio = parseFloat(form.precio)||0
  const guardar = () => {
    if (!form.maquina)    { alert("Seleccioná una máquina."); return }
    if (!litros||litros<=0){ alert("Ingresá los litros."); return }
    if (!precio||precio<=0){ alert("Ingresá el precio por litro."); return }
    onGuardar({ ...(inicial||{}), ...form, litros, precio })
  }
  return (
    <Modal titulo={inicial?"Editar carga":"Registrar carga de gasoil"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar} color="orange">{inicial?"Guardar cambios":"Guardar carga"}</BtnPrimario></>}>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Fecha"><input className={IC} value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Campo>
        <Campo label="Máquina">
          {maquinas.length>0
            ? <select className={SC} value={form.maquina} onChange={e=>set("maquina",e.target.value)}>
                {maquinas.map(m=><option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
            : <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-400">Agregá máquinas primero</div>}
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Litros cargados"><input className={IC} type="number" min="1" placeholder="ej: 500" value={form.litros} onChange={e=>set("litros",e.target.value)}/></Campo>
        <Campo label="Precio por litro ($)"><input className={IC} type="number" min="1" value={form.precio} onChange={e=>set("precio",e.target.value)}/></Campo>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Proveedor (opcional)"><input className={IC} placeholder="ej: YPF Agro" value={form.proveedor} onChange={e=>set("proveedor",e.target.value)}/></Campo>
        <Campo label="Notas (opcional)"><input className={IC} placeholder="observaciones" value={form.notas} onChange={e=>set("notas",e.target.value)}/></Campo>
      </div>
      {litros>0 && precio>0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex justify-between items-center">
          <div><p className="text-xs text-orange-400/60 uppercase tracking-wider font-bold">Total de la carga</p>
            <p className="text-orange-400 font-black text-2xl mt-1">{formatPeso(litros*precio)}</p></div>
          <div className="text-right"><p className="text-xs text-white/25">Litros</p><p className="text-white font-bold">{litros.toLocaleString()} L</p></div>
        </div>
      )}
    </Modal>
  )
}

export default function Combustible({ userId }) {
  const [cargas,   setCargas]   = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [eliminar, setEliminar] = useState(null)

  useEffect(() => {
    Promise.all([getCombustible(userId), getMaquinas(userId)])
      .then(([c, m]) => { setCargas(c); setMaquinas(m); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando combustible..." />

  const guardar = async (datos) => {
    if (modal==="nuevo") {
      const nueva = await addCombustible(userId, datos)
      if (nueva) setCargas(prev => [nueva, ...prev])
    } else {
      const act = { ...modal, ...datos }
      await updateCombustible(act)
      setCargas(prev => prev.map(c => c.id===modal.id ? act : c))
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteCombustible(eliminar.id)
    setCargas(prev => prev.filter(c => c.id !== eliminar.id))
    setEliminar(null)
  }

  const totalLitros    = cargas.reduce((s,c)=>s+(c.litros||0),0)
  const totalGasto     = cargas.reduce((s,c)=>s+(c.litros||0)*(c.precio||0),0)
  const precioUltimo   = cargas.length>0 ? cargas[0].precio : 0
  const precioPromedio = totalLitros>0 ? totalGasto/totalLitros : 0

  const porMaquina = cargas.reduce((acc,c) => {
    if (!acc[c.maquina]) acc[c.maquina] = { litros:0, gasto:0, cargas:0 }
    acc[c.maquina].litros += c.litros||0
    acc[c.maquina].gasto  += (c.litros||0)*(c.precio||0)
    acc[c.maquina].cargas += 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Control de Combustible</h2>
          <p className="text-sm text-white/30 mt-0.5">{cargas.length} cargas registradas</p></div>
        <BtnPrimario onClick={()=>setModal("nuevo")} color="orange">+ Registrar carga</BtnPrimario>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Litros cargados"  value={`${totalLitros.toLocaleString()} L`} color="text-orange-400" />
        <KpiCard label="Gasto total"      value={formatPeso(totalGasto)}               color="text-red-400"    />
        <KpiCard label="Precio promedio"  value={`${formatPeso(precioPromedio)}/L`}    color="text-amber-400"  />
        <KpiCard label="Precio último"    value={`${formatPeso(precioUltimo)}/L`}      color="text-white"      />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
          <Tabla headers={["Fecha","Máquina","Litros","$/L","Total","Proveedor",""]}
            vacio={cargas.length===0&&<Vacio icon="⛽" titulo="No hay cargas registradas"/>}>
            {cargas.map(c=>(
              <Tr key={c.id}>
                <Td muted mono>{c.fecha}</Td>
                <Td bold>{c.maquina}</Td>
                <Td bold color="text-orange-400">{(c.litros||0).toLocaleString()} L</Td>
                <Td muted mono>{formatPeso(c.precio)}</Td>
                <Td mono>{formatPeso((c.litros||0)*(c.precio||0))}</Td>
                <Td muted>{c.proveedor||"—"}</Td>
                <td className="px-5 py-3"><div className="flex gap-1">
                  <BtnIcono onClick={()=>setModal(c)} icon="✏️" title="Editar"/>
                  <BtnIcono onClick={()=>setEliminar(c)} icon="🗑️" title="Eliminar" danger/>
                </div></td>
              </Tr>
            ))}
          </Tabla>
        </div>

        <Seccion titulo="Por máquina">
          {Object.keys(porMaquina).length===0
            ? <p className="px-5 py-8 text-center text-white/25 text-sm">Sin datos</p>
            : <div className="divide-y divide-white/5">
                {Object.entries(porMaquina).sort((a,b)=>b[1].litros-a[1].litros).map(([maq,datos])=>(
                  <div key={maq} className="px-5 py-3">
                    <p className="text-white font-semibold text-sm mb-2">{maq}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-white/25">Litros</span><span className="text-orange-400 font-bold">{datos.litros.toLocaleString()} L</span></div>
                      <div className="flex justify-between text-xs"><span className="text-white/25">Gasto</span><span className="text-white font-mono">{formatPeso(datos.gasto)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-white/25">Cargas</span><span className="text-white/40">{datos.cargas}</span></div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Seccion>
      </div>

      {modal    && <FormCarga inicial={modal!=="nuevo"?modal:null} maquinas={maquinas} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={`Carga del ${eliminar.fecha}`} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
