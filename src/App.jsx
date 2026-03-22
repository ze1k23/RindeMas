import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth        from "./components/Auth"
import Dashboard   from "./components/Dashboard"
import Lotes       from "./components/Lotes"
import Flota       from "./components/Flota"
import Trabajos    from "./components/Trabajos"
import Combustible from "./components/Combustible"
import Reportes    from "./components/Reportes"

const NAV = [
  { id: "dashboard",   icon: "⚡", label: "Dashboard"   },
  { id: "lotes",       icon: "🗺️",  label: "Lotes"        },
  { id: "flota",       icon: "🚜", label: "Flota"        },
  { id: "trabajos",    icon: "🌾", label: "Trabajos"     },
  { id: "combustible", icon: "⛽", label: "Combustible"  },
  { id: "reportes",    icon: "📊", label: "Reportes"     },
]

const PANTALLAS = { Dashboard, Lotes, Flota, Trabajos, Combustible, Reportes }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seccion, setSeccion] = useState("dashboard")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#080d0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-lg mx-auto mb-3 animate-pulse">R</div>
        <p className="text-white/30 text-sm">Cargando...</p>
      </div>
    </div>
  )

  if (!session) return <Auth />

  const nombre   = seccion.charAt(0).toUpperCase() + seccion.slice(1)
  const Pantalla = PANTALLAS[nombre]
  const empresa  = session.user?.user_metadata?.nombre_empresa || session.user?.email

  return (
    <div className="min-h-screen bg-[#080d0a] text-white flex">
      <aside className="w-60 shrink-0 border-r border-white/8 flex flex-col bg-black/30 fixed h-full z-20">
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-sm shrink-0">R</div>
            <div className="min-w-0">
              <p className="font-black text-white tracking-tight leading-none">RindeMás</p>
              <p className="text-xs text-white/25 mt-0.5 truncate">{empresa}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setSeccion(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${seccion===item.id
                  ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                  : "text-white/35 hover:text-white/70 hover:bg-white/4 border border-transparent"}`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/8">
          <button onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all text-sm">
            <span>🚪</span> Cerrar sesión
          </button>
          <p className="text-xs text-white/15 mt-2 px-3">RindeMás v1.0 · Beta</p>
        </div>
      </aside>
      <main className="flex-1 flex flex-col ml-60">
        <header className="border-b border-white/8 px-8 py-4 flex items-center justify-between bg-black/20 sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-white text-sm">{NAV.find(n=>n.id===seccion)?.label}</h1>
            <p className="text-xs text-white/25 mt-0.5">
              {new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-xs text-white/25">En línea</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Pantalla onNavegar={setSeccion} userId={session.user.id} />
        </div>
      </main>
    </div>
  )
}
