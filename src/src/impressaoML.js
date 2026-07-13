// Impressão MERCADO LIVRE — Folha do Pedido + Etiqueta Mercado Envios com identidade oficial ML.
// Paralelo aos modelos Shopee (Folha V8 / Etiqueta SPX) sem tocar no Shopee.jsx (zero regressão).

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

// Logo ML: oval amarelo oficial com aperto de mãos estilizado (SVG data URI)
export const ML_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="132" height="86" viewBox="0 0 132 86">
  <ellipse cx="66" cy="43" rx="63" ry="40" fill="#FFE600" stroke="#2D3277" stroke-width="4"/>
  <path d="M22 46 C 34 32, 50 28, 62 38 L 70 44" fill="none" stroke="#2D3277" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M110 46 C 98 32, 82 28, 70 38 L 62 44" fill="none" stroke="#2D3277" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M56 40 l 7 6 M64 36 l 7 6 M72 34 l 6 6" stroke="#2D3277" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M22 46 C 40 62, 92 62, 110 46" fill="none" stroke="#2D3277" stroke-width="4" stroke-linecap="round"/>
</svg>`)

const CSS_BASE = `
  *{box-sizing:border-box} html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}
  .pagina{page-break-after:always;padding:0}
  .num{font-variant-numeric:tabular-nums;font-family:Menlo,Consolas,monospace}
  @media print{ .pagina{page-break-after:always} }
`

export const CSS_FOLHA_ML = CSS_BASE + `
  .folha{width:100%;max-width:820px;margin:0 auto;padding:18px 22px;border:1px solid #ddd}
  .cab{display:flex;align-items:center;gap:14px;border-bottom:3px solid #FFE600;padding-bottom:10px;margin-bottom:10px}
  .cab img{height:44px}
  .cab .tit{flex:1}
  .cab .tit b{font-size:19px;letter-spacing:.02em}
  .cab .tit span{display:block;font-size:10px;color:#555;letter-spacing:.14em;font-weight:700}
  .prio{background:#2D3277;color:#FFE600;font-weight:800;font-size:12px;letter-spacing:.12em;text-align:center;padding:6px;border-radius:6px;margin-bottom:10px}
  .meta{display:flex;gap:18px;flex-wrap:wrap;font-size:11px;margin-bottom:10px}
  .meta .b{display:flex;flex-direction:column}
  .meta .b i{font-style:normal;font-size:8px;color:#777;letter-spacing:.1em;font-weight:800}
  .meta .b b{font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0}
  th{border-bottom:2px solid #2D3277;text-align:left;padding:5px 4px;font-size:9px;letter-spacing:.08em}
  td{border-bottom:1px solid #e5e5e5;padding:7px 4px;vertical-align:middle}
  td img{width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
  .bin{font-weight:800;font-size:13px;color:#2D3277}
  .fin{display:flex;gap:22px;justify-content:flex-end;font-size:11px;margin-top:8px;padding-top:8px;border-top:2px solid #2D3277}
  .fin .b{text-align:right}
  .fin .b i{font-style:normal;font-size:8px;color:#777;letter-spacing:.1em;font-weight:800;display:block}
  .fin .ok{color:#00a650;font-weight:800}
  .rec{display:inline-block;background:#FFE600;color:#2D3277;font-weight:800;font-size:9px;padding:2px 8px;border-radius:99px;border:1.5px solid #2D3277}
  .rodape{margin-top:10px;font-size:9px;color:#666;display:flex;justify-content:space-between;border-top:1px dashed #bbb;padding-top:6px}
`

export function htmlFolhaML(p) {
  const itens = (p.itens || []).map((it) => `
    <tr>
      <td class="bin num">${esc(it.bin || '—')}</td>
      <td>${it.imagem ? `<img src="${esc(it.imagem)}">` : ''}</td>
      <td><b>${esc(it.nome)}</b>${it.variacao ? `<br><span style="font-size:9px;color:#666">${esc(it.variacao)}</span>` : ''}</td>
      <td class="num">${esc(it.sku || '—')}</td>
      <td class="num" style="text-align:center;font-weight:800;font-size:13px">${it.qtd}</td>
      <td style="text-align:center;font-size:14px">☐</td>
    </tr>`).join('')
  return `
  <div class="pagina"><div class="folha">
    <div class="cab">
      <img src="${ML_LOGO}" alt="Mercado Livre">
      <div class="tit"><b>FOLHA DO PEDIDO</b><span>MERCADO LIVRE · MERCADO ENVIOS</span></div>
      <div style="text-align:right"><div style="font-size:9px;color:#777;letter-spacing:.1em;font-weight:800">PEDIDO</div><b class="num" style="font-size:15px">#${esc(p.order_sn)}</b></div>
    </div>
    ${p.ship_by ? `<div class="prio">DESPACHAR ATÉ ${new Date(p.ship_by * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
    <div class="meta">
      <div class="b"><i>COMPRADOR</i><b>${esc(p.cliente || p.comprador || '—')} ${p.recorrencia ? `<span class="rec">${esc(p.recorrencia)}</span>` : ''}</b></div>
      <div class="b"><i>DESTINO</i><b>${esc([p.cidade, p.uf].filter(Boolean).join('/') || '—')}${p.cep ? ` · ${esc(p.cep)}` : ''}</b></div>
      <div class="b"><i>STATUS</i><b>${esc(p.status || '—')}</b></div>
      <div class="b"><i>RASTREIO</i><b class="num">${esc(p.rastreio || 'libera no envio')}</b></div>
    </div>
    <table>
      <tr><th>BIN</th><th></th><th>PRODUTO</th><th>SKU</th><th style="text-align:center">QTD</th><th style="text-align:center">✓</th></tr>
      ${itens}
    </table>
    <div class="fin">
      <div class="b"><i>VENDIDO</i><b class="num">${brl(p.total)}</b></div>
      <div class="b"><i>SOBRA (LÍQUIDO)</i><b class="num ok">${brl(p.sobra)}</b></div>
      ${p.margem != null ? `<div class="b"><i>MARGEM</i><b class="num ok">${p.margem}%</b></div>` : ''}
    </div>
    <div class="rodape"><span>SÓSTRASS ARMARINHO · LIMEIRA/SP</span><span>impresso em ${new Date().toLocaleString('pt-BR')}</span><span>conferido por: __________</span></div>
  </div></div>`
}

export const CSS_ETIQ_ML = CSS_BASE + `
  .etq{width:100mm;min-height:150mm;margin:0 auto;padding:7mm;border:1px dashed #999;font-family:Menlo,Consolas,monospace;color:#111}
  .cab{display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #111;padding-bottom:4mm;margin-bottom:4mm}
  .cab img{height:15mm}
  .cab b{font-size:14px;letter-spacing:.06em}
  .sortwrap{display:flex;gap:3mm;margin:4mm 0}
  .sortbox{flex:1;border:3px solid #111;border-radius:2mm;text-align:center;padding:3mm 2mm}
  .sortbox .l{font-size:8px;font-weight:800;letter-spacing:.14em}
  .sortbox .v{font-size:26px;font-weight:900;min-height:11mm}
  .sortbox.inv{background:#111;color:#fff}
  .code{height:16mm;background:repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 5px);margin:3mm 0 1mm}
  .dest{border-top:1.5px dashed #111;padding-top:3mm;font-size:10.5px;line-height:1.65}
  .rem{border-top:1.5px dashed #111;margin-top:3mm;padding-top:2.5mm;font-size:9px}
`

export function htmlEtiquetaML(p) {
  return `
  <div class="pagina"><div class="etq">
    <div class="cab"><img src="${ML_LOGO}" alt="ML"><b>MERCADO ENVIOS</b><span class="num" style="font-size:10px">${new Date().toLocaleDateString('pt-BR')}</span></div>
    <div class="sortwrap">
      <div class="sortbox"><div class="l">ESTAÇÃO</div><div class="v">${esc(p.estacao || '\u00A0')}</div></div>
      <div class="sortbox inv"><div class="l">ROTA</div><div class="v">${esc(p.rota || '\u00A0')}</div></div>
    </div>
    <div class="code"></div>
    <div class="num" style="text-align:center;font-size:11px;letter-spacing:2px">${esc(p.rastreio || p.order_sn)}</div>
    <div class="dest">
      <b>DESTINATÁRIO</b><br>
      ${esc(p.cliente || p.comprador || '—')}<br>
      ${esc([p.cidade, p.uf].filter(Boolean).join('/') || '')} ${p.cep ? `· ${esc(p.cep)}` : ''}
    </div>
    <div class="rem">
      REMETENTE: SÓSTRASS ARMARINHO · LIMEIRA/SP<br>
      Pedido <b class="num">#${esc(p.order_sn)}</b> · ${(p.itens || []).reduce((s, i) => s + (i.qtd || 1), 0)} vol
    </div>
  </div></div>`
}

function abrirImpressaoML(titulo, css, corpo) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>${corpo}<script>setTimeout(function(){window.print()},350)</scr` + `ipt></body></html>`)
  w.document.close()
}

export function imprimirFolhasML(pedidos) {
  if (!pedidos.length) return
  abrirImpressaoML('Pedidos · Mercado Livre', CSS_FOLHA_ML, pedidos.map(htmlFolhaML).join(''))
}
export function imprimirEtiquetasML(pedidos) {
  if (!pedidos.length) return
  abrirImpressaoML('Etiquetas · Mercado Envios', CSS_ETIQ_ML, pedidos.map(htmlEtiquetaML).join(''))
}
