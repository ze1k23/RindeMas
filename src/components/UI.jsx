// UI.jsx — componentes reutilizables

export const IC = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-emerald-500/4 transition-all"
export const SC = "w-full bg-[#080d0a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-all"

export function Campo({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/20">{hint}</p>}
    </div>
  )
}

export function Modal({ titulo, subtitulo, onCerrar, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1410] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col md:max-w-md">
        <div className="px-6 py-4 border-b border-white/8 flex items-start justify-between shrink-0">
          <div>
            <h3 className="font-bold text-white">{titulo}</h3>
            {subtitulo && <p className="text-white/35 text-xs mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onCerrar} className="text-white/25 hover:text-white text-xl leading-none ml-4 mt-0.5 transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/8 flex gap-3 justify-end shrink-0">{footer}</div>}
      </div>
    </div>
  ) 
}

export function BtnPrimario({ onClick, children, color = "emerald", disabled }) {
  const c = { emerald:"bg-emerald-500 hover:bg-emerald-400", red:"bg-red-500 hover:bg-red-400", orange:"bg-orange-500 hover:bg-orange-400", amber:"bg-amber-500 hover:bg-amber-400" }
  return <button onClick={onClick} disabled={disabled} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 ${c[color]||c.emerald}`}>{children}</button>
}

export function BtnSecundario({ onClick, children }) {
  return <button onClick={onClick} className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">{children}</button>
}

export function BtnIcono({ onClick, icon, title, danger }) {
  return <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-all ${danger ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-white/25 hover:text-white hover:bg-white/8"}`}>{icon}</button>
}

export function KpiCard({ icon, label, value, sub, color = "text-emerald-400", small }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
      {icon && <span className="text-base sm:text-lg mb-1 block">{icon}</span>}
      <p className={`font-black ${small ? "text-base sm:text-xl" : "text-lg sm:text-2xl"} ${color}`}>{value ?? "—"}</p>
      <p className="text-[10px] sm:text-xs text-white/30 uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[9px] sm:text-xs text-white/20 mt-0.5">{sub}</p>}
    </div>
  )
}

export function Seccion({ titulo, accion, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <h3 className="font-bold text-white/50 text-xs uppercase tracking-widest">{titulo}</h3>
        {accion}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function Vacio({ icon, titulo, sub, accion }) {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl mb-4">{icon}</p>
      <p className="text-white/50 font-bold">{titulo}</p>
      {sub && <p className="text-white/20 text-sm mt-2 mb-6">{sub}</p>}
      {accion}
    </div>
  )
}

export function Badge({ children, color = "white" }) {
  const s = {
    white:   "text-white/50 bg-white/5 border-white/10",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    red:     "text-red-400 bg-red-500/10 border-red-500/25",
    amber:   "text-amber-400 bg-amber-500/10 border-amber-500/25",
    sky:     "text-sky-400 bg-sky-500/10 border-sky-500/25",
    blue:    "text-blue-400 bg-blue-500/10 border-blue-500/25",
  }
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s[color]||s.white}`}>{children}</span>
}

export function BarraProgreso({ pct, color }) {
  const c = color || (pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500")
  return (
    <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${c}`} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
    </div>
  )
}

export function Tabla({ headers, children, vacio }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {headers.map(h => <th key={h} className="text-left px-5 py-3 text-white/25 font-medium text-xs uppercase tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {vacio}
    </div>
  )
}

export function Tr({ children, highlight }) {
  return <tr className={`border-b border-white/5 hover:bg-white/4 transition-colors ${highlight ? "bg-emerald-500/3" : ""}`}>{children}</tr>
}

export function Td({ children, mono, muted, bold, color }) {
  return <td className={`px-3 sm:px-5 py-2 sm:py-3 ${mono?"font-mono":""} ${muted?"text-white/40":""} ${bold?"font-bold":""} ${color||"text-white"}`}>{children}</td>
}

export function ConfirmarEliminar({ nombre, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1410] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <p className="text-lg font-bold text-white mb-2">¿Eliminar?</p>
        <p className="text-white/40 text-sm mb-6">Vas a eliminar <span className="text-white font-semibold">"{nombre}"</span>. Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <BtnSecundario onClick={onCancelar}>Cancelar</BtnSecundario>
          <BtnPrimario onClick={onConfirmar} color="red">Eliminar</BtnPrimario>
        </div>
      </div>
    </div>
  )
}

export function Spinner({ texto = "Cargando..." }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/30 text-sm">{texto}</p>
      </div>
    </div>
  )
}
