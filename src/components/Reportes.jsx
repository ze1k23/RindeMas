import { useState, useEffect, useRef } from "react"
import { KpiCard, Seccion, Badge, Vacio, Spinner, BtnPrimario } from "./UI"
import { formatPeso, calcCostoTrabajo, calcRentabilidadLote } from "../utils"
import { getMaquinas, getTrabajos, getLotes, getCombustible } from "../db"
import { chatIA, construirContexto } from "../groq"

// ─── BARRA HORIZONTAL ────────────────────────────────────────────────────────
function BarraH({ label, value, max, color="bg-emerald-500" }) {
  const pct = max>0?Math.min(100,(value/max)*100):0
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-white/40 text-xs w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`}}/>
      </div>
      <span className="text-white text-xs font-mono w-24 text-right shrink-0">
        {typeof value==="number"?value.toLocaleString("es-AR"):value}
      </span>
    </div>
  )
}

// ─── CHAT IA ─────────────────────────────────────────────────────────────────
function ChatIA({ datos }) {
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [iniciado, setIniciado] = useState(false)
  const bottomRef = useRef(null)

  const scrollAbajo = () => {
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100)
  }

  const iniciarChat = async () => {
    setIniciado(true)
    setLoading(true)
    const contexto = construirContexto(datos)
    const intro = [{ role:"user", content:`Analizá mis datos operativos y dame un diagnóstico inicial con 3 recomendaciones concretas para mejorar mi rentabilidad:\n\n${contexto}` }]
    const respuesta = await chatIA(intro)
    const msgsNuevos = [...intro, { role:"assistant", content:respuesta }]
    setMensajes(msgsNuevos)
    setLoading(false)
    scrollAbajo()
  }

  const enviar = async () => {
    if (!input.trim()||loading) return
    const contexto = construirContexto(datos)
    const msgsBase = mensajes.length===0
      ? [{role:"user",content:`Estos son mis datos operativos:\n\n${contexto}`},{role:"assistant",content:"Entendido. ¿En qué podés ayudarte?"}]
      : mensajes
    const nuevos = [...msgsBase, { role:"user", content:input.trim() }]
    setMensajes(nuevos)
    setInput("")
    setLoading(true)
    scrollAbajo()
    const respuesta = await chatIA(nuevos)
    setMensajes(prev=>[...prev,{ role:"assistant", content:respuesta }])
    setLoading(false)
    scrollAbajo()
  }

  if (!iniciado) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl shrink-0">🤖</div>
          <div className="flex-1">
            <p className="text-emerald-400 font-bold mb-1">Asesor IA — Análisis de Rentabilidad</p>
            <p className="text-white/40 text-sm mb-4">El asesor analiza tus datos operativos y te da recomendaciones concretas para mejorar tu rentabilidad. Podés preguntarle lo que quieras.</p>
            {datos.trabajos?.length===0
              ?<p className="text-white/30 text-sm">Necesitás tener trabajos registrados para usar el análisis de IA.</p>
              :<BtnPrimario onClick={iniciarChat}>Iniciar análisis</BtnPrimario>
            }
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden flex flex-col" style={{height:"500px"}}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-base">🤖</div>
        <div>
          <p className="text-white font-semibold text-sm">Asesor IA</p>
          <p className="text-white/30 text-xs">Análisis de rentabilidad agrícola</p>
        </div>
        <button onClick={()=>{setMensajes([]);setIniciado(false)}} className="ml-auto text-white/25 hover:text-white/50 text-xs transition-all">Reiniciar</button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensajes.filter(m=>!m.content.includes("Estos son mis datos")).map((m,i)=>(
          <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line
              ${m.role==="user"
                ?"bg-emerald-500 text-white rounded-br-md"
                :"bg-white/8 text-white/80 rounded-bl-md"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div className="flex justify-start">
            <div className="bg-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </div>
              <span className="text-white/30 text-xs">Analizando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/8 flex gap-2">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/40 transition-all"
          placeholder="Preguntá lo que quieras..."
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),enviar())}
          disabled={loading}/>
        <button onClick={enviar} disabled={loading||!input.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-sm transition-all">
          →
        </button>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Reportes({ userId }) {
  const [trabajos, setTrabajos] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [cargas,   setCargas]   = useState([])
  const [lotes,    setLotes]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState("general")

  useEffect(()=>{
    Promise.all([getTrabajos(userId),getMaquinas(userId),getCombustible(userId),getLotes(userId)])
      .then(([t,m,c,l])=>{setTrabajos(t);setMaquinas(m);setCargas(c);setLotes(l);setLoading(false)})
  },[userId])

  if (loading) return <Spinner texto="Cargando reportes..."/>

  const totalHa     = trabajos.reduce((s,t)=>s+(t.ha||0),0)
  const totalLitros = trabajos.reduce((s,t)=>s+(t.litros||0),0)
  const totalHoras  = trabajos.reduce((s,t)=>s+(t.horas||0),0)
  const totalCosto  = trabajos.reduce((s,t)=>s+calcCostoTrabajo(t),0)
  const promPorHa   = totalHa>0?totalCosto/totalHa:0
  const promLPorHa  = totalHa>0?totalLitros/totalHa:0

  const porTipo = trabajos.reduce((acc,t)=>{
    if(!acc[t.tipo])acc[t.tipo]={ha:0,costo:0,litros:0,count:0}
    acc[t.tipo].ha+=t.ha||0; acc[t.tipo].costo+=calcCostoTrabajo(t)
    acc[t.tipo].litros+=t.litros||0; acc[t.tipo].count+=1
    return acc
  },{})

  const porMaquina = trabajos.reduce((acc,t)=>{
    if(!acc[t.maquina])acc[t.maquina]={ha:0,costo:0,horas:0,count:0}
    acc[t.maquina].ha+=t.ha||0; acc[t.maquina].costo+=calcCostoTrabajo(t)
    acc[t.maquina].horas+=t.horas||0; acc[t.maquina].count+=1
    return acc
  },{})

  const tConHa = trabajos.filter(t=>(t.ha||0)>0)
  const mejorT = tConHa.length>0?tConHa.reduce((a,b)=>calcCostoTrabajo(a)/(a.ha||1)<calcCostoTrabajo(b)/(b.ha||1)?a:b):null
  const peorT  = tConHa.length>0?tConHa.reduce((a,b)=>calcCostoTrabajo(a)/(a.ha||1)>calcCostoTrabajo(b)/(b.ha||1)?a:b):null

  const lotesCosechados = lotes.map(l=>({l,r:calcRentabilidadLote(l,trabajos)})).filter(({r})=>!r.sinCosecha)
  const totalGanancia   = lotesCosechados.reduce((s,{r})=>s+r.gananciaTotal,0)
  const maxHaTipo = Math.max(...Object.values(porTipo).map(v=>v.ha),1)
  const maxHaMaq  = Math.max(...Object.values(porMaquina).map(v=>v.ha),1)

  const TABS = [
    {id:"general",label:"General"},{id:"maquinas",label:"Máquinas"},
    {id:"trabajos",label:"Trabajos"},{id:"combustible",label:"Combustible"},
    {id:"ia",label:"🤖 IA"},
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Reportes</h2>
        <p className="text-sm text-white/30 mt-0.5">Análisis completo de la operación</p>
      </div>

      {/* Tabs - scrollable en mobile */}
      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap
              ${tab===t.id?"text-emerald-400 border-emerald-400":"text-white/25 border-transparent hover:text-white/50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {tab==="general"&&(
        <div className="space-y-5">
          {trabajos.length===0
            ?<div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="📊" titulo="Sin datos para analizar" sub="Registrá trabajos para ver los reportes."/></div>
            :<>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Hectáreas"   value={`${totalHa.toLocaleString()} ha`}  color="text-sky-400"     />
                <KpiCard label="Horas"        value={`${totalHoras.toLocaleString()} h`} color="text-violet-400"  />
                <KpiCard label="Costo total"  value={formatPeso(totalCosto)}              color="text-red-400"     />
                <KpiCard label="Costo/ha"     value={formatPeso(promPorHa)}               color="text-emerald-400" />
                <KpiCard label="Gasoil"       value={`${totalLitros.toLocaleString()} L`} color="text-orange-400"  />
                <KpiCard label="L/ha prom"    value={`${promLPorHa.toFixed(2)} L/ha`}     color="text-amber-400"   />
              </div>
              {lotesCosechados.length>0&&(
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard label="Lotes cosechados" value={lotesCosechados.length}                              color="text-white"       />
                  <KpiCard label="Lotes rentables"  value={lotesCosechados.filter(({r})=>r.rentable).length}   color="text-emerald-400" />
                  <KpiCard label="Ganancia neta"     value={`${totalGanancia>=0?"+":""}${formatPeso(totalGanancia)}`} color={totalGanancia>=0?"text-emerald-400":"text-red-400"} />
                  <KpiCard label="Con pérdida"       value={lotesCosechados.filter(({r})=>!r.rentable).length} color="text-red-400"     />
                </div>
              )}
              {mejorT&&(
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                    <p className="text-xs text-emerald-400/50 uppercase font-bold mb-2">✅ Más eficiente</p>
                    <p className="text-white font-bold">{mejorT.tipo} — {mejorT.lote}</p>
                    <p className="text-white/35 text-xs">{mejorT.fecha} · {mejorT.ha} ha</p>
                    <p className="text-emerald-400 font-black text-2xl mt-2">{formatPeso(calcCostoTrabajo(mejorT)/(mejorT.ha||1))}<span className="text-sm font-normal opacity-50">/ha</span></p>
                  </div>
                  {peorT&&peorT.id!==mejorT.id&&(
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                      <p className="text-xs text-red-400/50 uppercase font-bold mb-2">⚠️ Menos eficiente</p>
                      <p className="text-white font-bold">{peorT.tipo} — {peorT.lote}</p>
                      <p className="text-white/35 text-xs">{peorT.fecha} · {peorT.ha} ha</p>
                      <p className="text-red-400 font-black text-2xl mt-2">{formatPeso(calcCostoTrabajo(peorT)/(peorT.ha||1))}<span className="text-sm font-normal opacity-50">/ha</span></p>
                    </div>
                  )}
                </div>
              )}
              {Object.keys(porTipo).length>0&&(
                <Seccion titulo="Ha por tipo de trabajo">
                  <div className="p-4 space-y-1">
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

      {/* MÁQUINAS */}
      {tab==="maquinas"&&(
        <div className="space-y-5">
          {Object.keys(porMaquina).length===0
            ?<div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="🚜" titulo="Sin datos por máquina"/></div>
            :<>
              <Seccion titulo="Hectáreas por máquina">
                <div className="p-4 space-y-1">
                  {Object.entries(porMaquina).sort((a,b)=>b[1].ha-a[1].ha).map(([maq,v])=>(
                    <BarraH key={maq} label={maq} value={v.ha} max={maxHaMaq} color="bg-sky-500"/>
                  ))}
                </div>
              </Seccion>
              <div className="space-y-3">
                {Object.entries(porMaquina).sort((a,b)=>b[1].ha-a[1].ha).map(([maq,v])=>{
                  const haH=v.horas>0?v.ha/v.horas:0, cPH=v.ha>0?v.costo/v.ha:0
                  return (
                    <div key={maq} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                      <p className="text-white font-bold mb-3">{maq}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-white/25">Trabajos</p><p className="text-white font-semibold">{v.count}</p></div>
                        <div><p className="text-white/25">Hectáreas</p><p className="text-sky-400 font-bold">{v.ha.toLocaleString()}</p></div>
                        <div><p className="text-white/25">Horas</p><p className="text-white/60">{v.horas.toLocaleString()}</p></div>
                        <div><p className="text-white/25">ha/hora</p><p className="text-cyan-400 font-semibold">{haH.toFixed(1)}</p></div>
                        <div><p className="text-white/25">Costo total</p><p className="text-white/60">{formatPeso(v.costo)}</p></div>
                        <div><p className="text-white/25">Costo/ha</p><p className="text-emerald-400 font-bold">{formatPeso(cPH)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          }
        </div>
      )}

      {/* TRABAJOS */}
      {tab==="trabajos"&&(
        <div className="space-y-5">
          {Object.keys(porTipo).length===0
            ?<div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="🌾" titulo="Sin trabajos para analizar"/></div>
            :<>
              <div className="space-y-3">
                {Object.entries(porTipo).sort((a,b)=>b[1].ha-a[1].ha).map(([tipo,v])=>{
                  const cPH=v.ha>0?v.costo/v.ha:0
                  return (
                    <div key={tipo} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge color="emerald">{tipo}</Badge>
                        <span className="text-white/30 text-xs">{v.count} trabajos</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-white/25">Hectáreas</p><p className="text-sky-400 font-bold">{v.ha.toLocaleString()}</p></div>
                        <div><p className="text-white/25">Gasoil</p><p className="text-orange-400 font-semibold">{v.litros.toLocaleString()} L</p></div>
                        <div><p className="text-white/25">Costo/ha</p><p className="text-emerald-400 font-bold">{formatPeso(cPH)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {lotesCosechados.length>0&&(
                <Seccion titulo="Rentabilidad por lote">
                  <div className="divide-y divide-white/5">
                    {lotesCosechados.map(({l,r})=>(
                      <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-semibold text-sm truncate">{l.nombre}</span>
                            <Badge color={r.rentable?"emerald":"red"}>{r.rentable?"RENTABLE":"PÉRDIDA"}</Badge>
                          </div>
                          <p className="text-white/30 text-xs">{l.cultivo} · {l.ha} ha · {l.cosecha?.rinde?.toLocaleString()} kg/ha</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black text-lg ${r.rentable?"text-emerald-400":"text-red-400"}`}>{r.rentable?"+":""}{formatPeso(r.gananciaPorHa)}<span className="text-xs opacity-40">/ha</span></p>
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

      {/* COMBUSTIBLE */}
      {tab==="combustible"&&(
        <div className="space-y-5">
          {cargas.length===0
            ?<div className="rounded-2xl border border-white/8 bg-white/3"><Vacio icon="⛽" titulo="Sin datos de combustible"/></div>
            :<>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Litros"     value={`${cargas.reduce((s,c)=>s+(c.litros||0),0).toLocaleString()} L`} color="text-orange-400"/>
                <KpiCard label="Gasto"      value={formatPeso(cargas.reduce((s,c)=>s+(c.litros||0)*(c.precio||0),0))} color="text-red-400"/>
              </div>
              <Seccion titulo="Litros por máquina">
                <div className="p-4 space-y-1">
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

      {/* IA */}
      {tab==="ia"&&(
        <ChatIA datos={{trabajos,lotes,maquinas,cargas}}/>
      )}
    </div>
  )
}
