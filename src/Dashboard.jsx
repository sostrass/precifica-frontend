import { useEffect, useState } from 'react'
import { Boxes, TrendingUp, ShieldCheck, AlertTriangle, Plug } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'

export default function Dashboard() {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.monitoramento({ custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre' })
      .then((d) => setItens(d.itens || []))
      .catch((e) => setErro(e.message))
  }, [])

  if (!itens && !erro) return <Skeleton />
  if (erro || (itens && itens.length === 0)) return <SemDados />

  const total = itens.length
  const ideal = itens.filter((i) => i.status === 'lucro_ideal').length
  const atencao = itens.filter((i) => i.status === 'atencao').length
  const critico = itens.filter((i) => i.status === 'critico').length
  const margemMedia = (itens.reduce((s, i) => s + (i.margem_liquida || 0), 0) / total).toFixed(1)

  const dist = [
    { nome: 'Saudável', valor: ideal, cor: 'var(--ok)' },
    { nome: 'Atenção', valor: atencao, cor: 'var(--warn)' },
    { nome: 'Crítico', valor: critico, cor: 'var(--danger)' },
  ]
  const risco = itens
    .filter((i) => i.status !== 'lucro_ideal')
    .sort((a, b) => (a.margem_liquida || 0) - (b.margem_liquida || 0))
    .slice(0, 6)

  return (
    <div className="space-y-4 max-w-6xl">
      {/* KPIs */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Kpi icon={<Boxes size={18} />} label="Produtos monitorados" valor={total} cor="var(--accent)" />
        <Kpi icon={<TrendingUp size={18} />} label="Margem média (ML)" valor={`${margemMedia}%`} cor="var(--accent2)" />
        <Kpi icon={<ShieldCheck size={18} />} label="Saudáveis" valor={ideal} cor="var(--ok)" />
        <Kpi icon={<AlertTriangle size={18} />} label="Críticos" valor={critico} cor="var(--danger)" />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1fr)' }}>
        {/* Saúde da margem */}
        <div className="glass rounded-2xl p-6">
          <div className="font-semibold text-sm">Saúde da margem</div>
          <p className="text-xs text-dim mt-1 mb-4">Margem líquida real por canal, após comissão, taxa fixa, imposto e cartão.</p>
          <div className="flex items-center gap-6">
            <Donut data={dist} total={total} />
            <div className="space-y-2.5 flex-1">
              {dist.map((d) => {
                const p = total ? Math.round((d.valor / total) * 100) : 0
                return (
                  <div key={d.nome}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.cor }} />
                      <span className="text-dim">{d.nome}</span>
                      <span className="ml-auto num font-semibold">{d.valor}</span>
                      <span className="num text-faint text-xs w-9 text-right">{p}%</span>
                    </div>
                    <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: d.cor, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Precisam de atenção */}
        <div className="glass rounded-2xl p-6">
          <div className="font-semibold text-sm mb-3">Precisam de atenção</div>
          {risco.length === 0 ? (
            <div className="text-sm text-dim flex items-center gap-2 py-6 justify-center">
              <ShieldCheck size={18} className="text-ok" /> Tudo no azul — nenhum produto no vermelho.
            </div>
          ) : (
            <div className="space-y-1.5">
              {risco.map((i) => {
                const cor = i.status === 'critico' ? 'var(--danger)' : 'var(--warn)'
                return (
                  <div key={i.id} className="flex items-center gap-3 rounded-xl border border-glassb px-3 py-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cor }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{i.nome}</div>
                      <div className="text-[11px] text-faint num">{i.sku}</div>
                    </div>
                    <div className="num font-semibold text-sm" style={{ color: cor }}>
                      {Number(i.margem_liquida || 0).toFixed(1)}%
                    </div>
                  </div>
                )
              })}
              <p className="text-[11px] text-faint pt-1">Ajuste estes no Catálogo ou na Precificação para subir a margem.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Donut({ data, total, size = 180, stroke = 26 }) {
  const soma = data.reduce((s, d) => s + d.valor, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ativos = data.filter((d) => d.valor > 0).length
  const gap = ativos > 1 ? 0.012 * c : 0
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          if (d.valor <= 0) return null
          const dash = Math.max((d.valor / soma) * c - gap, 0)
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.cor}
                    strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} />
          )
          acc += (d.valor / soma) * c
          return el
        })}
      </g>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize="30" fontWeight="700" fill="var(--text)">{total}</text>
      <text x="50%" y="61%" textAnchor="middle" fontSize="11" fill="var(--dim)">produtos</text>
    </svg>
  )
}

function Kpi({ icon, label, valor, cor }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: cor + '22', color: cor }}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] text-dim uppercase tracking-wide truncate">{label}</div>
        <div className="text-xl font-display font-bold num" style={{ color: cor }}>{valor}</div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 max-w-6xl animate-pulse">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-20" />)}
      </div>
      <div className="glass rounded-2xl h-64" />
    </div>
  )
}

function SemDados() {
  return (
    <div className="glass rounded-2xl p-10 grid place-items-center text-center max-w-6xl">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
        <Plug size={26} className="text-white" />
      </div>
      <div className="font-display font-semibold text-lg">Conecte o Bling para ver o panorama</div>
      <div className="text-sm text-dim mt-1 max-w-md">
        Assim que sua conta Bling estiver autorizada, o catálogo sincroniza e o dashboard mostra a saúde de margem dos seus produtos.
      </div>
    </div>
  )
}
