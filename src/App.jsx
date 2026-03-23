// App.jsx
import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth        from "./components/Auth"
import Dashboard   from "./components/Dashboard"
import Lotes       from "./components/Lotes"
import Flota       from "./components/Flota"
import Trabajos    from "./components/Trabajos"
import Combustible from "./components/Combustible"
import Reportes    from "./components/Reportes"
import Repuestos from "./components/Repuestos"

const NAV = [
  { id: "dashboard",   icon: "⚡", label: "Dashboard"   },
  { id: "lotes",       icon: "🗺️", label: "Lotes"        },
  { id: "flota",       icon: "🚜", label: "Flota"        },
  { id: "trabajos",    icon: "🌾", label: "Trabajos"     },
  { id: "combustible", icon: "⛽", label: "Combustible"  },
  { id: "repuestos",   icon: "🔧", label: "Repuestos"    },
  { id: "reportes",    icon: "📊", label: "Reportes"     },
]

const PANTALLAS = { Dashboard, Lotes, Flota, Trabajos, Combustible, Repuestos, Reportes }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seccion, setSeccion] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <div className="min-h-screen bg-[#080d0a] text-white">
      {/* Sidebar (visible en desktop) */}
      <aside className="hidden lg:block fixed w-60 h-full border-r border-white/8 bg-black/30 z-20">
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

      {/* Contenido principal */}
      <div className="lg:ml-60 flex flex-col min-h-screen pb-16 lg:pb-0">
        <header className="border-b border-white/8 px-4 sm:px-8 py-4 flex items-center justify-between bg-black/20 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Botón menú móvil */}
            <button
              className="lg:hidden text-white/50 hover:text-white p-1 -ml-1"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-white text-sm">{NAV.find(n=>n.id===seccion)?.label}</h1>
              <p className="text-xs text-white/25 mt-0.5 hidden sm:block">
                {new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-xs text-white/25 hidden sm:inline">En línea</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-8">
          <Pantalla onNavegar={setSeccion} userId={session.user.id} user={session.user} />
        </main>

        {/* Bottom navigation para móvil */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/8 flex justify-around py-2 z-20">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSeccion(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                seccion === item.id
                  ? "text-emerald-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer mobile (sidebar) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0d1410] border-r border-white/10 shadow-xl flex flex-col">
            <div className="px-5 py-5 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-sm">R</div>
                <div>
                  <p className="font-black text-white">RindeMás</p>
                  <p className="text-xs text-white/25 truncate">{empresa}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/50 text-xl">&times;</button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-0.5">
              {NAV.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSeccion(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${seccion===item.id
                      ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                      : "text-white/35 hover:text-white/70 hover:bg-white/4 border border-transparent"}`}
                >
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}