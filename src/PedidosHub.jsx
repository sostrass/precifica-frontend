import { lazy, Suspense } from 'react'

const CentralUltra = lazy(() => import('./CentralPedidosUltra.jsx'))

// Caminho B: o hub agora é a Central de Pedidos ULTRA unificada (fiel ao mockup aprovado).
export default function PedidosHub() {
  return (
    <Suspense fallback={<div className="text-dim text-sm p-4">Carregando a Central de Pedidos…</div>}>
      <CentralUltra />
    </Suspense>
  )
}
