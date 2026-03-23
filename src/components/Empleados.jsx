import { useState, useEffect } from "react"
import { Modal, Campo, IC, SC, BtnPrimario, BtnSecundario, BtnIcono, Tabla, Tr, Td, Badge, Vacio, ConfirmarEliminar, Spinner } from "./UI"
import { getEmpleados, addEmpleado, updateEmpleado, deleteEmpleado } from "../db"

function FormEmpleado({ inicial, empleados, onGuardar, onCerrar }) {
  const vacio = { nombre: "", telefono: "", activo: true, recibeNotificaciones: false }
  const [form, setForm] = useState(inicial ? {
    ...inicial,
    telefono: inicial.telefono.replace(/[^0-9]/g, ''),
    recibeNotificaciones: inicial.recibeNotificaciones || false
  } : vacio)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const guardar = () => {
    if (!form.nombre.trim()) { alert("Ingresá el nombre del empleado."); return }
    if (!form.telefono.trim()) { alert("Ingresá el número de WhatsApp (solo números, con código país)."); return }
    onGuardar({ ...form })
  }
  return (
    <Modal titulo={inicial ? "Editar empleado" : "Nuevo empleado"} onCerrar={onCerrar}
      footer={<><BtnSecundario onClick={onCerrar}>Cancelar</BtnSecundario><BtnPrimario onClick={guardar}>{inicial ? "Guardar" : "Agregar"}</BtnPrimario></>}>
      <Campo label="Nombre"><input className={IC} placeholder="ej: Juan Pérez" value={form.nombre} onChange={e=>set("nombre",e.target.value)}/></Campo>
      <Campo label="WhatsApp (con código país, sin espacios ni símbolos)">
        <input className={IC} placeholder="ej: 5491123456789" value={form.telefono} onChange={e=>set("telefono",e.target.value.replace(/[^0-9]/g, ''))}/>
      </Campo>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={form.recibeNotificaciones} onChange={e=>set("recibeNotificaciones", e.target.checked)} className="w-4 h-4"/>
        <label className="text-sm text-white/80">Recibe notificaciones de pedidos</label>
      </div>
      {inicial && (
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={form.activo} onChange={e=>set("activo",e.target.checked)} className="w-4 h-4"/>
          <label className="text-sm text-white/80">Activo (puede pedir repuestos)</label>
        </div>
      )}
    </Modal>
  )
}

export default function Empleados({ userId }) {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [eliminar, setEliminar] = useState(null)

  useEffect(() => {
    getEmpleados(userId).then(data => { setEmpleados(data); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando empleados..." />

  const guardar = async (datos) => {
    if (modal === "nuevo") {
      // Si el nuevo empleado recibe notificaciones, desactivar esa bandera en otros
      if (datos.recibeNotificaciones) {
        for (let e of empleados) {
          if (e.recibeNotificaciones) {
            await updateEmpleado({ ...e, recibeNotificaciones: false })
          }
        }
      }
      const nuevo = await addEmpleado(userId, datos)
      if (nuevo) setEmpleados(prev => [...prev, nuevo])
    } else {
      const act = { ...modal, ...datos }
      if (datos.recibeNotificaciones && !modal.recibeNotificaciones) {
        // Si se activa para este, desactivar en otros
        for (let e of empleados) {
          if (e.id !== modal.id && e.recibeNotificaciones) {
            await updateEmpleado({ ...e, recibeNotificaciones: false })
          }
        }
      }
      await updateEmpleado(act)
      setEmpleados(prev => prev.map(e => e.id === modal.id ? act : e))
    }
    setModal(null)
  }

  const confirmarEliminar = async () => {
    await deleteEmpleado(eliminar.id)
    setEmpleados(prev => prev.filter(e => e.id !== eliminar.id))
    setEliminar(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Empleados autorizados</h2>
          <p className="text-sm text-white/30 mt-0.5">Pueden pedir repuestos por WhatsApp</p></div>
        <BtnPrimario onClick={()=>setModal("nuevo")}>+ Agregar empleado</BtnPrimario>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <Tabla headers={["Nombre","Teléfono","Notif.","Estado","Acciones"]}
          vacio={empleados.length===0 && <Vacio icon="👥" titulo="Sin empleados" sub="Agregá números de WhatsApp autorizados."/>}>
          {empleados.map(e => (
            <Tr key={e.id}>
              <Td bold>{e.nombre}</Td>
              <Td muted>{e.telefono}</Td>
              <Td>{e.recibeNotificaciones && <span className="text-emerald-400">📱 Recibe</span>}</Td>
              <Td><Badge color={e.activo ? "emerald" : "red"}>{e.activo ? "Activo" : "Inactivo"}</Badge></Td>
              <td className="px-5 py-3"><div className="flex gap-1">
                <BtnIcono onClick={()=>setModal(e)} icon="✏️" title="Editar"/>
                <BtnIcono onClick={()=>setEliminar(e)} icon="🗑️" title="Eliminar" danger/>
              </div>``
                </td>
            </Tr>
          ))}
        </Tabla>
      </div>

      {modal && <FormEmpleado inicial={modal!=="nuevo"?modal:null} empleados={empleados} onGuardar={guardar} onCerrar={()=>setModal(null)}/>}
      {eliminar && <ConfirmarEliminar nombre={eliminar.nombre} onConfirmar={confirmarEliminar} onCancelar={()=>setEliminar(null)}/>}
    </div>
  )
}