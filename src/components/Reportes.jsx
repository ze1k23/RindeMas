import { useState, useEffect } from "react"
import { KpiCard, Seccion, Badge, Vacio, Spinner, BtnPrimario } from "./UI"
import { formatPeso, calcCostoTrabajo, calcRentabilidadLoteDB } from "../utils"
import { getMaquinas, getTrabajos, getLotes, getCombustible } from "../db"
import { analizarRentabilidad } from "../gemini"

import { sendChatMessage } from "../gemini"

function BarraH({ label, value, max, color = "bg-emerald-500" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-white/40 text-xs w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width:`${pct}%` }}/>
      </div>
      <span className="text-white text-xs font-mono w-24 text-right shrink-0">{typeof value==="number"?value.toLocaleString("es-AR"):value}</span>
    </div>
  )
}

export default function Reportes({ userId }) {
  const [trabajos,  setTrabajos]  = useState([])
  const [maquinas,  setMaquinas]  = useState([])
  const [cargas,    setCargas]    = useState([])
  const [lotes,     setLotes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState("general")
  const [analisisIA, setAnalisisIA] = useState("")
  const [cargandoIA, setCargandoIA] = useState(false)

  const [mensajesChat, setMensajesChat] = useState([])
  const [inputMessage, setInputMessage] = useState('')




  const enviarMensaje = async () => {
    if (!inputMessage.trim()) return
    const userMsg = inputMessage.trim()
    setInputMessage('')
    setMensajesChat(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }])
    setCargandoIA(true)
    const userData = { maquinas, trabajos, lotes }
      const historial = mensajesChat.map(m => ({ role: m.role, content: m.content }))
    historial.push({ role: 'user', content: userMsg })
     const respuesta = await sendChatMessage(historial, userData)
    setMensajesChat(prev => [...prev, { role: 'assistant', content: respuesta, timestamp: Date.now() }])
    setCargandoIA(false)
  }


  useEffect(() => {
    Promise.all([getTrabajos(userId), getMaquinas(userId), getCombustible(userId), getLotes(userId)])
      .then(([t,m,c,l]) => { setTrabajos(t); setMaquinas(m); setCargas(c); setLotes(l); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando reportes..." />

  const totalHa     = trabajos.reduce((s,t)=>s+(t.ha||0),0)
  const totalLitros = trabajos.reduce((s,t)=>s+(t.litros||0),0)
  const totalHoras  = trabajos.reduce((s,t)=>s+(t.horas||0),0)
  const totalCosto  = trabajos.reduce((s,t)=>s+calcCostoTrabajo(t),0)
  const promPorHa   = totalHa>0 ? totalCosto/totalHa : 0
  const promLPorHa  = totalHa>0 ? totalLitros/totalHa : 0
  const promHaPorH  = totalHoras>0 ? totalHa/totalHoras : 0

  const porTipo = trabajos.reduce((acc,t) => {
    if (!acc[t.tipo]) acc[t.tipo] = { ha:0, costo:0, litros:0, count:0 }
    acc[t.tipo].ha     += t.ha||0
    acc[t.tipo].costo  += calcCostoTrabajo(t)
    acc[t.tipo].litros += t.litros||0
    acc[t.tipo].count  += 1
    return acc
  }, {})

  const porMaquina = trabajos.reduce((acc,t) => {
    if (!acc[t.maquina]) acc[t.maquina] = { ha:0, costo:0, horas:0, count:0 }
    acc[t.maquina].ha    += t.ha||0
    acc[t.maquina].costo += calcCostoTrabajo(t)
    acc[t.maquina].horas += t.horas||0
    acc[t.maquina].count += 1
    return acc
  }, {})

  const tConHa = trabajos.filter(t=>(t.ha||0)>0)
  const mejorT = tConHa.length>0 ? tConHa.reduce((a,b)=>calcCostoTrabajo(a)/(a.ha||1)<calcCostoTrabajo(b)/(b.ha||1)?a:b) : null
  const peorT  = tConHa.length>0 ? tConHa.reduce((a,b)=>calcCostoTrabajo(a)/(a.ha||1)>calcCostoTrabajo(b)/(b.ha||1)?a:b) : null

  const lotesCosechados = lotes.map(l=>({l,r:calcRentabilidadLoteDB(l,trabajos)})).filter(({r})=>!r.sinCosecha)
  const totalGanancia   = lotesCosechados.reduce((s,{r})=>s+r.gananciaTotal,0)

  const maxHaTipo = Math.max(...Object.values(porTipo).map(v=>v.ha), 1)
  const maxHaMaq  = Math.max(...Object.values(porMaquina).map(v=>v.ha), 1)

  const pedirAnalisisIA = async () => {
    setCargandoIA(true)
    const cultivos = [...new Set(trabajos.map(t=>t.cultivo).filter(Boolean))].join(", ")
    const datos = {
      costoPorHa:   promPorHa,
      litrosPorHa:  promLPorHa,
      totalHa,
      totalTrabajos: trabajos.length,
      loteRentables: lotesCosechados.filter(({r})=>r.rentable).length,
      totalLotes:    lotes.length,
      gananciaPorHa: lotesCosechados.length>0 ? lotesCosechados.reduce((s,{r})=>s+r.gananciaPorHa,0)/lotesCosechados.length : 0,
      cultivos,
    }
    const resp = await analizarRentabilidad(datos)
    setAnalisisIA(resp || "No se pudo obtener el análisis. Intentá de nuevo.")
    setCargandoIA(false)
  }

  const TABS = [
    { id:"general",     label:"General"     },
    { id:"maquinas",    label:"Máquinas"    },
    { id:"trabajos",    label:"Trabajos"    },
    { id:"combustible", label:"Combustible" },
    { id:"ia",          label:"🤖 IA"       },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Reportes y Análisis</h2>
        <p className="text-sm text-white/30 mt-0.5">Resumen completo de la operación</p>
      </div>

      <div className="flex gap-0 border-b border-white/8">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${tab===t.id?"text-emerald-400 border-emerald-400":"text-white/25 border-transparent hover:text-white/50"}`}>{t.label}</button>
        ))}
      </div>

      {tab==="general" && (
        <div className="space-y-6">
          {trabajos.length===0
            ? <div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="📊" titulo="Sin datos para analizar" sub="Registrá trabajos para ver los reportes."/></div>
            : <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Hectáreas totales"  value={`${totalHa.toLocaleString()} ha`}  color="text-sky-400"     />
                  <KpiCard label="Horas trabajadas"   value={`${totalHoras.toLocaleString()} h`} color="text-violet-400"  />
                  <KpiCard label="Costo operativo"    value={formatPeso(totalCosto)}              color="text-red-400"     />
                  <KpiCard label="Costo/ha promedio"  value={formatPeso(promPorHa)}               color="text-emerald-400" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard label="Gasoil consumido" value={`${totalLitros.toLocaleString()} L`} color="text-orange-400" />
                  <KpiCard label="L/ha promedio"    value={`${promLPorHa.toFixed(2)} L/ha`}     color="text-amber-400"  />
                  <KpiCard label="Rendimiento"      value={`${promHaPorH.toFixed(1)} ha/h`}     color="text-cyan-400"   />
                </div>
                {lotesCosechados.length>0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <KpiCard label="Lotes cosechados"    value={lotesCosechados.length}                              color="text-white"       />
                    <KpiCard label="Lotes rentables"     value={lotesCosechados.filter(({r})=>r.rentable).length}   color="text-emerald-400" />
                    <KpiCard label="Ganancia neta total" value={`${totalGanancia>=0?"+":""}${formatPeso(totalGanancia)}`} color={totalGanancia>=0?"text-emerald-400":"text-red-400"} />
                  </div>
                )}
                {mejorT && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                      <p className="text-xs text-emerald-400/50 uppercase tracking-wider font-bold mb-3">✅ Trabajo más eficiente</p>
                      <p className="text-white font-bold">{mejorT.tipo} — {mejorT.lote}</p>
                      <p className="text-white/35 text-sm">{mejorT.fecha} · {mejorT.maquina} · {mejorT.ha} ha</p>
                      <p className="text-emerald-400 font-black text-2xl mt-2">{formatPeso(calcCostoTrabajo(mejorT)/(mejorT.ha||1))}<span className="text-sm font-normal opacity-50">/ha</span></p>
                    </div>
                    {peorT && peorT.id!==mejorT.id && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                        <p className="text-xs text-red-400/50 uppercase tracking-wider font-bold mb-3">⚠️ Trabajo menos eficiente</p>
                        <p className="text-white font-bold">{peorT.tipo} — {peorT.lote}</p>
                        <p className="text-white/35 text-sm">{peorT.fecha} · {peorT.maquina} · {peorT.ha} ha</p>
                        <p className="text-red-400 font-black text-2xl mt-2">{formatPeso(calcCostoTrabajo(peorT)/(peorT.ha||1))}<span className="text-sm font-normal opacity-50">/ha</span></p>
                      </div>
                    )}
                  </div>
                )}
                {Object.keys(porTipo).length>0 && (
                  <Seccion titulo="Hectáreas por tipo de trabajo">
                    <div className="p-5 space-y-1">
                      {Object.entries(porTipo).sort((a,b)=>b[1].ha-a[1].ha).map(([tipo,v])=>(
                        <BarraH key={tipo} label={tipo} value={v.ha} max={maxHaTipo}/>
                      ))}
                    </div>
                  </Seccion>
                )}
              </>
          }
        </div>
      )}

      {tab==="maquinas" && (
        <div className="space-y-5">
          {Object.keys(porMaquina).length===0
            ? <div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="🚜" titulo="Sin datos por máquina"/></div>
            : <>
                <Seccion titulo="Hectáreas por máquina">
                  <div className="p-5 space-y-1">
                    {Object.entries(porMaquina).sort((a,b)=>b[1].ha-a[1].ha).map(([maq,v])=>(
                      <BarraH key={maq} label={maq} value={v.ha} max={maxHaMaq} color="bg-sky-500"/>
                    ))}
                  </div>
                </Seccion>
                <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/8"><h3 className="font-bold text-white/50 text-xs uppercase tracking-widest">Rendimiento por máquina</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/8">{["Máquina","Trab.","Ha","Horas","ha/h","Costo total","$/ha"].map(h=><th key={h} className="text-left px-5 py-3 text-white/25 font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
                      <tbody>
                        {Object.entries(porMaquina).sort((a,b)=>b[1].ha-a[1].ha).map(([maq,v])=>{
                          const haH=v.horas>0?v.ha/v.horas:0, cPH=v.ha>0?v.costo/v.ha:0
                          return (
                            <tr key={maq} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                              <td className="px-5 py-3 text-white font-semibold">{maq}</td>
                              <td className="px-5 py-3 text-white/40">{v.count}</td>
                              <td className="px-5 py-3 text-sky-400 font-mono font-bold">{v.ha.toLocaleString()}</td>
                              <td className="px-5 py-3 text-white/50 font-mono">{v.horas.toLocaleString()}</td>
                              <td className="px-5 py-3 text-cyan-400 font-mono">{haH.toFixed(1)}</td>
                              <td className="px-5 py-3 text-white/60 font-mono">{formatPeso(v.costo)}</td>
                              <td className="px-5 py-3 text-emerald-400 font-mono font-bold">{formatPeso(cPH)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
          }
        </div>
      )}

      {tab==="trabajos" && (
        <div className="space-y-5">
          {Object.keys(porTipo).length===0
            ? <div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="🌾" titulo="Sin trabajos para analizar"/></div>
            : <>
                <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/8"><h3 className="font-bold text-white/50 text-xs uppercase tracking-widest">Rentabilidad por tipo de trabajo</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/8">{["Tipo","Trab.","Ha","Gasoil","Costo total","$/ha"].map(h=><th key={h} className="text-left px-5 py-3 text-white/25 font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
                      <tbody>
                        {Object.entries(porTipo).sort((a,b)=>b[1].ha-a[1].ha).map(([tipo,v])=>{
                          const cPH=v.ha>0?v.costo/v.ha:0
                          return (
                            <tr key={tipo} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                              <td className="px-5 py-3"><Badge color="emerald">{tipo}</Badge></td>
                              <td className="px-5 py-3 text-white/40">{v.count}</td>
                              <td className="px-5 py-3 text-sky-400 font-mono font-bold">{v.ha.toLocaleString()}</td>
                              <td className="px-5 py-3 text-orange-400 font-mono">{v.litros.toLocaleString()} L</td>
                              <td className="px-5 py-3 text-white/60 font-mono">{formatPeso(v.costo)}</td>
                              <td className="px-5 py-3 text-emerald-400 font-mono font-bold">{formatPeso(cPH)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {lotesCosechados.length>0 && (
                  <Seccion titulo="Rentabilidad por lote cosechado">
                    <div className="divide-y divide-white/5">
                      {lotesCosechados.map(({l,r})=>(
                        <div key={l.id} className="px-5 py-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white font-semibold text-sm">{l.nombre}</span>
                              <Badge color={r.rentable?"emerald":"red"}>{r.rentable?"RENTABLE":"PÉRDIDA"}</Badge>
                            </div>
                            <p className="text-white/30 text-xs">{l.cultivo} · {l.ha} ha · {l.cosecha?.rinde?.toLocaleString()} kg/ha</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-xl ${r.rentable?"text-emerald-400":"text-red-400"}`}>{r.rentable?"+":""}{formatPeso(r.gananciaPorHa)}<span className="text-xs font-normal opacity-40">/ha</span></p>
                            <p className="text-white/25 text-xs">Margen: {r.margen?.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Seccion>
                )}
              </>
          }
        </div>
      )}

      {tab==="combustible" && (
        <div className="space-y-5">
          {cargas.length===0
            ? <div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="⛽" titulo="Sin datos de combustible"/></div>
            : <>
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard label="Litros cargados"  value={`${cargas.reduce((s,c)=>s+(c.litros||0),0).toLocaleString()} L`} color="text-orange-400"/>
                  <KpiCard label="Gasto total"       value={formatPeso(cargas.reduce((s,c)=>s+(c.litros||0)*(c.precio||0),0))} color="text-red-400"/>
                  <KpiCard label="Cargas"            value={cargas.length}                                                    color="text-amber-400"/>
                </div>
                <Seccion titulo="Litros por máquina">
                  <div className="p-5 space-y-1">
                    {(()=>{
                      const pm=cargas.reduce((acc,c)=>{acc[c.maquina]=(acc[c.maquina]||0)+(c.litros||0);return acc},{})
                      const mx=Math.max(...Object.values(pm),1)
                      return Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([maq,lit])=>(
                        <BarraH key={maq} label={maq} value={lit} max={mx} color="bg-orange-500"/>
                      ))
                    })()}
                  </div>
                </Seccion>
              </>
          }
        </div>
      )}

      // Dentro de Reportes.jsx, después de los otros tabs, reemplazar:

{tab==="ia" && (
  <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="flex items-start gap-4">
        <span className="text-3xl">🤖</span>
        <div className="flex-1">
          <p className="text-emerald-400 font-bold mb-1">AgroAsesor - Tu asistente inteligente</p>
          <p className="text-white/40 text-sm mb-4">
            Preguntame sobre rentabilidad, eficiencia de máquinas, costos, o cualquier aspecto de tu operación.
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-white/8 bg-white/3 flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {mensajesChat.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <p className="text-2xl mb-2">🌾</p>
            <p>Hacé una pregunta sobre tu negocio</p>
            <p className="text-xs mt-2">Ej: "¿Qué máquina es menos eficiente?" o "¿Cómo puedo reducir el consumo de combustible?"</p>
          </div>
        ) : (
          mensajesChat.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-emerald-500/20 text-white border border-emerald-500/20' 
                  : 'bg-white/5 text-white/80 border border-white/10'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-white/30 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {cargandoIA && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-2 border border-white/10">
              <div className="flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-100">●</span>
                <span className="animate-pulse delay-200">●</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/8 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50"
            placeholder="Escribí tu pregunta..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
            disabled={cargandoIA}
          />
          <button
            onClick={enviarMensaje}
            disabled={cargandoIA || !inputMessage.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-40 hover:bg-emerald-400 transition-all"
          >
            Enviar
          </button>
        </div>
        <p className="text-xs text-white/20 mt-2 text-center">
          AgroAsesor analiza tus datos en tiempo real. Podés preguntar sobre máquinas, trabajos, lotes y rentabilidad.
        </p>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
