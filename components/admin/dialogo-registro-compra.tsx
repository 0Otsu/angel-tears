"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { registrarCompraAccion } from "@/app/admin/(panel)/compras/acciones"
import type { ProductoParaComprar, ProveedorParaComprar, ResultadoRegistroAdmin } from "@/lib/modulos/compras/administracion-contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { estimarCompra, hoyEnFormatoIso, normalizarCosto, type LineaFormularioCompra } from "@/lib/presentacion/compras"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { Textarea } from "@/components/ui/textarea"

type LineaConClave = LineaFormularioCompra & { clave: string }

const nuevaLinea = (): LineaConClave => ({ clave: crypto.randomUUID(), productoId: "", cantidad: "1", costoUnitario: "" })

export function DialogoRegistroCompra({ productos, proveedores, alGuardar }: { productos: ProductoParaComprar[]; proveedores: ProveedorParaComprar[]; alGuardar: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [fecha, setFecha] = useState("")
  const [proveedorId, setProveedorId] = useState("")
  const [nota, setNota] = useState("")
  const [lineas, setLineas] = useState<LineaConClave[]>([nuevaLinea()])
  const [resultado, setResultado] = useState<ResultadoRegistroAdmin | null>(null)
  const [enviando, ocupar] = useState(false)
  // Identifica la operacion logica: reintentar tras perder la respuesta no duplica la compra.
  const claveSolicitud = useRef<string>(crypto.randomUUID())
  const enCurso = useRef(false)
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const errores = resultado?.estado === "datos_invalidos" ? resultado.errores : {}
  const porLinea = new Map((errores.porLinea ?? []).map((e) => [e.linea, e]))
  const estimacion = estimarCompra(lineas)

  useEffect(() => {
    if (enviando || resultado?.estado !== "datos_invalidos") return
    formulario.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
  }, [enviando, resultado])

  function cambiarApertura(valor: boolean) {
    if (enviando) return
    abrir(valor)
    if (valor) {
      setFecha(hoyEnFormatoIso()); setProveedorId(""); setNota(""); setLineas([nuevaLinea()]); setResultado(null)
      claveSolicitud.current = crypto.randomUUID()
    }
  }

  function cambiarLinea(clave: string, cambios: Partial<LineaFormularioCompra>) {
    setLineas((actuales) => actuales.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    enCurso.current = true; ocupar(true)
    try {
      let respuesta: ResultadoRegistroAdmin
      try {
        respuesta = await registrarCompraAccion({
          claveSolicitud: claveSolicitud.current,
          fechaOperacion: fecha,
          proveedorId,
          nota,
          lineas: lineas.map(({ productoId, cantidad, costoUnitario }) => ({ productoId, cantidad, costoUnitario: normalizarCosto(costoUnitario) })),
        })
      } catch { respuesta = { estado: "error_tecnico" } }
      setResultado(respuesta)
      // Si el servidor rechazo la compra sin guardar nada, el siguiente envio es otra operacion
      // (el contenido puede cambiar). Solo un fallo de red/tecnico conserva la clave para reintentar.
      if (respuesta.estado !== "error_tecnico" && respuesta.estado !== "ok") claveSolicitud.current = crypto.randomUUID()
      if (respuesta.estado === "ok") {
        abrir(false)
        alGuardar(respuesta.repetido ? "Esa compra ya estaba registrada." : `Compra registrada por ${formatearPrecioPublico(respuesta.compra.total)}. El stock se actualizó.`)
        router.refresh()
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  function mensajeGeneral(r: ResultadoRegistroAdmin | null): string | null {
    switch (r?.estado) {
      case "conflicto_solicitud": return "Esta compra ya se había enviado con otros datos. Revisá el listado antes de volver a enviarla."
      case "producto_no_encontrado": return "Alguno de los productos ya no existe. Recargá la página."
      case "producto_sin_saldo": return "Alguno de los productos no tiene inventario. Recargá la página."
      case "proveedor_no_encontrado": return "El proveedor ya no existe. Elegí otro o dejalo sin proveedor."
      case "proveedor_inactivo": return "El proveedor está inactivo. Elegí otro o dejalo sin proveedor."
      case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
      case "error_tecnico": return "No pudimos registrar la compra. Conservamos tus datos para que puedas reintentar."
      default: return null
    }
  }
  const general = mensajeGeneral(resultado)

  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button className="min-h-11" disabled={productos.length === 0}>Registrar compra</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto motion-reduce:animate-none sm:max-w-2xl">
      <DialogHeader><DialogTitle>Registrar compra</DialogTitle><DialogDescription>Elegí los productos, sus cantidades y el costo de cada unidad. Al confirmar, el stock aumenta. Una compra confirmada no se edita: si hubo un error, se anula y se registra otra.</DialogDescription></DialogHeader>
      <form ref={formulario} onSubmit={enviar} noValidate aria-label="Registrar compra" className="space-y-5">
        <fieldset disabled={enviando} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2"><Label htmlFor="compra-fecha">Fecha de la compra *</Label>
              <Input id="compra-fecha" name="fechaOperacion" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required aria-invalid={Boolean(errores.fechaOperacion)} aria-describedby={errores.fechaOperacion ? "error-compra-fecha" : undefined} className="min-h-11" />
              {errores.fechaOperacion && <p id="error-compra-fecha" className="text-sm text-destructive">{errores.fechaOperacion}</p>}</div>
            <div className="min-w-0 space-y-2"><Label htmlFor="compra-proveedor">Proveedor (opcional)</Label>
              <select id="compra-proveedor" name="proveedorId" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} aria-invalid={Boolean(errores.proveedorId)} aria-describedby={errores.proveedorId ? "error-compra-proveedor" : undefined} className="h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary">
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {errores.proveedorId && <p id="error-compra-proveedor" className="text-sm text-destructive">{errores.proveedorId}</p>}</div>
          </div>
          <div className="min-w-0 space-y-2"><Label htmlFor="compra-nota">Nota (opcional)</Label>
            <Textarea id="compra-nota" name="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Pedido de noviembre" aria-invalid={Boolean(errores.nota)} aria-describedby={errores.nota ? "error-compra-nota" : undefined} />
            {errores.nota && <p id="error-compra-nota" className="text-sm text-destructive">{errores.nota}</p>}</div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Productos</h3>
            {errores.lineas && <p role="alert" className="text-sm text-destructive">{errores.lineas}</p>}
            <ul className="space-y-3">
              {lineas.map((linea, i) => {
                const error = porLinea.get(i)
                const subtotal = estimacion.subtotales[i]
                return <li key={linea.clave} className="grid min-w-0 gap-3 rounded-xl border border-border/60 p-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto] sm:items-start">
                  <div className="min-w-0 space-y-2"><Label htmlFor={`compra-producto-${linea.clave}`}>Producto {i + 1} *</Label>
                    <select id={`compra-producto-${linea.clave}`} name="productoId" value={linea.productoId} onChange={(e) => cambiarLinea(linea.clave, { productoId: e.target.value })} required aria-invalid={Boolean(error?.productoId)} aria-describedby={error?.productoId ? `error-compra-producto-${linea.clave}` : undefined} className="h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary">
                      <option value="">Elegí un producto</option>
                      {productos.map((p) => <option key={p.productoId} value={p.productoId}>{p.nombre} · {p.saldo} en stock</option>)}
                    </select>
                    {error?.productoId && <p id={`error-compra-producto-${linea.clave}`} className="text-sm text-destructive">{error.productoId}</p>}</div>
                  <div className="space-y-2"><Label htmlFor={`compra-cantidad-${linea.clave}`}>Cantidad *</Label>
                    <Input id={`compra-cantidad-${linea.clave}`} name="cantidad" type="number" min="1" step="1" inputMode="numeric" value={linea.cantidad} onChange={(e) => cambiarLinea(linea.clave, { cantidad: e.target.value })} required aria-invalid={Boolean(error?.cantidad)} aria-describedby={error?.cantidad ? `error-compra-cantidad-${linea.clave}` : undefined} className="min-h-11" />
                    {error?.cantidad && <p id={`error-compra-cantidad-${linea.clave}`} className="text-sm text-destructive">{error.cantidad}</p>}</div>
                  <div className="space-y-2"><Label htmlFor={`compra-costo-${linea.clave}`}>Costo unitario *</Label>
                    <Input id={`compra-costo-${linea.clave}`} name="costoUnitario" inputMode="decimal" placeholder="Ej: 1500,50" value={linea.costoUnitario} onChange={(e) => cambiarLinea(linea.clave, { costoUnitario: e.target.value })} required aria-invalid={Boolean(error?.costoUnitario)} aria-describedby={error?.costoUnitario ? `error-compra-costo-${linea.clave}` : undefined} className="min-h-11" />
                    {error?.costoUnitario && <p id={`error-compra-costo-${linea.clave}`} className="text-sm text-destructive">{error.costoUnitario}</p>}</div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:pt-7">
                    <p className="text-sm tabular-nums" aria-label={`Subtotal del producto ${i + 1}`}>{subtotal ? formatearPrecioPublico(subtotal) : "—"}</p>
                    <Button type="button" variant="ghost" className="min-h-11 min-w-11" onClick={() => setLineas((a) => (a.length === 1 ? a : a.filter((l) => l.clave !== linea.clave)))} disabled={lineas.length === 1} aria-label={`Quitar el producto ${i + 1}`}><Trash2 aria-hidden="true" className="size-4" /></Button>
                  </div>
                </li>
              })}
            </ul>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setLineas((a) => [...a, nuevaLinea()])}><Plus aria-hidden="true" className="mr-1 size-4" />Agregar producto</Button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm" role="status" aria-live="polite" aria-atomic="true">
            <p className="font-medium">Total estimado</p>
            <p className="mt-1"><strong className="text-xl tabular-nums">{formatearPrecioPublico(estimacion.total)}</strong></p>
            <p className="mt-2 text-xs text-muted-foreground">El costo admite hasta dos decimales. El total definitivo lo calcula el servidor al confirmar.</p>
          </div>
        </fieldset>

        {(general || errores.claveSolicitud) && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{general ?? errores.claveSolicitud}</p>{resultado?.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton className="min-h-11" type="submit" pending={enviando} pendingLabel="Guardando…">Confirmar compra</PendingButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
