import { useState, useEffect } from "react"
import { KpiCard, Badge, BarraProgreso, Seccion, Vacio, Spinner } from "./UI"
import { formatPeso, formatNum, calcCostoTrabajo, calcRentabilidadLoteDB, estadoService } from "../utils"
import { getMaquinas, getTrabajos, getLotes } from "../db"

export default function Dashboard({ onNavegar, userId }) {
  const [maquinas, setMaquinas] = useState([])
  const [trabajos, setTrabajos] = useState([])
  const [lotes,    setLotes]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getMaquinas(userId), getTrabajos(userId), getLotes(userId)])
      .then(([m, t, l]) => { setMaquinas(m); setTrabajos(t); setLotes(l); setLoading(false) })
  }, [userId])

  if (loading) return <Spinner texto="Cargando dashboard..." />

  const totalHa    = trabajos.reduce((s, t) => s + (t.ha||0), 0)
  const totalCosto = trabajos.reduce((s, t) => s + calcCostoTrabajo(t), 0)
  const costoPorHa = totalHa > 0 ? totalCosto / totalHa : 0

  const urgentes = maquinas.filter(m => estadoService(m.horasService, m.intervalo).pct >= 100)
  const alertas  = maquinas.filter(m => { const s = estadoService(m.horasService, m.intervalo); return s.pct >= 80 && s.pct < 100 })

  const lotesCosechados = lotes
    .map(l => ({ lote: l, rent: calcRentabilidadLoteDB(l, trabajos) }))
    .filter(({ rent }) => !rent.sinCosecha)

  const totalGanancia  = lotesCosechados.reduce((s, { rent }) => s + rent.gananciaTotal, 0)
  const ultimosTrabajos = trabajos.slice(0, 5)
  const sinDatos = maquinas.length === 0 && trabajos.length === 0 && lotes.length === 0

  return (
    <div className="space-y-6">

      {sinDatos && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <p className="text-emerald-400 font-bold text-lg mb-1">Bienvenido a RindeMás 🌾</p>
          <p className="text-white/50 text-sm mb-4">Para empezar, seguí estos pasos:</p>
          <div className="space-y-2">
            {[
              { num:"1", text:"Agregá tus máquinas en", link:"flota",    label:"Flota" },
              { num:"2", text:"Creá tus lotes en",      link:"lotes",    label:"Lotes" },
              { num:"3", text:"Registrá trabajos en",   link:"trabajos", label:"Trabajos" },
            ].map(p => (
              <div key={p.num} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">{p.num}</span>
                <span className="text-white/50">{p.text}</span>
                <button onClick={() => onNavegar(p.link)} className="text-emerald-400 hover:underline font-medium">{p.label} →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {urgentes.length > 0 && urgentes.map(m => (
        <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/8 border-red-500/25 text-sm">
          <span>🔴</span>
          <span className="font-bold text-red-400">{m.nombre}</span>
          <span className="text-white/35">—</span>
          <span className="text-red-300/80">Service urgente — {m.horasService}h desde el último service</span>
          <button onClick={() => onNavegar("flota")} className="ml-auto text-xs text-red-400 hover:underline shrink-0">Ver flota →</button>
        </div>
      ))}

      {!sinDatos && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="🚜" label="Máquinas"     value={maquinas.length} sub={urgentes.length>0?`${urgentes.length} con service urgente`:"todas al día"} color={urgentes.length>0?"text-red-400":"text-emerald-400"} />
          <KpiCard icon="🌾" label="Hectáreas"    value={`${formatNum(totalHa)} ha`} sub={`${trabajos.length} trabajos`} color="text-sky-400" />
          <KpiCard icon="📊" label="Costo/ha"     value={formatPeso(costoPorHa)} sub="promedio de todos los trabajos" color="text-violet-400" />
          <KpiCard icon="💰" label="Ganancia neta" value={`${totalGanancia>=0?"+":""}${formatPeso(totalGanancia)}`} sub={`${lotesCosechados.length} lotes cosechados`} color={totalGanancia>=0?"text-emerald-400":"text-red-400"} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Seccion titulo="Últimos trabajos"
          accion={trabajos.length>0&&<button onClick={()=>onNavegar("trabajos")} className="text-xs text-emerald-400 hover:underline">Ver todos →</button>}>
          {ultimosTrabajos.length === 0
            ? <div className="px-5 py-8 text-center text-white/25 text-sm">Sin trabajos. <button onClick={()=>onNavegar("trabajos")} className="text-emerald-400 hover:underline">Registrar →</button></div>
            : <div className="divide-y divide-white/5">
                {ultimosTrabajos.map(t => {
                  const costo = calcCostoTrabajo(t)
                  const cPorHa = (t.ha||0)>0 ? costo/(t.ha||1) : 0
                  return (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-medium text-sm truncate">{t.lote}</span>
                          <Badge color="emerald">{t.tipo}</Badge>
                        </div>
                        <p className="text-white/30 text-xs">{t.fecha} · {t.maquina} · {t.ha} ha</p>
                      </div>
                      <p className="text-emerald-400 font-bold text-sm shrink-0">{formatPeso(cPorHa)}<span className="text-white/25 font-normal">/ha</span></p>
                    </div>
                  )
                })}
              </div>
          }
        </Seccion>

        <Seccion titulo="Estado de flota"
          accion={maquinas.length>0&&<button onClick={()=>onNavegar("flota")} className="text-xs text-emerald-400 hover:underline">Ver flota →</button>}>
          {maquinas.length === 0
            ? <div className="px-5 py-8 text-center text-white/25 text-sm">Sin máquinas. <button onClick={()=>onNavegar("flota")} className="text-emerald-400 hover:underline">Agregar →</button></div>
            : <div className="divide-y divide-white/5">
                {maquinas.map(m => {
                  const est = estadoService(m.horasService, m.intervalo)
                  return (
                    <div key={m.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-white font-medium text-sm truncate">{m.nombre}</span>
                          <span className="text-white/25 text-xs">{m.marca}</span>
                        </div>
                        <BarraProgreso pct={est.pct} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white/30 text-xs font-mono mb-1">{m.horasService}h / {m.intervalo}h</p>
                        <Badge color={est.pct>=100?"red":est.pct>=80?"amber":"emerald"}>{est.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </Seccion>
      </div>

      {lotesCosechados.length > 0 && (
        <Seccion titulo="Rentabilidad por lote"
          accion={<button onClick={()=>onNavegar("lotes")} className="text-xs text-emerald-400 hover:underline">Ver lotes →</button>}>
          <div className="divide-y divide-white/5">
            {lotesCosechados.map(({ lote, rent }) => (
              <div key={lote.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">{lote.nombre}</span>
                    <Badge color={rent.rentable?"emerald":"red"}>{rent.rentable?"RENTABLE":"PÉRDIDA"}</Badge>
                  </div>
                  <p className="text-white/30 text-xs">{lote.cultivo} · {lote.ha} ha · {lote.cosecha?.rinde?.toLocaleString()} kg/ha</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-black text-lg ${rent.rentable?"text-emerald-400":"text-red-400"}`}>
                    {rent.rentable?"+":""}{formatPeso(rent.gananciaPorHa)}<span className="text-xs font-normal text-white/25">/ha</span>
                  </p>
                  <p className="text-white/30 text-xs">Total: {rent.rentable?"+":""}{formatPeso(rent.gananciaTotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </Seccion>
      )}
    </div>
  )
}
