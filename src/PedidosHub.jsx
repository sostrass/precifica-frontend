import { useEffect, useState, lazy, Suspense } from 'react'
import { Package, ShoppingBag, Globe } from 'lucide-react'
import { api } from './api.js'
import { PedidosPainel } from './Shopee.jsx'

const PedidosML = lazy(() => import('./Pedidos.jsx'))

// Hub unificado de Pedidos — resolve a unificação ML ⇄ Shopee num só destino do menu.
// Reusa os módulos prontos: a Central ML (Pedidos.jsx) e a Central Shopee (PedidosPainel).
export default function PedidosHub({ inicial = 'ml' }) {
  const [aba, setAba] = useState(inicial)
  const [shopeeOk, setShopeeOk] = useState(null)
  useEffect(() => { api.shopeeStatus().then((s) => setShopeeOk(!!s?.ok)).catch(() => setShopeeOk(false)) }, [])
  useEffect(() => { setAba(inicial) }, [inicial])

  const ABAS = [
    { id: 'ml', label: 'Mercado Livre', icon: Globe, cor: '#F2C200' },
    { id: 'shopee', label: 'Shopee', icon: ShoppingBag, cor: '#EE4D2D' },
  ]

  return (
    <div className="space-y-3">
      {/* seletor de canal do hub */}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-1.5" style={{ border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(110deg, rgba(242,194,0,.35), rgba(238,77,45,.35)) border-box' }}>
        <div className="flex items-center gap-1.5 px-2">
          <Package size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-semibold hidden sm:inline">Pedidos</span>
          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: '#1a1008', background: 'linear-gradient(90deg,#F2C200,#EE4D2D)' }}>ML ⇄ Shopee</span>
        </div>
        <div className="flex-1" />
        {ABAS.map((a) => {
          const on = aba === a.id
          const Icon = a.icon
          return (
            <button key={a.id} onClick={() => setAba(a.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={on ? { background: a.cor, color: a.id === 'ml' ? '#1a1008' : '#fff', boxShadow: `0 6px 16px ${a.cor}44` } : { color: 'var(--dim)' }}>
              <Icon size={14} />
              {a.label}
              {a.id === 'shopee' && shopeeOk === false && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: on ? 'rgba(255,255,255,.25)' : 'rgba(255,122,122,.15)', color: on ? '#fff' : '#FF7A7A' }}>conectar</span>}
            </button>
          )
        })}
      </div>

      {/* central do canal escolhido */}
      <Suspense fallback={<div className="text-dim text-sm p-4">Carregando central de pedidos…</div>}>
        {aba === 'ml' ? <PedidosML /> : <PedidosPainel conectado={shopeeOk} />}
      </Suspense>
    </div>
  )
}
