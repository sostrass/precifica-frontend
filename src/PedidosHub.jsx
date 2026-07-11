import { Component, lazy, Suspense } from 'react'

const CentralUltra = lazy(() => import('./CentralPedidosUltra.jsx'))

class Blindagem extends Component {
  constructor(p) { super(p); this.state = { erro: null } }
  static getDerivedStateFromError(e) { return { erro: e } }
  render() {
    if (this.state.erro) {
      return (
        <div className="glass rounded-2xl p-6 text-sm text-dim space-y-2">
          <b className="block text-fg">A Central de Pedidos encontrou um erro e se protegeu.</b>
          <div className="text-[11px]">Detalhe técnico: <span className="font-mono text-[10px]">{String(this.state.erro?.message || this.state.erro).slice(0, 180)}</span></div>
          <button onClick={() => this.setState({ erro: null })} className="underline text-[12px]">Tentar de novo</button>
        </div>
      )
    }
    return this.props.children
  }
}

// Caminho B: hub = Central de Pedidos ULTRA unificada (fiel ao mockup aprovado), blindada contra sumiço.
export default function PedidosHub() {
  return (
    <Blindagem>
      <Suspense fallback={<div className="text-dim text-sm p-4">Carregando a Central de Pedidos…</div>}>
        <CentralUltra />
      </Suspense>
    </Blindagem>
  )
}
