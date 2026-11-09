"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { registrarVentaAccion } from "@/app/admin/(panel)/ventas/acciones"
import type { ProductoParaVender, ResultadoRegistroAdmin } from "@/lib/modulos/ventas/administracion-contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { estimarVenta, hoyEnFormatoIso, type LineaFormularioVenta } from "@/lib/presentacion/ventas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"

type LineaConClave = LineaFormularioVenta & { clave: string }

const nuevaLinea = (): LineaConClave => ({ clave: crypto.randomUUID(), productoId: "", cantidad: "1" })

export function DialogoRegistroVenta({ productos, alGuardar }: { productos: ProductoParaVender[]; alGuardar: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [fecha, setFecha] = useState("")
  const [comprador, setComprador] = useState("")
  const [lineas, setLineas] = useState<LineaConClave[]>([nuevaLinea()])
  const [resultado, setResultado] = useState<ResultadoRegistroAdmin | null>(null)
  const [enviando, ocupar] = useState(false)
  // Identifica la operacion logica: reintentar tras perder la respuesta no duplica la venta.
  const claveSolicitud = useRef<string>(crypto.randomUUID())
  const enCurso = useRef(false)
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const errores = resultado?.estado === "datos_invalidos" ? resultado.errores : {}
  const porLinea = new Map((errores.porLinea ?? []).map((e) => [e.linea, e]))
  const estimacion = estimarVenta(lineas, productos)
  const nombreDe = (id: string) => productos.find((p) => p.productoId === id)?.nombre ?? "El producto"

  useEffect(() => {
    if (enviando || resultado?.estado !== "datos_invalidos") return
    const primero = formulario.current?.querySelector<HTMLElement>("[aria-invalid='true']")
    primero?.focus()
  }, [enviando, resultado])

  function cambiarApertura(valor: boolean) {
    if (enviando) return
    abrir(valor)
    if (valor) {
      setFecha(hoyEnFormatoIso()); setComprador(""); setLineas([nuevaLinea()]); setResultado(null)
      claveSolicitud.current = crypto.randomUUID()
    }
  }

  function cambiarLinea(clave: string, cambios: Partial<LineaFormularioVenta>) {
    setLineas((actuales) => actuales.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    enCurso.current = true; ocupar(true)
    try {
      let respuesta: ResultadoRegistroAdmin
      try {
        respuesta = await registrarVentaAccion({
          claveSolicitud: claveSolicitud.current,
          fechaOperacion: fecha,
          comprador,
          lineas: lineas.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
        })
      } catch { respuesta = { estado: "error_tecnico" } }
      setResultado(respuesta)
      // Si el servidor rechazo la venta sin guardar nada, el siguiente envio es otra operacion
      // (el contenido puede cambiar). Solo un fallo de red/tecnico conserva la clave para reintentar.
      if (respuesta.estado !== "error_tecnico" && respuesta.estado !== "ok") claveSolicitud.current = crypto.randomUUID()
      if (respuesta.estado === "ok") {
        abrir(false)
        alGuardar(respuesta.repetido ? "Esa venta ya estaba registrada." : `Venta registrada por ${formatearPrecioPublico(respuesta.venta.total)}.`)
        router.refresh()
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  function mensajeGeneral(r: ResultadoRegistroAdmin | null): string | null {
    switch (r?.estado) {
      case "stock_insuficiente": return `No alcanza el stock de ${nombreDe(r.productoId)}: hay ${r.disponible} y la venta pide ${r.requerido}. Ajustá las cantidades; no se guardó nada.`
      case "conflicto_solicitud": return "Esta venta ya se había enviado con otros datos. Revisá el listado antes de volver a enviarla."
      case "producto_no_encontrado": return "Alguno de los productos ya no existe. Recargá la página."
      case "producto_sin_saldo": return `${nombreDe(r.productoId)} no tiene inventario. Recargá la página.`
      case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
      case "error_tecnico": return "No pudimos registrar la venta. Conservamos tus datos para que puedas reintentar."
      default: return null
    }
  }
  const general = mensajeGeneral(resultado)
  const sinProductos = productos.length === 0

  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button className="min-h-11" disabled={sinProductos}>Registrar venta</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto motion-reduce:animate-none sm:max-w-2xl">
      <DialogHeader><DialogTitle>Registrar venta</DialogTitle><DialogDescription>Elegí los productos y las cantidades. El precio es el vigente de cada producto y el stock se descuenta al confirmar.</DialogDescription></DialogHeader>
      <form ref={formulario} onSubmit={enviar} noValidate aria-label="Registrar venta" className="space-y-5">
        <fieldset disabled={enviando} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2"><Label htmlFor="venta-fecha">Fecha de la venta *</Label>
              <Input id="venta-fecha" name="fechaOperacion" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required aria-invalid={Boolean(errores.fechaOperacion)} aria-describedby={errores.fechaOperacion ? "error-venta-fecha" : undefined} className="min-h-11" />
              {errores.fechaOperacion && <p id="error-venta-fecha" className="text-sm text-destructive">{errores.fechaOperacion}</p>}</div>
            <div className="min-w-0 space-y-2"><Label htmlFor="venta-comprador">Comprador (opcional)</Label>
              <Input id="venta-comprador" name="comprador" value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="Consumidor Final" autoComplete="off" aria-invalid={Boolean(errores.comprador)} aria-describedby={errores.comprador ? "error-venta-comprador" : "ayuda-venta-comprador"} className="min-h-11" />
              {errores.comprador ? <p id="error-venta-comprador" className="text-sm text-destructive">{errores.comprador}</p> : <p id="ayuda-venta-comprador" className="text-xs text-muted-foreground">Si lo dejás vacío se registra como Consumidor Final.</p>}</div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Productos</h3>
            {errores.lineas && <p role="alert" className="text-sm text-destructive">{errores.lineas}</p>}
            <ul className="space-y-3">
              {lineas.map((linea, i) => {
                const error = porLinea.get(i)
                const subtotal = estimacion.subtotales[i]
                return <li key={linea.clave} className="grid min-w-0 gap-3 rounded-xl border border-border/60 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-start">
                  <div className="min-w-0 space-y-2"><Label htmlFor={`venta-producto-${linea.clave}`}>Producto {i + 1} *</Label>
                    <select id={`venta-producto-${linea.clave}`} name="productoId" value={linea.productoId} onChange={(e) => cambiarLinea(linea.clave, { productoId: e.target.value })} required aria-invalid={Boolean(error?.productoId)} aria-describedby={error?.productoId ? `error-venta-producto-${linea.clave}` : undefined} className="h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary">
                      <option value="">Elegí un producto</option>
                      {productos.map((p) => <option key={p.productoId} value={p.productoId} disabled={p.saldo === 0}>{p.nombre} · {formatearPrecioPublico(p.precio)} · {p.saldo === 0 ? "sin stock" : `${p.saldo} en stock`}</option>)}
                    </select>
                    {error?.productoId && <p id={`error-venta-producto-${linea.clave}`} className="text-sm text-destructive">{error.productoId}</p>}</div>
                  <div className="space-y-2"><Label htmlFor={`venta-cantidad-${linea.clave}`}>Cantidad *</Label>
                    <Input id={`venta-cantidad-${linea.clave}`} name="cantidad" type="number" min="1" step="1" inputMode="numeric" value={linea.cantidad} onChange={(e) => cambiarLinea(linea.clave, { cantidad: e.target.value })} required aria-invalid={Boolean(error?.cantidad)} aria-describedby={error?.cantidad ? `error-venta-cantidad-${linea.clave}` : undefined} className="min-h-11" />
                    {error?.cantidad && <p id={`error-venta-cantidad-${linea.clave}`} className="text-sm text-destructive">{error.cantidad}</p>}</div>
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
            {estimacion.faltantes.map((f) => <p key={f.productoId} className="mt-2 text-destructive">Ojo: de {nombreDe(f.productoId)} hay {f.disponible} y pedís {f.requerido}.</p>)}
            <p className="mt-2 text-xs text-muted-foreground">El precio y el stock se comprueban al confirmar.</p>
          </div>
        </fieldset>

        {(general || errores.claveSolicitud) && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{general ?? errores.claveSolicitud}</p>{resultado?.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton className="min-h-11" type="submit" pending={enviando} pendingLabel="Guardando…">Confirmar venta</PendingButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
