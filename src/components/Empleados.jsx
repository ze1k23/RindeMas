import { useState, useEffect } from "react"
import { Modal, Campo, IC, BtnPrimario, BtnSecundario, BtnIcono, KpiCard, Badge, Vacio, ConfirmarEliminar, Spinner, Seccion } from "./UI"
import { getEmpleados, addEmpleado, updateEmpleado, deleteEmpleado } from "../db"

function Toggle({ value, onChange, label, sub }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer" onClick={()=>onChange(!value)}>
      <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${value?"bg-emerald-500":"bg-white/10"}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value?"left-6":"left-1"}`}/>
      </div>
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {sub && <p className="text-xs text-white/30">{sub}</p>}
      </div>
    </label>
  )
}

function FormEmpleado({ inicial, onGuardar, onCerrar }) {
  const v = { nombre:"", telefono:"", activo:true, recibeNotificaciones:false }
  const [form, setForm] = useState(inicial
    ? { ...inicial, telefono:inicial.telefono?.replace(/[^0-9]/g,"") }
    : v)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const guardar = () => {
    if (!form.nombre.trim())       { alert("Ingresá el nombre."); return }
    if (!form.telefono.trim())     { alert("Ingresá el número de WhatsApp."); return }
    if (form.telefono.length < 10) { alert("El número parece muy corto. Ejemplo: 5491123456789"); return }
    onGuardar(form)
  }

  return (
    <Modal titulo={inicial?"Editar empleado":"Nuevo empleado"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial?"Guardar":"Agregar"}</BtnPrimario></>}>

      <Campo label="Nombre completo">
        <input className={IC} placeholder="ej: Juan Pérez" value={form.nombre} onChange={e=>set("nombre",e.target.value)}/>
      </Campo>

      <Campo label="Número de WhatsApp" hint="Con código de país, sin espacios ni +. Ej: 5491123456789">
        <input className={IC} placeholder="5491123456789" inputMode="numeric"
          value={form.telefono} onChange={e=>set("telefono",e.target.value.replace(/[^0-9]/g,""))}/>
      </Campo>

      <div className="space-y-4 pt-2">
        <Toggle value={form.recibeNotificaciones} onChange={v=>set("recibeNotificaciones",v)}
          label="Recibe notificaciones de pedidos"
          sub="Le llega un WhatsApp cuando alguien pide un repuesto"/>
        {inicial && (
          <Toggle value={form.activo} onChange={v=>set("activo",v)}
            label="Empleado activo"
            sub="Puede pedir repuestos por WhatsApp"/>
        )}
      </div>
    </Modal>
  )
}

export default function Empleados({ userId }) {
  const [empleados, setEmpleados] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [eliminar,  setEliminar]  = useState(null)

  useEffect(() => {
    getEmpleados(userId).then(d=>{ setEmpleados(d); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando empleados..."/>

  const guardar = async (datos) => {
    // Solo un empleado puede recibir notificaciones
    if (datos.recibeNotificaciones) {
      const otros = empleados.filter(e => e.id !== (modal !== "nuevo" ? modal.id : null) && e.recibeNotificaciones)
      for (const e of otros) await updateEmpleado({ ...e, recibeNotificaciones:false })
      setEmpleados(prev => prev.map(e => ({ ...e, recibeNotificaciones:false })))
    }

    if (modal === "nuevo") {
      const nuevo = await addEmpleado(userId, datos)
      if (nuevo) setEmpleados(prev=>[...prev, nuevo])
    } else {
      const act = { ...modal, ...datos }
      await updateEmpleado(act)
      setEmpleados(prev=>prev.map(e=>e.id===modal.id?act:e))
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteEmpleado(eliminar.id)
    setEmpleados(prev=>prev.filter(e=>e.id!==eliminar.id))
    setEliminar(null)
  }

  const activos    = empleados.filter(e=>e.activo).length
  const notificador= empleados.find(e=>e.recibeNotificaciones)

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Empleados</h2>
          <p className="text-sm text-white/30 mt-0.5">Números autorizados para pedir repuestos</p>
        </div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Agregar</BtnPrimario>
      </div>

      {/* Cómo funciona */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">¿Cómo funciona?</p>
        <div className="space-y-1.5 text-sm text-white/50">
          <p>1. El empleado manda un WhatsApp al número del bot describiendo lo que necesita</p>
          <p>2. El bot interpreta el mensaje con IA y registra el pedido automáticamente</p>
          <p>3. Le llega una notificación al encargado de compras</p>
          <p>4. El pedido aparece en la pestaña de Repuestos para ser gestionado</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Empleados activos"   value={activos}                       color="text-emerald-400"/>
        <KpiCard label="Recibe notificaciones" value={notificador?.nombre || "—"}  color="text-sky-400"    />
      </div>

      {empleados.length === 0
        ? <div className="rounded-2xl border border-white/8 bg-white/3">
            <Vacio icon="👥" titulo="Sin empleados registrados"
              sub="Agregá los números de WhatsApp de tus empleados para que puedan pedir repuestos."
              accion={<BtnPrimario onClick={()=>setModal("nuevo")}>+ Agregar empleado</BtnPrimario>}/>
          </div>
        : <div className="space-y-3">
            {empleados.map(e=>(
              <div key={e.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-white font-bold">{e.nombre}</p>
                      <Badge color={e.activo?"emerald":"red"}>{e.activo?"Activo":"Inactivo"}</Badge>
                      {e.recibeNotificaciones && <Badge color="sky">📱 Notificaciones</Badge>}
                    </div>
                    <p className="text-white/35 text-sm font-mono">{e.telefono}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <BtnIcono onClick={()=>setModal(e)} icon="✏️" title="Editar"/>
                    <BtnIcono onClick={()=>setEliminar(e)} icon="🗑️" danger/>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }

      {modal    && <FormEmpleado inicial={modal!=="nuevo"?modal:null} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.nombre} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}
