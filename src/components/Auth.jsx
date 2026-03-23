import { useState } from "react"
import { supabase } from "../supabase"

export default function Auth() {
  const [modo,     setModo]     = useState("login")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [nombre,   setNombre]   = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")
  const [mensaje,  setMensaje]  = useState("")

  const reset = () => { setError(""); setMensaje("") }

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá email y contraseña."); return }
    setCargando(true); reset()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes("Email not confirmed"))
        setError("Confirmá tu email primero. Revisá tu Gmail.")
      else
        setError("Email o contraseña incorrectos.")
    }
    setCargando(false)
  }

  const handleRegistro = async () => {
    if (!email || !password || !nombre) { setError("Completá todos los campos."); return }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (whatsapp && !/^[0-9]{10,15}$/.test(whatsapp.replace(/\D/g, ''))) {
      setError("WhatsApp: ingresá solo números (código país + número, sin espacios, ej: 5491123456789).")
      return
    }
    setCargando(true); reset()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { 
        data: { 
          nombre_empresa: nombre,
          whatsapp: whatsapp || null 
        } 
      }
    })
    if (error) {
      setError(error.message.includes("already registered")
        ? "Este email ya está registrado. Iniciá sesión."
        : error.message)
    } else if (data?.user?.identities?.length === 0) {
      setError("Este email ya está registrado. Iniciá sesión.")
    } else {
      setMensaje("✅ Cuenta creada. Revisá tu Gmail para confirmar tu email.")
      setModo("login")
    }
    setCargando(false)
  }

  const IC = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-all"

  return (
    <div className="min-h-screen bg-[#080d0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-xl mx-auto mb-4">R</div>
          <h1 className="text-2xl font-black text-white">RindeMás</h1>
          <p className="text-white/35 text-sm mt-1">Gestión integral para contratistas rurales</p>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {["login","registro"].map(m => (
              <button key={m} onClick={() => { setModo(m); reset() }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${modo===m ? "bg-emerald-500 text-white" : "text-white/35 hover:text-white/60"}`}>
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>
          {modo === "registro" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">Nombre de empresa</label>
                <input className={IC} placeholder="ej: Contratista Rural SRL" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">WhatsApp (con código país, sin espacios)</label>
                <input className={IC} type="tel" placeholder="ej: 5491123456789" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                <p className="text-white/20 text-xs mt-1">Para recibir notificaciones de repuestos</p>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">Email</label>
            <input className={IC} type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key==="Enter" && (modo==="login" ? handleLogin() : handleRegistro())} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">Contraseña</label>
            <input className={IC} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key==="Enter" && (modo==="login" ? handleLogin() : handleRegistro())} />
          </div>
          {error   && <p className="text-red-400 text-sm bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          {mensaje && <p className="text-emerald-400 text-sm bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">{mensaje}</p>}
          <button onClick={modo==="login" ? handleLogin : handleRegistro} disabled={cargando}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-sm transition-all">
            {cargando ? "Cargando..." : modo==="login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">RindeMás v1.0 · Beta</p>
      </div>
    </div>
  )
}