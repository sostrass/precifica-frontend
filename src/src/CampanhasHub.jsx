import { useEffect, useState, lazy, Suspense } from 'react'
import { Tag, ShoppingBag, Globe } from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'
import { Promocoes as CampanhasShopee, AgenteOfertas as MotorShopee } from './Shopee.jsx'

const CampanhasML = lazy(() => import('./Promocoes.jsx'))

// Hub unificado de Campanhas — mesmo padrão do hub de Pedidos.
// Shopee traz o módulo COMPLETO (Central, Descontos, Cupons, Bundle, Add-on, Flash, motor/Sala de Comando).
export default function CampanhasHub({ inicial = 'shopee' }) {
  const notify = useToast()
  const [aba, setAba] = useState(inicial)
  const [shopeeView, setShopeeView] = useState('campanhas') // campanhas | motor
  const [shopeeOk, setShopeeOk] = useState(null)
  useEffect(() => { api.shopeeStatus().then((s) => setShopeeOk(!!s?.ok)).catch(() => setShopeeOk(false)) }, [])

  const ABAS = [
    { id: 'shopee', label: 'Shopee', icon: ShoppingBag, cor: '#EE4D2D' },
    { id: 'ml', label: 'Mercado Livre', icon: Globe, cor: '#F2C200' },
  ]

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-1.5 flex items-center gap-1.5" style={{ border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(110deg, rgba(238,77,45,.35), rgba(242,194,0,.35)) border-box' }}>
        <div className="flex items-center gap-1.5 px-2">
          <Tag size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-semibold hidden sm:inline">Campanhas</span>
          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: '#1a1008', background: 'linear-gradient(90deg,#F2C200,#EE4D2D)' }}>ML ⇄ Shopee</span>
        </div>
        <div className="flex-1" />
        {ABAS.map((a) => {
          const on = aba === a.id
          const Icon = a.icon
          return (
            <button key={a.id} onClick={() => setAba(a.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={on ? { background: a.cor, color: a.id === 'ml' ? '#1a1008' : '#fff', boxShadow: `0 6px 16px ${a.cor}44` } : { color: 'var(--dim)' }}>
              <Icon size={14} />{a.label}
              {a.id === 'shopee' && shopeeOk === false && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: on ? 'rgba(255,255,255,.25)' : 'rgba(255,122,122,.15)', color: on ? '#fff' : '#FF7A7A' }}>conectar</span>}
            </button>
          )
        })}
      </div>

      <Suspense fallback={<div className="text-dim text-sm p-4">Carregando campanhas…</div>}>
        {aba === 'ml' ? <CampanhasML />
          : shopeeView === 'motor'
            ? <div className="space-y-3"><button onClick={() => setShopeeView('campanhas')} className="text-[11px] text-dim hover:text-fg flex items-center gap-1.5">← voltar às campanhas</button><MotorShopee conectado={shopeeOk} notify={notify} /></div>
            : <CampanhasShopee conectado={shopeeOk} notify={notify} irParaMotor={() => setShopeeView('motor')} />}
      </Suspense>
    </div>
  )
}
