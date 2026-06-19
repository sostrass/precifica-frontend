import { useEffect, useState } from 'react'
import { Boxes, Percent, AlertTriangle } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'

export default function Dashboard() {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .monitoramento({ custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre' })
      .then((d) => setItens(d.itens || []))
      .catch((e) => setErro(e.message))
  }, [])

  if (erro) return <Painel>{erro}</Painel>
  if (!itens) return <Painel>Carregando…</Painel>
  if (itens.length === 0)
    return <Painel>Nenhum produto ainda. Conecte o Bling e sincronize o catálogo.</Painel>

  const total = itens.length
  const ideal = itens.filter((i) => i.status === 'lucro_ideal').length
  const atencao = itens.filter((i) => i.status === 'atencao').length
  const critico = itens.filter((i) => i.status === 'critico').length
  const margemMedia = (itens.reduce((s, i) => s + (i.margem_liquida || 0), 0) / total).toFixed(1)

  const dados = [
    { nome: 'Ideal (>=30%)', valor: ideal, cor: 'var(--ok)' },
    { nome: 'Atencao (15-30%)', valor: atencao, cor: 'var(--warn)' },
    { nome: 'Critico (<15%)', valor: critico, cor: 'var(--danger)' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi icon={<Boxes size={20} />} label="Produtos monitorados" valor={total} />
        <Kpi icon={<Percent size={20} />} label="Margem liquida media (ML)" valor={`${margemMedia}%`} />
        <Kpi icon={<AlertTriangle size={20} />} label="Margem critica" valor={critico} cor="var(--danger)" />
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold mb-1">Distribuicao de margem</h3>
        <p className="text-xs text-dim mb-4">
          Margem liquida real por canal, depois de comissao, taxa fixa, imposto e cartao.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <Donut data={dados} total={total} />
          <div className="space-y-2">
            {dados.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: d.cor }} />
                <span className="text-dim">{d.nome}</span>
                <span className="num font-semibold ml-1">{d.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Donut({ data, total, size = 220, stroke = 34 }) {
  const soma = data.reduce((s, d) => s + d.valor, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          const dash = (d.valor / soma) * c
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.cor}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc}
            />
          )
          acc += dash
          return el
        })}
      </g>
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fontSize="30" fontWeight="700" fill="var(--text)">
        {total}
      </text>
      <text x="50%" y="60%" textAnchor="middle" fontSize="11" fill="var(--dim)">
        produtos
      </text>
    </svg>
  )
}

function Kpi({ icon, label, valor, cor }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'var(--accent)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-dim uppercase tracking-wide truncate">{label}</div>
        <div className="text-2xl font-display font-bold num" style={cor ? { color: cor } : undefined}>
          {valor}
        </div>
      </div>
    </div>
  )
}

const Painel = ({ children }) => <div className="glass rounded-2xl p-10 text-center text-dim">{children}</div>
