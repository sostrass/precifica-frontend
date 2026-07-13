import qrcode from 'qrcode-generator'
import { SPX_LOGO, ICONS } from './src/printAssets.js'
import fs from 'fs'
const LARANJA = '#EE4D2D'
const localStorage = { getItem(){return null}, setItem(){} }
const STATUS_PT = {
  UNPAID: 'Não pago', READY_TO_SHIP: 'A enviar', PROCESSED: 'Processado', RETRY_SHIP: 'Reenviar',
  SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A confirmar', COMPLETED: 'Concluído',
  IN_CANCEL: 'Em cancelamento', CANCELLED: 'Cancelado', TO_RETURN: 'Devolução',
}
const statusPt = (st) => STATUS_PT[String(st || '').toUpperCase()] || st || '—'
const ehCancelado = (st) => ['CANCELLED', 'IN_CANCEL', 'TO_RETURN'].includes(String(st || '').toUpperCase())
const corStatus = (st) => {
  const s = String(st || '').toUpperCase()
  if (ehCancelado(s)) return '#FF6F6F'
  if (s === 'COMPLETED') return '#2DD4BF'
  if (s === 'READY_TO_SHIP' || s === 'PROCESSED') return LARANJA
  return 'var(--text-dim)'
}

// Etiquetas já impressas (persistência local por order_sn)
const LS_ETIQ = 'shopee_etiquetas_impressas'
const lerImpressas = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_ETIQ) || '[]')) } catch { return new Set() } }
const gravarImpressas = (s) => { try { localStorage.setItem(LS_ETIQ, JSON.stringify([...s].slice(-3000))) } catch (_) {} }

// Código de barras Code128-B → string SVG (autossuficiente, sem dependência externa)
const C128B = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112']
function code128Widths(texto) {
  const s = String(texto || '').replace(/[^\x20-\x7e]/g, '')
  if (!s) return null
  let soma = 104; const codes = [104]
  for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 32; codes.push(v); soma += v * (i + 1) }
  codes.push(soma % 103); codes.push(106)
  return codes.map((c) => C128B[c]).join('')
}
function barcodeSVG(valor, { height = 46, modulo = 1.5, texto = true } = {}) {
  const w = code128Widths(valor)
  if (!w) return ''
  let x = 8, rects = ''  // quiet zone
  for (let i = 0; i < w.length; i++) {
    const ww = parseInt(w[i], 10) * modulo
    if (i % 2 === 0) rects += `<rect x="${x.toFixed(1)}" y="0" width="${ww.toFixed(1)}" height="${height}" fill="#000"/>`
    x += ww
  }
  const total = x + 8
  const th = texto ? 15 : 0
  const t = texto ? `<text x="${(total / 2).toFixed(1)}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="1">${valor}</text>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total.toFixed(1)}" height="${height + th}" viewBox="0 0 ${total.toFixed(1)} ${height + th}">${rects}${t}</svg>`
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// A Shopee mascara dados pessoais (nome/endereço/tel) como "****". Detecta isso pra não imprimir lixo.
const mascarado = (s) => { const t = String(s ?? '').replace(/[\s·\/\-.,]/g, ''); return !t || /^\*+$/.test(t) }

/* ===== Helpers visuais para impressão (etiqueta + folha) ===== */
// Dados do remetente/emitente — TODO: puxar da config da conta. Ajuste com os dados reais.
const REMETENTE_NOME = 'Sóstrass Acessórios e Pedrarias'
const REMETENTE_END = 'Rua Comendador, 120 · Limeira - SP · CEP 13480-000'
const REMETENTE_CNPJ = '00.000.000/0000-00'

// Config de impressão (Módulo 2). É preenchida pela conta via painel "Personalizar impressão".
// As funções de impressão leem daqui por padrão; a prévia ao vivo passa um cfg explícito.
const PRINT_CFG_PADRAO = {
  emitente_nome: '', emitente_cnpj: '', emitente_endereco: '', emitente_cidade: '',
  mostrar_timeline: true, mostrar_nfe: true, mostrar_rastreio: true, mostrar_destinatario: true,
  mostrar_miniaturas: true, mostrar_complemento: true, mostrar_nota_comprador: true,
  mostrar_codigo_barras: true, mostrar_qr: true,
}
let PRINT_CFG = { ...PRINT_CFG_PADRAO }
function setPrintCfg(c) { PRINT_CFG = { ...PRINT_CFG_PADRAO, ...(c || {}) } }
// resolve emitente: usa o que a conta configurou; cai no placeholder se vazio
const emitNome = (cfg) => (cfg.emitente_nome || REMETENTE_NOME)
const emitCnpjCidade = (cfg) => {
  const cnpj = cfg.emitente_cnpj ? `CNPJ ${cfg.emitente_cnpj}` : `CNPJ ${REMETENTE_CNPJ}`
  const cid = cfg.emitente_cidade || 'Limeira/SP'
  return `${cnpj} · ${cid}`
}
const emitEndereco = (cfg) => {
  const e = [cfg.emitente_endereco, cfg.emitente_cidade].filter(Boolean).join(' · ')
  return e || REMETENTE_END
}

// Ícone lucide inline (paths em printAssets.ICONS)
function ico(nome, size = 14, cor = '#14151a', sw = 2) {
  const p = ICONS[nome] || ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${p}</svg>`
}
// Logo Precifica AI (símbolo gradiente + wordmark) — divulga o app no rodapé
function logoPrecifica(scale = 1) {
  const s = scale
  return `<span class="pfl"><span class="pfmark" style="width:${Math.round(18 * s)}px;height:${Math.round(18 * s)}px">${ico('sparkles', Math.round(11 * s), '#fff', 2.2)}</span><span class="pfwm" style="font-size:${Math.round(13 * s)}px">Precifica<b>AI</b></span></span>`
}
// QR vetorial (scalable) — tamanho controlado por CSS no container
function qrSvg(texto) {
  try {
    const qr = qrcode(0, 'M'); qr.addData(String(texto || '')); qr.make()
    return qr.createSvgTag({ cellSize: 1, margin: 0, scalable: true })
  } catch (_) { return '' }
}
// Status Shopee → estágios da timeline (com qual está em andamento)
function estagiosTimeline(status) {
  const s = String(status || '').toUpperCase()
  let cur = 2 // padrão: separação
  if (s === 'UNPAID') cur = 1
  else if (s === 'READY_TO_SHIP' || s === 'PROCESSED' || s === 'RETRY_SHIP') cur = 2
  else if (s === 'SHIPPED') cur = 3
  else if (s === 'TO_CONFIRM_RECEIVE') cur = 4
  else if (s === 'COMPLETED') cur = 5
  const defs = [['Pedido Criado', 'receipt'], ['Pagamento', 'dollar-sign'], ['Separação', 'package'], ['Enviado', 'truck'], ['Entregue', 'map-pin']]
  return defs.map((d, i) => ({ label: d[0], icon: d[1], estado: i < cur ? 'done' : (i === cur ? 'current' : 'pending') }))
}
// HTML da timeline (compacta na etiqueta, normal na folha)
function timelineHTML(status, compact = false) {
  const nodes = estagiosTimeline(status).map((e) => {
    const cor = (e.estado === 'done' || e.estado === 'current') ? '#fff' : '#b6bac2'
    const sz = compact ? 11 : 16
    return `<div class="tn ${e.estado}"><div class="tcirc">${ico(e.icon, sz, cor, 2.2)}</div><div class="tlab">${e.label}</div></div>`
  }).join('')
  return `<div class="tl ${compact ? 'cmp' : ''}">${nodes}</div>`
}
function htmlFolhaPedido(p, cfg = PRINT_CFG) {
  const end = p.endereco || {}
  const enderecoLinha = [end.completo, [end.cidade, end.uf].filter(Boolean).join('/'), end.cep ? 'CEP ' + end.cep : ''].filter(Boolean).join(' · ')
  const totU = (p.itens || []).reduce((s, i) => s + (i.qtd || 0), 0)
  const nItens = (p.itens || []).length
  const rows = (p.itens || []).map((it) => `
    <div class="row">
      ${cfg.mostrar_miniaturas ? `<div class="ph">${it.imagem ? `<img src="${esc(it.imagem)}">` : ico('image', 17, '#c2c5cd')}</div>` : ''}
      <div class="cd">
        <div class="nm">${esc(it.nome) || '—'}</div>
        <div class="mt">${it.variacao ? `${ico('palette', 12, '#7a7f8b')}<b>${esc(it.variacao)}</b>` : ''}${it.variacao && it.sku ? '<span class="dt2">·</span>' : ''}${it.sku ? `${ico('hash', 11, '#9aa0ab')}<span class="sku">${esc(it.sku)}</span>` : ''}${cfg.mostrar_complemento && it.complemento ? `<span class="dt2">·</span>${ico('ruler', 11, '#aab0bb')}<span class="cp">${esc(it.complemento)}</span>` : ''}</div>
      </div>
      <div class="qt"><b>${it.qtd}</b><span>un</span></div>
      <div class="ck"></div>
    </div>`).join('')
  const tagPrazo = p.ship_by ? `<span class="tg w">${ico('clock', 12, '#F0C079')} enviar até ${new Date(p.ship_by * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>` : ''
  const nota = p.nota_comprador || p.observacao || ''
  const notaComprador = (cfg.mostrar_nota_comprador && nota) ? `<div class="obsbar">${ico('message-square', 13, '#C2790F')} <b>Nota do comprador:</b> ${esc(nota)}</div>` : ''
  const nomeDest = end.nome || p.cliente || p.comprador || '—'
  const iniciais = String(nomeDest).trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '·'
  const destProtegido = mascarado(nomeDest)
  const destcardHTML = !cfg.mostrar_destinatario ? '' : (destProtegido
    ? `<div class="destcard"><div class="dlbl">${ico('map-pin', 11, '#9aa0ab')} DESTINATÁRIO</div><div class="drow"><div><div class="dnome" style="font-size:14px">Protegido pela Shopee</div><div class="dadr">endereço de envio na etiqueta Oficial SPX</div></div></div></div>`
    : `<div class="destcard"><div class="dlbl">${ico('map-pin', 11, '#9aa0ab')} DESTINATÁRIO</div><div class="drow"><div class="dav">${esc(iniciais)}</div><div><div class="dnome">${esc(nomeDest)}</div><div class="dadr">${esc(enderecoLinha || '—')}</div>${end.telefone && !mascarado(end.telefone) ? `<div class="dadr">Tel ${esc(end.telefone)}</div>` : ''}</div></div></div>`)
  return `<section class="doc">
    <div class="band">
      <div class="bl"><div class="kick">PEDIDO DE VENDA · SEPARAÇÃO</div><div class="onum">#${esc(p.order_sn)}</div>
        <div class="tags"><span class="tg s">${ico('truck', 12, '#FF9576')} Shopee Xpress</span>${tagPrazo}</div></div>
      <div class="br">${cfg.mostrar_codigo_barras ? `<div class="bcwrap">${barcodeSVG(p.order_sn, { height: 38, modulo: 1.15 })}</div>` : ''}<div class="dt">impresso em ${new Date().toLocaleString('pt-BR')}</div></div>
    </div>
    <div class="emp"><div class="logo">${ico('store', 18, '#fff')}</div><div class="ei"><div class="en">${esc(emitNome(cfg))}</div><div class="ec">${esc(emitCnpjCidade(cfg))}</div></div><img class="spxs" src="${SPX_LOGO}"></div>
    ${cfg.mostrar_timeline ? timelineHTML(p.status) : ''}
    <div class="topcols">
      <div class="refs">
        ${cfg.mostrar_nfe ? `<div class="ref">${ico('file-text', 13, '#6b6f7a')}<div><span>NOTA FISCAL</span><b>${esc(p.nfe_numero || '—')}</b></div></div>` : ''}
        ${cfg.mostrar_rastreio ? `<div class="ref">${ico('barcode', 13, '#6b6f7a')}<div><span>RASTREIO</span><b class="mn">${esc(p.rastreio || '—')}</b></div></div>` : ''}
        <div class="ref">${ico('truck', 13, '#6b6f7a')}<div><span>STATUS</span><b>${esc(statusPt(p.status))}</b></div></div>
        <div class="ref">${ico('package', 13, '#6b6f7a')}<div><span>VOLUME</span><b>1 caixa</b></div></div>
      </div>
      ${destcardHTML}
    </div>
    ${notaComprador}
    <div class="ith"><div class="itl">${ico('package', 14)}<span>CONFERÊNCIA DE ITENS</span></div><div class="itr"><span class="cnt"><b>${nItens}</b> itens · <b>${totU}</b> unidades</span><span class="den">descrição completa</span></div></div>
    <div class="list">${rows || '<div class="row"><div class="cd"><div class="nm">Sem itens neste pedido.</div></div></div>'}</div>
    <div class="foot"><div class="fl">${logoPrecifica(1)}<span class="genf">Documento gerado pelo Precifica AI <b>by sóstrass</b></span></div><span class="pgn">separe marcando cada item</span></div>
  </section>`
}
// CSS compartilhado entre folha e etiqueta (timeline + logo Precifica). .tn escopado em .tl (evita colisão com rastreio).
const CSS_SHARED = `*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
.pfl{display:inline-flex;align-items:center;gap:6px}.pfmark{border-radius:6px;background:linear-gradient(135deg,#d6007f,#7b2a8c);display:grid;place-items:center;flex-shrink:0}.pfwm{font-weight:800;color:#14151a;letter-spacing:-.2px}.pfwm b{color:#d6007f;font-weight:800}
.tl{display:flex;align-items:flex-start;padding:15px 30px 13px;background:#fff;border-bottom:1px solid #eef0f3}
.tl .tn{flex:1;text-align:center;position:relative}.tl .tn::before{content:'';position:absolute;top:18px;left:-50%;width:100%;height:3px;background:#e3e5ea;z-index:0}.tl .tn:first-child::before{display:none}.tl .tn.done::before,.tl .tn.current::before{background:#16171c}
.tcirc{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;margin:0 auto;position:relative;z-index:1;background:#fff;border:2px solid #dcdfe5}.tl .tn.done .tcirc{background:#16171c;border-color:#16171c}.tl .tn.current .tcirc{background:#EE4D2D;border-color:#EE4D2D;box-shadow:0 0 0 4px rgba(238,77,45,.16)}
.tlab{font-size:11px;font-weight:700;margin-top:8px}.tl .tn.pending .tlab{color:#aab0bb}
.tl.cmp{padding:2mm 1mm 1.5mm;border:0;border-bottom:1.5px solid #111;background:transparent}.tl.cmp .tcirc{width:22px;height:22px;border-width:1.5px}.tl.cmp .tn::before{top:10px;height:2px}.tl.cmp .tlab{font-size:7px;margin-top:2px}.tl.cmp .tn.current .tcirc{box-shadow:0 0 0 2px rgba(238,77,45,.18)}
`
const CSS_FOLHA = CSS_SHARED + `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14151a}
.doc{background:#fff;page-break-after:always}
.band{background:linear-gradient(120deg,#16171c,#23252e);color:#fff;padding:16px 30px;display:flex;justify-content:space-between;align-items:flex-start}
.kick{font-size:10px;letter-spacing:.16em;color:#EE6A45;font-weight:800}.onum{font-size:25px;font-weight:800;font-family:ui-monospace,monospace;margin:2px 0 7px;word-break:break-all}
.tags{display:flex;gap:8px;flex-wrap:wrap}.tg{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px}.tg.s{background:rgba(238,77,45,.18);color:#FF9576}.tg.w{background:rgba(224,162,60,.16);color:#F0C079}
.br{text-align:right;flex-shrink:0;margin-left:14px}.bcwrap{background:#fff;padding:5px 7px;border-radius:5px;display:inline-block}.bcwrap svg{display:block}.dt{font-size:10px;color:#9a9da6;margin-top:5px}
.emp{display:flex;align-items:center;gap:12px;padding:11px 30px;background:#FAFAFB;border-bottom:1px solid #eef0f3}
.logo{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#d6007f,#7b2a8c);display:grid;place-items:center;flex-shrink:0}.ei{flex:1}.en{font-size:15px;font-weight:800}.ec{font-size:11px;color:#8a8f9b}.spxs{height:7mm}
.topcols{display:flex;border-bottom:1px solid #eef0f3}
.refs{display:grid;grid-template-columns:1fr 1fr;flex:1;border-right:1px solid #eef0f3}
.ref{padding:11px 22px;display:flex;gap:9px;align-items:flex-start;border-bottom:1px solid #f3f4f6;border-right:1px solid #f3f4f6}.ref:nth-child(2n){border-right:0}.ref:nth-last-child(-n+2){border-bottom:0}
.ref span{font-size:9px;letter-spacing:.05em;color:#9aa0ab;font-weight:700;display:block}.ref b{font-size:13.5px;display:block;margin-top:2px;word-break:break-all}.mn{font-family:ui-monospace,monospace;font-size:12px}
.destcard{width:42%;padding:12px 26px}.dlbl{font-size:9px;letter-spacing:.06em;color:#9aa0ab;font-weight:700;display:flex;align-items:center;gap:4px}
.drow{display:flex;gap:12px;align-items:center;margin-top:6px}.dav{width:38px;height:38px;border-radius:50%;background:#16171c;color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;flex-shrink:0}.dnome{font-size:17px;font-weight:800;line-height:1.1}.dadr{font-size:12px;color:#5a5f6b;line-height:1.4;margin-top:2px}
.obsbar{margin:13px 30px 0;background:#FFF8EE;border:1px solid #F3E2C4;border-radius:9px;padding:9px 13px;font-size:12px;color:#7a5a1e;display:flex;gap:7px;align-items:flex-start}
.ith{display:flex;align-items:center;justify-content:space-between;padding:14px 30px 9px}.itl{display:flex;align-items:center;gap:7px}.itl span{font-size:12px;font-weight:800;letter-spacing:.04em}.itr{display:flex;align-items:center;gap:14px}.cnt{font-size:12px;color:#3a3f4b}.cnt b{font-weight:800}.den{font-size:10.5px;color:#9aa0ab}
.list{border-top:1px solid #eef0f3}
.row{display:flex;gap:13px;align-items:flex-start;padding:11px 30px;border-bottom:1px solid #f1f2f5;page-break-inside:avoid}
.row .ph{width:44px;height:44px;border-radius:9px;background:linear-gradient(135deg,#f4f5f7,#e9ebef);border:1px solid #e8eaef;display:grid;place-items:center;flex-shrink:0;overflow:hidden}.row .ph img{width:100%;height:100%;object-fit:cover}
.cd{flex:1;min-width:0}.nm{font-size:14px;font-weight:700;line-height:1.3}
.mt{font-size:12px;color:#3a3f4b;margin-top:4px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}.sku{font-family:ui-monospace,monospace;color:#7a7f8b}.dt2{color:#ccc}.cp{color:#8a8f9b}
.qt{text-align:center;flex-shrink:0;width:46px}.qt b{font-size:20px;font-weight:800;display:block;line-height:1}.qt span{font-size:9px;color:#aab0bb}.ck{width:18px;height:18px;border:1.5px solid #ccd;border-radius:4px;flex-shrink:0;margin-top:3px}
.foot{padding:13px 30px;border-top:2px solid #14151a;display:flex;justify-content:space-between;align-items:center}.fl{display:flex;align-items:center;gap:8px}.genf{font-size:12px;color:#5a5f6b}.genf b{color:#EE4D2D}.pgn{font-size:10.5px;color:#9aa0ab}
@media print{@page{size:A4;margin:0}.doc:last-child{page-break-after:auto}}`

// Etiqueta logística — desenho PAISAGEM (15x10) rotacionado 90° para encaixar no rótulo térmico 100x150mm
function htmlEtiqueta(p, rem, cfg = PRINT_CFG) {
  const end = p.endereco || {}
  const enderecoLinha = [end.completo].filter(Boolean).join('')
  const cidadeLinha = [[end.cidade, end.uf].filter(Boolean).join(' - '), end.cep ? 'CEP ' + end.cep : ''].filter(Boolean).join(' · ')
  const cpfTel = [end.telefone ? 'Tel ' + end.telefone : '', end.cpf ? 'CPF ' + end.cpf : ''].filter(Boolean).join(' · ')
  const remNome = rem || emitNome(cfg)
  const nItens = (p.itens || []).length
  const rastreio = p.rastreio || p.order_sn
  const espacar = (s) => String(s || '').replace(/(.{4})/g, '$1 ').trim()
  const litens = (p.itens || []).slice(0, 3).map((it) => `<tr><td class="q">${it.qtd}</td><td class="nmc"><b>${esc(it.nome)}</b><span class="sl">${[it.variacao, it.sku].filter(Boolean).map(esc).join(' · ')}</span></td></tr>`).join('')
  const more = nItens > 3 ? `<div class="more">+ ${nItens - 3} itens · lista completa na folha de separação</div>` : ''
  const temNfe = !!(p.nfe_numero && p.nfe_numero !== '—')
  const danfe = (cfg.mostrar_nfe && temNfe) ? `<div class="danfe"><div class="dh">${ico('file-text', 9, '#111')} DANFE SIMPLIFICADO — NF-e</div>
      <div class="dg"><span>nº <b>${esc(p.nfe_numero)}</b></span>${p.nfe_serie ? `<span>Sér <b>${esc(p.nfe_serie)}</b></span>` : ''}${p.nfe_emissao ? `<span>Emis <b>${esc(p.nfe_emissao)}</b></span>` : ''}${p.valor_total != null ? `<span>R$ <b>${Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>` : ''}</div>
      <div class="em">Emitente: <b>${esc(emitNome(cfg))}</b> · CNPJ ${esc(cfg.emitente_cnpj || REMETENTE_CNPJ)}</div>
      ${p.nfe_chave ? `<div class="chave">${barcodeSVG(p.nfe_chave, { height: 26, modulo: 1.0, texto: false })}<div class="cl2">${esc(espacar(p.nfe_chave))}</div></div>` : ''}</div>` : ''
  const destEtiqHTML = !cfg.mostrar_destinatario ? '' :
    `<div class="dest"><div class="cap">${ico('map-pin', 9, '#111')} DESTINATÁRIO</div>${mascarado(end.nome || p.cliente || p.comprador)
      ? `<div class="dn" style="font-size:11px">Protegido pela Shopee</div><div class="da">endereço de envio na etiqueta Oficial SPX</div>`
      : `<div class="dn">${esc(end.nome || p.cliente || p.comprador || '—')}</div><div class="da">${esc(enderecoLinha || '—')}${cidadeLinha ? ' · ' + esc(cidadeLinha) : ''}</div>${cpfTel ? `<div class="da">${esc(cpfTel)}</div>` : ''}`}</div>`
  const qrrowHTML = (cfg.mostrar_qr || cfg.mostrar_rastreio)
    ? `<div class="qrrow">${cfg.mostrar_qr ? `<div class="qr">${qrSvg(rastreio)}</div>` : ''}${cfg.mostrar_rastreio ? `<div class="track"><span class="tlbl">RASTREIO SPX</span>${barcodeSVG(rastreio, { height: 40, modulo: 0.9, texto: false })}<div class="trk">${esc(espacar(rastreio))}</div></div>` : ''}</div>`
    : ''
  return `<div class="page"><div class="labh"><div class="safe">
    <div class="xphd"><img class="spx" src="${SPX_LOGO}"><div class="xpr"><div class="svc">ENTREGA PADRÃO</div><div class="vol">Volume 1 / 1 · #${esc(String(p.order_sn).slice(-14))}</div></div></div>
    <div class="cols">
      <div class="cl">
        <div class="sortbox"><span class="sl">ESTAÇÃO / ROTA</span><div class="sb">${esc(p.estacao || '—')}</div>${p.rota ? `<span class="ss">${esc(p.rota)}</span>` : ''}</div>
        ${danfe}
        ${destEtiqHTML}
      </div>
      <div class="cr">
        ${qrrowHTML}
        <div class="rem"><div class="cap">${ico('store', 9, '#111')} REMETENTE</div><span class="rn">${esc(remNome)}</span> · ${esc(emitEndereco(cfg))}</div>
        <div class="pk"><div class="pkh">${ico('package', 9, '#111')} ITENS DO PEDIDO<span class="oid">${nItens} itens</span></div>
          <table class="ci"><tbody>${litens}</tbody></table>${more}</div>
      </div>
    </div>
    <div class="lfoot"><div class="lfl">${logoPrecifica(0.95)}<span class="gen">Documento gerado pelo Precifica AI</span></div><div class="lfr">${ico('truck', 10, '#555')} Shopee Xpress · entrega padrão</div></div>
  </div></div></div>`
}
const CSS_ETIQ = CSS_SHARED + `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14151a}
.page{width:100mm;height:150mm;position:relative;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}
.labh{width:150mm;height:100mm;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(90deg);background:#fff}
.safe{height:100%;margin:3mm;border:2px solid #111;padding:2mm;display:flex;flex-direction:column;background:#fff}
.xphd{display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #111;padding-bottom:1.5mm}
.spx{height:7mm}.xpr{text-align:right}.svc{font-size:11px;font-weight:800}.vol{font-size:8px;color:#333;font-family:ui-monospace,monospace}
.cols{display:flex;gap:3mm;flex:1;padding:2mm 0;min-height:0}
.cl{width:50%;display:flex;flex-direction:column;gap:1.8mm;border-right:1.5px solid #111;padding-right:3mm}
.cr{width:50%;display:flex;flex-direction:column;gap:1.8mm}
.sortbox{border:1.5px solid #111;border-radius:2px;text-align:center;padding:1mm}.sortbox .sl{font-size:6.5px;font-weight:800;letter-spacing:.08em;color:#444}.sb{font-size:26px;font-weight:900;letter-spacing:2px;line-height:1.05}.ss{font-size:7px;font-weight:700}
.danfe{border:1px solid #111;padding:1.2mm}.dh{font-size:7px;font-weight:800;display:flex;align-items:center;gap:3px;border-bottom:.5px solid #999;padding-bottom:.6mm;margin-bottom:.6mm}
.dg{display:flex;flex-wrap:wrap;gap:0 3mm;font-size:8px}.dg b{font-family:ui-monospace,monospace}.em{font-size:7.5px;margin-top:.6mm}
.chave{text-align:center;margin-top:.8mm}.chave svg{max-width:100%}.cl2{font-size:6px;font-family:ui-monospace,monospace;letter-spacing:.3px}
.dest{border-top:1px dashed #bbb;padding-top:1.3mm}.cap{font-size:7px;font-weight:800;display:flex;align-items:center;gap:3px;color:#333}
.dn{font-size:14px;font-weight:800;line-height:1.05;margin:.5mm 0}.da{font-size:9px;line-height:1.35}
.qrrow{display:flex;gap:2.5mm;align-items:center;border-bottom:1.5px solid #111;padding-bottom:1.5mm}
.qr{width:27mm;height:27mm;flex-shrink:0}.qr svg{width:100%;height:100%;display:block}.track{flex:1;text-align:center}.tlbl{font-size:7px;font-weight:800;letter-spacing:.1em;color:#444;display:block;margin-bottom:.5mm}.track svg{max-width:100%}.trk{font-size:10px;font-family:ui-monospace,monospace;font-weight:800;letter-spacing:.6px;margin-top:.8mm;white-space:nowrap;display:block;text-align:center}
.rem{font-size:8px;border-bottom:1px dashed #bbb;padding-bottom:1.2mm}.rn{font-weight:700;font-size:9px}
.pk{flex:1;min-height:0;overflow:hidden}.pkh{font-size:7.5px;font-weight:800;display:flex;align-items:center;gap:3px;margin-bottom:.8mm}.oid{margin-left:auto;font-family:ui-monospace,monospace;font-weight:600;color:#555}
table.ci{width:100%;table-layout:fixed;border-collapse:collapse}table.ci td{padding:.6mm 0;border-bottom:.5px dashed #ccc;vertical-align:top;font-size:8.5px}.ci .q{width:6mm;font-weight:900;font-size:10px}.ci .q::after{content:"x";font-size:7px}.ci .nmc{overflow:hidden}.ci .nmc b{font-size:9px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sl{font-size:7px;color:#555;font-family:ui-monospace,monospace;display:block}.more{font-size:7px;color:#666;font-style:italic;margin-top:.5mm}
.lfoot{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #111;padding-top:1.3mm}
.lfl{display:flex;align-items:center;gap:6px}.gen{font-size:7.5px;color:#555}.lfr{font-size:7.5px;color:#555;display:flex;align-items:center;gap:3px}
@media print{@page{size:100mm 150mm;margin:0}}`

const pedido = {
  order_sn: '260612V7CKNGG8', rastreio: 'BR2624032462420', status: 'COMPLETED',
  nfe_numero: '12345', nfe_serie: '1', nfe_emissao: '26/06/2026', valor_total: 51.40,
  ship_by: 1749781140, comprador: '****', cliente: '****',
  endereco: { nome:'****', completo:'****', cidade:'****', uf:'****', cep:'****', telefone:'****' },
  itens: [
    { imagem:'', nome:'Meia Pérola ABS 14mm Branco · 500g — 780 peças', variacao:'Branco', sku:'5817140010000', qtd:11, complemento:'Embalagem com 500g' },
    { imagem:'', nome:'Cola A Legítima 100ml | Ideal para Strass e Pedrarias', variacao:'', sku:'7500100000100', qtd:1, complemento:'Embalagem com 100ml' },
  ],
}
const cfgTeste = { ...PRINT_CFG_PADRAO,
  emitente_nome:'Minha Loja LTDA', emitente_cnpj:'12.345.678/0001-90',
  emitente_endereco:'Av. Teste, 500', emitente_cidade:'Campinas - SP · CEP 13000-000',
  mostrar_timeline:false, mostrar_miniaturas:false, mostrar_codigo_barras:false }
const page = (t, css, body) => `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>${t}</title><style>${css}</style></head><body>${body}</body></html>`
fs.writeFileSync('/tmp/qa-folha-cfg.html', page('Folha', CSS_FOLHA, htmlFolhaPedido(pedido, cfgTeste)))
console.log('OK — folha com cfg custom (sem timeline/miniaturas/barcode, emitente custom, NF ligada)')
