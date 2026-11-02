import { Spinner } from "@/components/ui/spinner"
export default function LoadingProductos() {
  return <div role="status" aria-busy="true" className="flex items-center gap-3 rounded-xl border bg-background p-5 text-sm"><Spinner />Cargando Productos…</div>
}
