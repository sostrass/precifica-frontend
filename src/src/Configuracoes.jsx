import { useState, useEffect } from 'react'
import {
  Plug, SlidersHorizontal, Store, Plus, Trash2, Save, RotateCcw, Power, Info, Stethoscope,
  Webhook, Copy, Check, RefreshCw, Radio,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

export default function Configuracoes() {
  const notify = useToast()
  const [cfg, setCfg] = useState(null)
  const [bling, setBling] = useState({ autorizado: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.precificacaoConfig().then(setCfg).catch((e) => notify(e.message, 'danger'))
    api.blingStatus().then(setBling).catch(() => {})
  }, [])

  if (!cfg) return <div className="text-dim text-sm p-4">Carregando configurações…</div>

  const setGlobal = (campo, valor) => setCfg({ ...cfg, [campo]: valor })
  const setCanal = (i, patch) => {
    const canais = cfg.canais.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    setCfg({ ...cfg, canais })
  }
  const setFaixa = (ci, fi, campo, valor) => {
    const canais = cfg.canais.map((c, idx) => {
      if (idx !== ci) return c
      const faixas = c.faixas.map((f, j) => (j === fi ? { ...f, [campo]: valor } : f))
      return { ...c, faixas }
    })
    setCfg({ ...cfg, canais })
  }
  const addFaixa = (ci) =>
    setCanal(ci, { faixas: [...cfg.canais[ci].faixas, { ate: '', comissao: 0, fixo: 0, fixo_pct: 0 }] })
  const removeFaixa = (ci, fi) =>
    setCanal(ci, { faixas: cfg.canais[ci].faixas.filter((_, j) => j !== fi) })

  const salvar = async () => {
    setSaving(true)
    try {
      const payload = {
        ...cfg,
        canais: cfg.canais.map((c) => ({
          ...c,
          faixas: c.faixas.map((f) => ({
            ate: f.ate === '' || f.ate == null ? null : Number(f.ate),
            comissao: Number(f.comissao) || 0,
            fixo: Number(f.fixo) || 0,
            fixo_pct: Number(f.fixo_pct) || 0,
          })),
        })),
      }
      const saved = await api.salvarPrecificacaoConfig(payload)
      setCfg(saved)
      notify('Configurações salvas', 'ok')
    } catch (e) {
      notify(e.message, 'danger')
    }
    setSaving(false)
  }

  const restaurar = async () => {
    try {
      const r = await api.restaurarPrecificacao()
      setCfg(r)
      notify('Padrões restaurados', 'ok')
    } catch (e) {
      notify(e.message, 'danger')
    }
  }

  const conectarBling = async () => {
    try {
      const { url } = await api.blingLogin()
      window.location.href = url
    } catch (e) {
      notify(e.message, 'danger')
    }
  }
  const blingOk = bling.autorizado && !bling.expirado

  return (
    <div className="space-y-4 max-w-5xl pb-20">
      {/* Integrações */}
      <Card icon={<Plug size={18} />} titulo="Integrações">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: blingOk ? 'var(--ok)' : 'var(--faint)' }} />
            <div>
              <div className="text-sm font-medium">Bling ERP</div>
              <div className="text-xs text-dim">{blingOk ? 'Conta autorizada — catálogo e NF-e disponíveis' : 'Não conectado — conecte para puxar seu catálogo'}</div>
            </div>
          </div>
          <button
            onClick={conectarBling}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white flex items-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            <Plug size={15} /> {blingOk ? 'Reconectar' : 'Conectar Bling'}
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-glassb text-xs text-faint flex items-start gap-2">
          <Info size={13} className="mt-0.5 shrink-0" />
          A IA (descrições, SAC, imagens) usa o Gemini configurado no servidor. Suas chaves nunca ficam no navegador.
        </div>
      </Card>

      {/* Webhooks */}
      <Webhooks />

      {/* Custos globais */}
      <Card icon={<SlidersHorizontal size={18} />} titulo="Custos globais">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <Num label="Imposto (%)" value={cfg.imposto} onChange={(v) => setGlobal('imposto', v)} />
          <Num label="Cartão / gateway (%)" value={cfg.cartao} onChange={(v) => setGlobal('cartao', v)} />
          <Num label="Embalagem (R$)" value={cfg.embalagem} onChange={(v) => setGlobal('embalagem', v)} />
          <Num label="Frete médio (R$)" value={cfg.frete} onChange={(v) => setGlobal('frete', v)} />
          <Num label="Margem padrão (%)" value={cfg.margem_padrao} onChange={(v) => setGlobal('margem_padrao', v)} />
        </div>
        <p className="text-xs text-faint mt-3">
          Imposto e cartão incidem sobre o preço de venda. Embalagem e frete somam ao custo do produto.
        </p>
      </Card>

      {/* Marketplaces / Taxas */}
      <Card icon={<Store size={18} />} titulo="Marketplaces e taxas por faixa de preço">
        <p className="text-xs text-faint mb-3 -mt-1">
          As taxas de 2026 mudam conforme o preço do produto. Cada faixa vale até o valor em "Até R$"
          (deixe vazio para "sem teto"). Os padrões são uma referência atual — ajuste para a sua categoria e reputação.
        </p>
        <div className="space-y-3">
          {cfg.canais.map((c, ci) => (
            <div key={c.canal} className={`rounded-xl border border-glassb p-3 ${c.ativo ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{c.nome}</div>
                <button
                  onClick={() => setCanal(ci, { ativo: !c.ativo })}
                  className="text-xs flex items-center gap-1.5 rounded-lg px-2.5 py-1 glass"
                  style={{ color: c.ativo ? 'var(--ok)' : 'var(--faint)' }}
                  title={c.ativo ? 'Ativo' : 'Inativo'}
                >
                  <Power size={13} /> {c.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {/* Cabeçalho da tabela */}
              <div className="grid items-center gap-2 text-[10px] uppercase tracking-wide text-faint px-1 mb-1"
                   style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 32px' }}>
                <span>Até R$</span><span>Comissão %</span><span>Fixo R$</span><span>Fixo %</span><span />
              </div>

              {c.faixas.map((f, fi) => (
                <div key={fi} className="grid items-center gap-2 mb-1.5"
                     style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 32px' }}>
                  <CellNum value={f.ate} placeholder="∞" onChange={(v) => setFaixa(ci, fi, 'ate', v)} />
                  <CellNum value={f.comissao} onChange={(v) => setFaixa(ci, fi, 'comissao', v)} />
                  <CellNum value={f.fixo} onChange={(v) => setFaixa(ci, fi, 'fixo', v)} />
                  <CellNum value={f.fixo_pct} onChange={(v) => setFaixa(ci, fi, 'fixo_pct', v)} />
                  <button
                    onClick={() => removeFaixa(ci, fi)}
                    className="grid place-items-center h-8 rounded-lg text-faint hover:text-danger"
                    title="Remover faixa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addFaixa(ci)}
                className="mt-1 text-xs text-accent flex items-center gap-1 hover:underline"
              >
                <Plus size={13} /> adicionar faixa
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Barra de ações */}
      <div className="flex items-center gap-3">
        <button
          onClick={salvar} disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          <Save size={16} /> {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
        <button
          onClick={restaurar}
          className="glass rounded-xl px-4 py-2.5 text-sm text-dim hover:text-fg flex items-center gap-2"
        >
          <RotateCcw size={15} /> Restaurar padrões
        </button>
      </div>

      <Diagnostico />
    </div>
  )
}

function Webhooks() {
  const notify = useToast()
  const [url, setUrl] = useState('')
  const [eventos, setEventos] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [loadingEv, setLoadingEv] = useState(false)

  useEffect(() => {
    api.webhookUrl().then((r) => setUrl(r.url)).catch(() => {})
    carregarEventos()
  }, [])

  const carregarEventos = async () => {
    setLoadingEv(true)
    try { setEventos((await api.webhookEventos()).eventos || []) } catch { /* vazio */ }
    setLoadingEv(false)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true); setTimeout(() => setCopiado(false), 1800)
      notify('URL copiada', 'ok')
    } catch { notify('Copie manualmente o endereço', 'danger') }
  }

  const fmtData = (iso) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
  }
  const recCor = (r) => ({ produto: 'var(--accent)', pedido_venda: 'var(--accent2)', nfe: '#C9A0FF', estoque: 'var(--warn)' }[r] || 'var(--faint)')

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 font-semibold mb-1"><span className="text-accent"><Webhook size={16} /></span> Webhooks (tempo real)</div>
      <p className="text-xs text-dim mb-4">Em vez de ficar consultando o Bling, ele <b>avisa o sistema na hora</b> que um produto, pedido, NF-e ou estoque muda. Cole a URL abaixo no Bling.</p>

      <div className="text-[11px] text-faint uppercase tracking-wide mb-1.5">Sua URL de callback</div>
      <div className="flex items-center gap-2 mb-4">
        <code className="flex-1 min-w-0 truncate bg-glass border border-glassb rounded-xl px-3 py-2.5 text-xs num">{url || 'carregando…'}</code>
        <button onClick={copiar} disabled={!url}
                className="rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-1.5 shrink-0"
                style={{ background: copiado ? 'var(--ok)' : 'var(--glass-hover)', color: copiado ? '#0A0C12' : 'var(--accent)', border: '1px solid var(--accent)' }}>
          {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <div className="rounded-xl border border-glassb p-3 text-xs text-dim space-y-2.5 mb-4">
        <div className="font-medium text-fg flex items-center gap-1.5"><Info size={13} /> Passo a passo completo</div>

        <div>
          <div className="font-medium text-fg mb-1">Etapa 1 — Habilitar os escopos no app (portal do desenvolvedor Bling)</div>
          <div className="text-faint">Sem os escopos, os recursos nem aparecem pra configurar webhook. No portal onde você criou o app:</div>
          <ul className="mt-1 space-y-0.5">
            {['Produtos', 'Pedidos de Vendas', 'Estoques', 'Notas Fiscais Eletrônicas'].map((e) => (
              <li key={e} className="flex items-center gap-1.5"><Check size={12} style={{ color: 'var(--accent2)' }} /> Escopo de <b className="text-fg">{e}</b></li>
            ))}
          </ul>
          <div className="text-faint mt-1">Salve e <b>reconecte o Bling</b> aqui no app (Conectar Bling) pra valer os novos escopos.</div>
        </div>

        <div>
          <div className="font-medium text-fg mb-1">Etapa 2 — Cadastrar o servidor</div>
          <div className="text-faint">No Bling: <b>Configurações → Webhooks → Configuração de servidores</b>. Em <b>Alias</b> coloque "Precifica AI" e em <b>URL</b> cole o endereço acima. Salve.</div>
        </div>

        <div>
          <div className="font-medium text-fg mb-1">Etapa 3 — Ligar cada recurso</div>
          <div className="text-faint">Em cada bloco (Produtos, Pedidos, Estoque, NF-e): ative o <b>toggle do webhook</b>, selecione o servidor "Precifica AI", marque <b>Criação, Atualização e Exclusão</b> e mantenha a versão <b>v1</b>.</div>
        </div>

        <div>
          <div className="font-medium text-fg mb-1">Etapa 4 — Testar</div>
          <div className="text-faint">Edite qualquer produto no Bling. Em segundos o evento aparece aqui embaixo e o status do produto vira "Sincronizado" na Ficha.</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-faint uppercase tracking-wide flex items-center gap-1.5"><Radio size={12} /> Eventos recebidos</div>
        <button onClick={carregarEventos} className="text-[11px] text-dim hover:text-fg flex items-center gap-1">
          <RefreshCw size={11} className={loadingEv ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
      {(eventos && eventos.length > 0) ? (
        <div className="space-y-1.5 max-h-52 overflow-auto">
          {eventos.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs border border-glassb rounded-lg px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: recCor(e.recurso) }} />
              <span className="font-medium">{e.recurso}</span>
              <span className="text-faint">{e.acao}</span>
              {e.entidade_id && <span className="num text-faint">#{e.entidade_id}</span>}
              <span className="flex-1" />
              <span className="text-faint num">{fmtData(e.recebido_em)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-faint border border-dashed border-glassb rounded-lg px-3 py-4 text-center">
          Nenhum evento ainda. Assim que você ativar no Bling e algo mudar lá, aparece aqui.
        </div>
      )}
    </div>
  )
}

function Diagnostico() {
  const [tipo, setTipo] = useState('produto')
  const [id, setId] = useState('')
  const [out, setOut] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const buscar = async () => {
    if (!id.trim()) return
    setCarregando(true); setOut('')
    try {
      const j = tipo === 'produto' ? await api.diagProduto(id.trim()) : await api.diagNfe(id.trim())
      setOut(JSON.stringify(j, null, 2))
    } catch (e) { setOut('ERRO: ' + e.message) }
    setCarregando(false)
  }
  const copiar = () => { navigator.clipboard.writeText(out); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }

  const verSistema = async () => {
    setCarregando(true); setOut('')
    try { setOut(JSON.stringify(await api.diagSistema(), null, 2)) }
    catch (e) { setOut('ERRO: ' + e.message) }
    setCarregando(false)
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold mb-1">
        <span className="text-accent"><Stethoscope size={16} /></span> Diagnóstico do Bling
      </div>
      <p className="text-xs text-dim mb-4">Mostra o JSON cru de um produto ou nota — use pra me mandar o dado real e eu construir as telas (fotos, canais, NF-e) sem chute.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-xs text-dim block mb-1">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent">
            <option value="produto">Produto</option>
            <option value="nfe">NF-e</option>
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[160px]">
          <span className="text-xs text-dim block mb-1">ID no Bling</span>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ex.: 26129483405"
                 className="w-full rounded-xl px-3 py-2 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent num" />
        </label>
        <button onClick={buscar} disabled={carregando}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--accent)' }}>
          {carregando ? 'Buscando…' : 'Buscar JSON'}
        </button>
        <button onClick={verSistema} disabled={carregando}
                className="rounded-xl px-3 py-2 text-sm text-dim hover:text-fg border border-glassb disabled:opacity-60">
          Sistema (banco)
        </button>
      </div>
      {out && (
        <div className="mt-3">
          <button onClick={copiar} className="text-xs text-accent hover:underline mb-1">{copiado ? 'copiado!' : 'copiar tudo'}</button>
          <textarea readOnly value={out} rows={12}
                    className="w-full rounded-xl px-3 py-2 text-[11px] num bg-glass border border-glassb text-dim outline-none resize-y" />
        </div>
      )}
    </div>
  )
}

function Card({ icon, titulo, children }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <span className="text-accent">{icon}</span> {titulo}
      </div>
      {children}
    </div>
  )
}

function Num({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs text-dim block mb-1">{label}</span>
      <input
        type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent num"
      />
    </label>
  )
}

function CellNum({ value, onChange, placeholder }) {
  return (
    <input
      type="number" value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-2 py-1.5 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent num"
    />
  )
}
