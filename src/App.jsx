import { useState, useEffect, useCallback } from "react"
import { supabase }    from "./supabase"
import { sincronizarPendientes, getPendientes, isOnline } from "./offlineStorage"
import { BannerOffline, BannerSync } from "./components/UI"
import Auth        from "./components/Auth"
import Dashboard   from "./components/Dashboard"
import Lotes       from "./components/Lotes"
import Flota       from "./components/Flota"
import Trabajos    from "./components/Trabajos"
import Combustible from "./components/Combustible"
import Reportes    from "./components/Reportes"
import Repuestos   from "./components/Repuestos"
import Empleados   from "./components/Empleados"

const NAV = [
  { id:"dashboard",   icon:"⚡", label:"Dashboard"   },
  { id:"lotes",       icon:"🗺️",  label:"Lotes"        },
  { id:"flota",       icon:"🚜", label:"Flota"        },
  { id:"trabajos",    icon:"🌾", label:"Trabajos"     },
  { id:"combustible", icon:"⛽", label:"Combustible"  },
  { id:"reportes",    icon:"📊", label:"Reportes"     },
  { id:"repuestos",   icon:"🔧", label:"Repuestos"    },
  { id:"empleados",   icon:"👥", label:"Empleados"    },
]

const PANTALLAS = { Dashboard, Lotes, Flota, Trabajos, Combustible, Reportes, Repuestos, Empleados }

export default function App() {
  const [session,    setSession]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [seccion,    setSeccion]    = useState("dashboard")
  const [online,     setOnline]     = useState(isOnline())
  const [pendientes, setPendientes] = useState(0)
  const [syncMsg,    setSyncMsg]    = useState(0) // cantidad sincronizada
  const [sidebarOpen,setSidebarOpen]= useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Detectar cambios de conectividad
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true)
      if (session?.user?.id) {
        const cant = await sincronizarPendientes(session.user.id)
        if (cant > 0) { setSyncMsg(cant); setTimeout(() => setSyncMsg(0), 5000) }
        setPendientes(0)
      }
    }
    const handleOffline = async () => {
      setOnline(false)
      const p = await getPendientes()
      setPendientes(p.length)
    }
    window.addEventListener("online",  handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline) }
  }, [session])

  const navegar = useCallback((id) => {
    setSeccion(id)
    setSidebarOpen(false)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#080d0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-xl mx-auto mb-4 animate-pulse">R</div>
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

      {/* Banners de conectividad */}
      {!online && <BannerOffline pendientes={pendientes}/>}
      {syncMsg > 0 && <BannerSync cantidad={syncMsg} onCerrar={() => setSyncMsg(0)}/>}

      <div className="flex h-screen overflow-hidden" style={{paddingTop: (!online || syncMsg > 0) ? undefined : undefined}}>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 sm:hidden" onClick={() => setSidebarOpen(false)}/>
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed sm:relative inset-y-0 left-0 z-40
          w-64 sm:w-56 shrink-0
          border-r border-white/8
          flex flex-col bg-[#080d0a] sm:bg-black/30
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
        `}>
          <div className="px-5 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-base shrink-0">R</div>
              <div className="min-w-0">
                <p className="font-black text-white tracking-tight leading-none">RindeMás</p>
                <p className="text-xs text-white/25 mt-0.5 truncate">{empresa}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(item => (
              <button key={item.id} onClick={() => navegar(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95
                  ${seccion===item.id
                    ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/4 border border-transparent"}`}>
                <span className="text-lg w-6 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-white/8 space-y-1">
            {!online && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400/70">
                <span>📵</span><span>Sin conexión</span>
              </div>
            )}
            <button onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all text-sm">
              <span>🚪</span> Cerrar sesión
            </button>
            <p className="text-xs text-white/15 px-3">RindeMás v1.0</p>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <header className="border-b border-white/8 px-4 sm:px-8 py-3.5 flex items-center justify-between bg-black/20 shrink-0">
            <div className="flex items-center gap-3">
              {/* Hamburger mobile */}
              <button onClick={() => setSidebarOpen(true)}
                className="sm:hidden p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect y="2" width="18" height="2" rx="1"/><rect y="8" width="18" height="2" rx="1"/><rect y="14" width="18" height="2" rx="1"/>
                </svg>
              </button>
              <div>
                <h1 className="font-bold text-white text-sm">{NAV.find(n=>n.id===seccion)?.label}</h1>
                <p className="text-xs text-white/25 hidden sm:block">
                  {new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${online?"bg-emerald-500 animate-pulse":"bg-amber-400"}`}/>
              <span className="text-xs text-white/25 hidden sm:block">{online?"En línea":"Sin conexión"}</span>
            </div>
          </header>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-8 max-w-6xl mx-auto">
              <Pantalla onNavegar={navegar} userId={session.user.id} online={online}/>
            </div>
          </div>

          {/* Nav inferior mobile */}
          <nav className="sm:hidden border-t border-white/8 bg-[#080d0a] flex pb-safe shrink-0">
            {NAV.map(item => (
              <button key={item.id} onClick={() => navegar(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all
                  ${seccion===item.id ? "text-emerald-400" : "text-white/25"}`}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </div>
  )
}
