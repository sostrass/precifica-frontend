import { useEffect, useState } from 'react'
import {
  X, Save, Tag, Check, Sparkles, Loader2, Gauge, ShieldCheck, AlertCircle,
  Image as ImageIcon, Boxes, Wand2, FileText, Users, Target, ExternalLink, RefreshCw,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const brl = (v) => (v == null || v === '' ? '—' : 'R$ ' + Number(v).toFixed(2).replace('.', ','))

export default function ProdutoModal({ produtoId, onClose, onSaved }) {
  const notify = useToast()
  const [d, setD] = useState(null)
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)
  const [aplicando, setAplicando] = useState(null)
  const [tab, setTab] = useState('dados')
  const [conselho, setConselho] = useState(null)
  const [convocando, setConvocando] = useState(false)
  const [aplicado, setAplicado] = useState({})
  const [posic, setPosic] = useState(null)
  const [buscandoPos, setBuscandoPos] = useState(false)
  const [sinc, setSinc] = useState(null)
  const [sincLoading, setSincLoading] = useState(false)
  const [diag, setDiag] = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)

  const carregar = () => {
    setErro('')
    api.produtoDetalhe(produtoId)
      .then((x) => {
        setD(x)
        setForm({
          nome: x.nome ?? '', preco: x.preco ?? '', custo: x.custo ?? '',
          ncm: x.ncm ?? '', gtin: x.gtin ?? '',
          peso_bruto: x.peso_bruto ?? '', peso_liquido: x.peso_liquido ?? '',
          descricao_curta: x.descricao_curta ?? '', descricao_complementar: x.descricao_complementar ?? '',
        })
      })
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [produtoId])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const salvar = async (campos, msg) => {
    setSaving(true)
    try {
      await api.produtoAtualizar(produtoId, campos)
      notify(msg || 'Salvo no Bling', 'ok')
      carregar(); onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSaving(false)
  }

  const aplicarPreco = async (canal) => {
    setAplicando(canal.canal)
    try {
      await api.produtoAtualizar(produtoId, { preco: canal.preco_sugerido })
      notify(`Preço de ${canal.nome} aplicado: ${brl(canal.preco_sugerido)}`, 'ok')
      carregar(); onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(null)
  }

  const convocar = async () => {
    setConvocando(true)
    try { setConselho(await api.produtoConselho(produtoId)) }
    catch (e) { notify(e.message, 'danger') }
    setConvocando(false)
  }

  const aplicarMelhoria = async (item, idx) => {
    if (aplicado[idx] || !item.acao) return
    setAplicando('m' + idx)
    try {
      if (item.acao.campos) {
        await api.produtoAtualizar(produtoId, item.acao.campos)
        notify(`${item.titulo} — aplicado no Bling`, 'ok')
      } else if (item.acao.ia_campo) {
        const r = await api.iaCampo({ campo: item.acao.ia_campo, texto: form.descricao_complementar || form.descricao_curta, nome: form.nome })
        if (r?.texto) {
          await api.produtoAtualizar(produtoId, { descricao_complementar: r.texto })
          notify('Descrição reescrita pela IA e salva — ajuste na aba Cadastro se quiser', 'ok')
        }
      }
      setAplicado((a) => ({ ...a, [idx]: true }))
      carregar(); onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(null)
  }

  const buscarPosic = async (canal = 'mercado_livre') => {
    setBuscandoPos(true)
    try { setPosic(await api.produtoPosicionamento(produtoId, canal)) }
    catch (e) { notify(e.message, 'danger') }
    setBuscandoPos(false)
  }

  const carregarSinc = async () => {
    setSincLoading(true)
    try { setSinc(await api.produtoSincronizacao(produtoId)) }
    catch (e) { notify(e.message, 'danger') }
    setSincLoading(false)
  }

  const rodarDiag = async () => {
    setDiagLoading(true)
    try { setDiag(await api.diagnosticoPrecos(produtoId)) }
    catch (e) { notify(e.message, 'danger') }
    setDiagLoading(false)
  }

  const ABAS = [
    { id: 'dados', label: 'Dados', icon: Tag },
    { id: 'cad', label: 'Cadastro & SEO', icon: Gauge },
    { id: 'midia', label: 'Mídia', icon: ImageIcon },
    { id: 'preco', label: 'Preço', icon: Sparkles },
    { id: 'mercado', label: 'Mercado', icon: Target },
    { id: 'sinc', label: 'Sincronizar', icon: RefreshCw },
    { id: 'conselho', label: 'Conselho IA', icon: Users },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)' }}>
        <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Tag size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold truncate">{d?.nome || 'Carregando…'}</div>
            <div className="text-xs text-faint num">{d?.sku}</div>
          </div>
          <button onClick={onClose} className="text-dim hover:text-fg p-1"><X size={20} /></button>
        </div>

        {erro ? (
          <div className="p-8 text-center text-dim text-sm">{erro}</div>
        ) : !form ? (
          <div className="p-10 grid place-items-center text-dim"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="flex gap-1 px-5 pt-3 border-b overflow-x-auto" style={{ borderColor: 'var(--glass-border)' }}>
              {ABAS.map((a) => {
                const on = tab === a.id
                return (
                  <button key={a.id} onClick={() => setTab(a.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg border-b-2 transition whitespace-nowrap"
                          style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : { borderColor: 'transparent', color: 'var(--dim)' }}>
                    <a.icon size={14} /> {a.label}
                  </button>
                )
              })}
            </div>

            <div className="p-5">
              {tab === 'dados' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-lg border border-glassb flex items-center gap-1 text-dim"><Boxes size={12} /> Estoque: <b className="num text-fg">{d.estoque ?? '—'}</b></span>
                    {d.marca && <span className="px-2 py-1 rounded-lg border border-glassb text-dim">Marca: <b className="text-fg">{d.marca}</b></span>}
                    {d.unidade && <span className="px-2 py-1 rounded-lg border border-glassb text-dim">Unid.: <b className="text-fg">{d.unidade}</b></span>}
                    {d.dimensoes && (d.dimensoes.largura || d.dimensoes.altura) && (
                      <span className="px-2 py-1 rounded-lg border border-glassb text-dim num">{d.dimensoes.largura}×{d.dimensoes.altura}×{d.dimensoes.profundidade} cm</span>
                    )}
                  </div>
                  <Campo className="col-span-2" label="Nome" value={form.nome} onChange={(v) => set('nome', v)} />
                  <Campo label="Preço (R$)" type="number" value={form.preco} onChange={(v) => set('preco', v)} />
                  <Campo label="Custo (R$)" type="number" value={form.custo} onChange={(v) => set('custo', v)} />
                  <Campo label="NCM" value={form.ncm} onChange={(v) => set('ncm', v)} />
                  <Campo label="GTIN / EAN" value={form.gtin} onChange={(v) => set('gtin', v)} />
                  <Campo label="Peso bruto (kg)" type="number" value={form.peso_bruto} onChange={(v) => set('peso_bruto', v)} />
                  <Campo label="Peso líquido (kg)" type="number" value={form.peso_liquido} onChange={(v) => set('peso_liquido', v)} />
                  <div className="col-span-2">
                    <button onClick={() => salvar(form, 'Dados salvos no Bling')} disabled={saving}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar dados
                    </button>
                  </div>
                </div>
              )}

              {tab === 'cad' && (
                <div className="space-y-4">
                  <SaudePanel q={d.qualidade} />

                  <CampoIA label="Descrição curta" rows={4}
                           value={form.descricao_curta} onChange={(v) => set('descricao_curta', v)}
                           onSalvar={() => salvar({ descricao_curta: form.descricao_curta }, 'Descrição curta salva')}
                           saving={saving} produtoId={produtoId} nome={form.nome} campo="descrição curta" notify={notify} />

                  <CampoIA label="Descrição complementar" rows={3}
                           value={form.descricao_complementar} onChange={(v) => set('descricao_complementar', v)}
                           onSalvar={() => salvar({ descricao_complementar: form.descricao_complementar }, 'Descrição complementar salva')}
                           saving={saving} produtoId={produtoId} nome={form.nome} campo="descrição complementar" notify={notify} />

                  {(d.campos_customizados || []).length > 0 && (
                    <div>
                      <div className="text-xs text-dim mb-2 flex items-center gap-1.5"><FileText size={13} /> Campos customizados (Bling)</div>
                      <div className="grid grid-cols-2 gap-2">
                        {d.campos_customizados.map((c, i) => (
                          <div key={i} className="rounded-xl border border-glassb px-3 py-2">
                            <div className="text-[10px] text-faint uppercase tracking-wide truncate">{c.rotulo || 'campo'}</div>
                            <div className="text-sm truncate">{c.valor || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'midia' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-dim">Imagens cadastradas no Bling para este produto.</p>
                    <span className="text-xs text-faint num">{(d.fotos || []).length} foto(s)</span>
                  </div>
                  {(d.fotos || []).length === 0 ? (
                    <div className="text-sm text-dim text-center py-8 border border-dashed rounded-xl" style={{ borderColor: 'var(--glass-border)' }}>
                      Nenhuma imagem cadastrada neste produto.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {d.fotos.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer"
                           className="aspect-square rounded-xl overflow-hidden border border-glassb bg-glass block group relative">
                          <img src={src} alt={`Foto ${i + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          {i === 0 && <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-md text-white" style={{ background: 'var(--accent)' }}>capa</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'preco' && (
                <div>
                  <p className="text-xs text-dim mb-3">Base é o preço de venda (líquido seu). O sistema embute comissão, imposto, cartão, taxa fixa e embalagem por canal — o cliente paga.</p>
                  <div className="space-y-2">
                    {(d.precificacao || []).map((c) => (
                      <div key={c.canal} className="flex items-center gap-3 rounded-xl border border-glassb px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{c.nome}</div>
                          <div className="text-[11px] text-faint">líquido <span className="num text-fg">{brl(c.liquido)}</span> · margem {c.margem_sugerida == null ? '—' : c.margem_sugerida + '%'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-faint uppercase tracking-wide">preço de lista</div>
                          <div className="num font-semibold text-accent">{brl(c.preco_sugerido)}</div>
                        </div>
                        <button onClick={() => aplicarPreco(c)} disabled={aplicando === c.canal || c.preco_sugerido == null}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 shrink-0 disabled:opacity-50"
                                style={{ background: 'var(--glass-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                          {aplicando === c.canal ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aplicar
                        </button>
                      </div>
                    ))}
                    {(d.precificacao || []).length === 0 && (
                      <div className="text-sm text-dim text-center py-2">Nenhum canal ativo. Ative canais em Configurações.</div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'mercado' && (
                <div>
                  {!posic ? (
                    <div className="text-center py-6">
                      <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--accent)' }}>
                        <Target size={22} style={{ color: 'var(--accent)' }} />
                      </div>
                      <p className="text-sm text-dim mb-4 max-w-md mx-auto">A varredura busca este produto no marketplace pela descrição e mostra onde seu preço cai frente aos concorrentes.</p>
                      <button onClick={() => buscarPosic('mercado_livre')} disabled={buscandoPos}
                              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                        {buscandoPos ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />} Buscar no Mercado Livre
                      </button>
                    </div>
                  ) : posic.indisponivel ? (
                    <div className="text-sm text-dim text-center py-6">{posic.motivo}</div>
                  ) : (() => {
                    const p = posic.posicionamento
                    const lab = POS_LABEL[p.posicao] || { t: p.posicao, c: 'var(--dim)' }
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'var(--glass-hover)', color: lab.c, border: `1px solid ${lab.c}` }}>{lab.t}</span>
                          {p.concorrentes > 0 && <span className="text-xs text-dim">{p.concorrentes} concorrentes · busca “{posic.termo}”</span>}
                        </div>
                        {p.concorrentes > 0 && (
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <Stat label="mín" valor={brl(p.min)} />
                            <Stat label="mediana" valor={brl(p.mediana)} cor="var(--accent2)" />
                            <Stat label="máx" valor={brl(p.max)} />
                            <Stat label="seu preço" valor={brl(p.meu_preco)} cor={lab.c} />
                          </div>
                        )}
                        {posic.link_sugerido && (
                          <a href={posic.link_sugerido} target="_blank" rel="noreferrer" className="text-xs text-accent flex items-center gap-1.5 hover:underline">
                            <ExternalLink size={13} /> Melhor correspondência no canal
                          </a>
                        )}
                        <div className="space-y-1.5">
                          <div className="text-[11px] uppercase tracking-wide text-faint">Anúncios concorrentes</div>
                          {(posic.concorrentes || []).map((c, i) => (
                            <a key={i} href={c.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm border border-glassb rounded-xl px-3 py-2 hover:border-accent transition">
                              <span className="flex-1 truncate">{c.titulo}</span>
                              {c.vendidos != null && <span className="text-[10px] text-faint num">{c.vendidos} vend.</span>}
                              <span className="num font-medium">{brl(c.preco)}</span>
                            </a>
                          ))}
                          {(posic.concorrentes || []).length === 0 && <div className="text-xs text-faint">Nenhum concorrente encontrado para a busca.</div>}
                        </div>
                        <button onClick={() => buscarPosic('mercado_livre')} disabled={buscandoPos} className="text-xs text-dim hover:text-fg flex items-center gap-1.5">
                          {buscandoPos ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />} Buscar de novo
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}

              {tab === 'sinc' && (
                <div>
                  {!sinc ? (
                    <div className="text-center py-6">
                      <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--accent)' }}>
                        <RefreshCw size={22} style={{ color: 'var(--accent)' }} />
                      </div>
                      <p className="text-sm text-dim mb-4 max-w-md mx-auto">Preço de lista alvo por canal (preserva seu líquido) e o status frente ao que está registrado.</p>
                      <button onClick={carregarSinc} disabled={sincLoading}
                              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                        {sincLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Carregar sincronização
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-xs text-dim">Base de venda (líquido): <b className="num text-fg">{brl(sinc.base_venda)}</b></div>
                      <div className="space-y-2">
                        {(sinc.canais || []).map((c, i) => {
                          const st = SINC_STATUS[c.status] || { t: c.status, c: 'var(--dim)' }
                          return (
                            <div key={i} className="flex items-center gap-3 border border-glassb rounded-xl px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{c.nome}</div>
                                <div className="text-[11px] text-faint">
                                  {c.preco_registrado != null && <>registrado <span className="num">{brl(c.preco_registrado)}</span> · </>}
                                  líquido <span className="num text-fg">{brl(c.liquido)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-faint uppercase tracking-wide">alvo</div>
                                <div className="num font-semibold text-accent">{brl(c.preco_alvo)}</div>
                              </div>
                              <span className="text-[10px] px-2 py-1 rounded-md font-medium shrink-0" style={{ background: 'var(--glass-hover)', color: st.c, border: `1px solid ${st.c}` }}>{st.t}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="rounded-xl border border-glassb p-3 text-[11px] text-dim">
                        Os preços <b>registrados por canal</b> são lidos quando confirmarmos onde o Bling os guarda nesta conta.
                        <button onClick={rodarDiag} disabled={diagLoading} className="ml-1 inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                          {diagLoading ? <Loader2 size={11} className="animate-spin" /> : <AlertCircle size={11} />} Diagnosticar fonte
                        </button>
                        {diag && (
                          <pre className="mt-2 max-h-40 overflow-auto text-[10px] bg-glass rounded-lg p-2" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(diag.tabelas_precos, null, 1)}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'conselho' && (
                <div>
                  {!conselho ? (
                    <div className="text-center py-6">
                      <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                        <Users size={22} className="text-white" />
                      </div>
                      <p className="text-sm text-dim mb-4 max-w-md mx-auto">Comercial, Catálogo, Mídia e Conteúdo deliberam sobre este produto com base nos dados reais — e entregam um plano. Cada melhoria você aplica com um clique.</p>
                      <button onClick={convocar} disabled={convocando}
                              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-60"
                              style={{ background: 'linear-gradient(180deg, var(--accent2), var(--accent))' }}>
                        {convocando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Convocar conselho
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {conselho.falas.map((f, i) => (
                          <div key={i} className="flex gap-2.5">
                            <div className="h-7 w-7 rounded-lg grid place-items-center text-xs font-bold shrink-0"
                                 style={{ background: AGENTE_COR[f.agente] || 'var(--accent)', color: f.agente === 'Gerente' ? '#15140f' : '#15140f' }}>
                              {f.agente[0]}
                            </div>
                            <div className="flex-1 bg-glass border border-glassb rounded-xl rounded-tl-sm px-3 py-2">
                              <div className="text-[11px] text-dim mb-0.5">{f.papel}</div>
                              <div className="text-[13px]">{f.texto}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {conselho.plano.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-faint mb-2 flex items-center gap-2">
                            Plano do conselho — aplique com um clique
                            <span className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
                          </div>
                          <div className="space-y-2">
                            {conselho.plano.map((p, i) => (
                              <div key={i} className="flex items-center gap-2.5 border border-glassb rounded-xl px-3 py-2.5">
                                <span className="text-[9px] font-bold uppercase px-1.5 py-1 rounded-md shrink-0" style={tipoStyle(p.tipo)}>{p.tipo}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px]">{p.titulo}</div>
                                  <div className="text-[11px] text-dim truncate">{p.detalhe}</div>
                                </div>
                                {p.acao ? (
                                  <button onClick={() => aplicarMelhoria(p, i)} disabled={aplicado[i] || aplicando === 'm' + i}
                                          className="rounded-lg px-3 py-1.5 text-xs font-medium shrink-0 inline-flex items-center gap-1 disabled:opacity-70"
                                          style={aplicado[i] ? { background: 'var(--ok)', color: '#0A0C12' } : { background: 'var(--glass-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                                    {aplicando === 'm' + i ? <Loader2 size={13} className="animate-spin" /> : aplicado[i] ? <Check size={13} /> : (p.acao.ia_campo ? <Wand2 size={13} /> : <Check size={13} />)}
                                    {aplicado[i] ? 'Aplicado' : 'Aplicar'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-faint shrink-0 px-2">manual</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={convocar} disabled={convocando} className="text-xs text-dim hover:text-fg flex items-center gap-1.5">
                        {convocando ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Reconvocar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CampoIA({ label, value, onChange, onSalvar, saving, produtoId, nome, campo, rows = 3, notify }) {
  const [ia, setIa] = useState(false)
  const recriar = async () => {
    setIa(true)
    try {
      const r = await api.iaCampo({ campo, texto: value, nome })
      if (r?.texto) onChange(r.texto)
      notify && notify(`${label} recriada pela IA — revise e salve`, 'ok')
    } catch (e) { notify && notify(e.message, 'danger') }
    setIa(false)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-dim">{label}</label>
        <button onClick={recriar} disabled={ia}
                className="text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded-lg disabled:opacity-60"
                style={{ background: 'var(--accent2-soft, rgba(79,227,201,.12))', color: 'var(--accent2)', border: '1px solid var(--accent2)' }}>
          {ia ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Recriar com IA
        </button>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
                className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent resize-y" />
      <button onClick={onSalvar} disabled={saving}
              className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar {label.toLowerCase()}
      </button>
    </div>
  )
}

function SaudePanel({ q }) {
  if (!q) return null
  const score = q.score ?? 0
  const cor = score >= 80 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--danger)'
  const r = 30, c = 2 * Math.PI * r, off = c * (1 - score / 100)
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <svg width="74" height="74" viewBox="0 0 74 74" className="shrink-0">
          <circle cx="37" cy="37" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="7" />
          <circle cx="37" cy="37" r={r} fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 37 37)" />
          <text x="37" y="42" textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--text)">{score}</text>
        </svg>
        <div>
          <div className="font-display font-semibold flex items-center gap-2" style={{ color: cor }}>
            {score >= 100 ? <ShieldCheck size={17} /> : <AlertCircle size={17} />} Saúde do cadastro
          </div>
          <p className="text-xs text-dim mt-0.5">Quanto deste anúncio está pronto para publicar e indexar bem.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(q.itens || []).map((it) => (
          <div key={it.chave} className="flex items-start gap-2 rounded-lg border border-glassb px-2.5 py-1.5">
            <span className="h-4 w-4 rounded-full grid place-items-center shrink-0 mt-0.5"
                  style={{ background: it.ok ? 'var(--ok)' : 'var(--glass-hover)', color: it.ok ? '#fff' : 'var(--danger)' }}>
              {it.ok ? <Check size={10} /> : <X size={10} />}
            </span>
            <div className="min-w-0">
              <div className="text-[12px]">{it.label}</div>
              {!it.ok && it.dica && <div className="text-[10px] text-faint">{it.dica}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-dim">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} step={type === 'number' ? 'any' : undefined}
             className="w-full mt-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
    </div>
  )
}

const AGENTE_COR = {
  Comercial: 'var(--accent)',
  QA: 'var(--accent2)',
  Mídia: '#FF9B7A',
  Conteúdo: '#C9A0FF',
  Gerente: '#EDEAE2',
}

function tipoStyle(tipo) {
  const m = {
    'preço': ['rgba(230,180,80,.16)', 'var(--accent)'],
    'descrição': ['rgba(79,227,201,.16)', 'var(--accent2)'],
    'cadastro': ['rgba(201,160,255,.16)', '#C9A0FF'],
    'mídia': ['rgba(255,111,111,.16)', 'var(--danger)'],
  }
  const [bg, color] = m[tipo] || ['var(--glass-hover)', 'var(--dim)']
  return { background: bg, color }
}

const POS_LABEL = {
  competitivo: { t: 'Competitivo', c: 'var(--accent2)' },
  mais_barato: { t: 'Mais barato do mercado', c: 'var(--accent2)' },
  acima_media: { t: 'Acima da média', c: 'var(--accent)' },
  acima_mercado: { t: 'Acima do mercado', c: 'var(--danger)' },
  sem_dados: { t: 'Sem dados de concorrentes', c: 'var(--dim)' },
  sem_preco: { t: 'Sem preço definido', c: 'var(--dim)' },
}

function Stat({ label, valor, cor }) {
  return (
    <div className="rounded-xl border border-glassb py-2">
      <div className="text-[10px] text-faint uppercase tracking-wide">{label}</div>
      <div className="num text-sm font-semibold" style={cor ? { color: cor } : undefined}>{valor}</div>
    </div>
  )
}

const SINC_STATUS = {
  sincronizado: { t: 'Sincronizado', c: 'var(--accent2)' },
  divergente: { t: 'Divergente', c: 'var(--danger)' },
  sem_registro: { t: 'Alvo calculado', c: 'var(--accent)' },
}
