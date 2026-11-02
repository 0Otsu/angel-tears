"use client"

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { crearProductoAccion, editarProductoAccion } from "@/app/admin/(panel)/productos/acciones"
import type { ConsultaAdministrativa, EstadoFormularioProducto, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

const campos = [
  { nombre: "nombre", etiqueta: "Nombre", requerido: true },
  { nombre: "precio", etiqueta: "Precio de venta (ARS)", requerido: true },
  { nombre: "descripcion", etiqueta: "Descripción" },
  { nombre: "material", etiqueta: "Material" },
  { nombre: "medida", etiqueta: "Medidas" },
  { nombre: "color", etiqueta: "Color" },
  { nombre: "cuidados", etiqueta: "Cuidados" },
] as const

type NombreCampo = typeof campos[number]["nombre"] | "categoriaCodigo"
function valoresIniciales(producto?: ProductoAdministrativo): Record<NombreCampo, string> {
  return {
    nombre: producto?.nombre ?? "", precio: producto?.precio ?? "", categoriaCodigo: producto?.categoriaCodigo ?? "",
    descripcion: producto?.descripcion ?? "", material: producto?.material ?? "", medida: producto?.medida ?? "",
    color: producto?.color ?? "", cuidados: producto?.cuidados ?? "",
  }
}

function mensaje(resultado: EstadoFormularioProducto) {
  switch (resultado.estado) {
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión antes de guardar."
    case "conflicto_version": return "Otra edición se guardó antes. Recargá el listado y revisá el producto antes de volver a editarlo."
    case "no_encontrado": return "El producto ya no está disponible. Recargá el listado."
    case "error_tecnico": return "No pudimos guardar el producto. Conservamos tus datos para que puedas reintentar."
    case "datos_invalidos": return "Revisá los campos indicados."
    default: return null
  }
}

export function FormularioProducto({ producto, categorias, cancelar, versionPropia, alGuardar, alCambiarOcupado }: {
  producto?: ProductoAdministrativo
  categorias: ConsultaAdministrativa["categorias"]
  cancelar: () => void
  versionPropia?: number
  alGuardar?: (id: string, datos: Record<NombreCampo, string>) => void
  alCambiarOcupado?: (ocupado: boolean) => void
}) {
  const [valores, setValores] = useState(() => valoresIniciales(producto))
  const [versionEsperada, setVersionEsperada] = useState(producto?.version ?? 0)
  const [resultado, setResultado] = useState<EstadoFormularioProducto>({ estado: "inicial" })
  const [pendiente, iniciar] = useTransition()
  useEffect(() => { alCambiarOcupado?.(pendiente) }, [pendiente, alCambiarOcupado])
  const formularioRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const errores = resultado.estado === "datos_invalidos" ? resultado.errores : {}

  useEffect(() => {
    if (!pendiente && resultado.estado === "datos_invalidos") {
      const campo = formularioRef.current?.elements.namedItem(Object.keys(resultado.errores)[0])
      if (campo instanceof HTMLElement) campo.focus()
    }
  }, [pendiente, resultado])

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (pendiente) return
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    iniciar(async () => {
      let respuesta: EstadoFormularioProducto
      try {
        respuesta = await (producto ? editarProductoAccion(datos) : crearProductoAccion(datos))
      } catch {
        respuesta = { estado: "error_tecnico" }
      }
      setResultado(respuesta)
      if (respuesta.estado === "ok") {
        if (producto) setVersionEsperada(Math.max(versionEsperada, versionPropia ?? 0) + 1)
        alGuardar?.(respuesta.productoId, valores)
        if (producto) router.refresh()
      }
    })
  }

  return <PanelAdmin>
    <TituloPanel titulo="Datos del producto" detalle={producto ? "La URL y los estados actuales se conservan." : "Se conservará oculto hasta que elijas publicarlo."} />
    <form ref={formularioRef} onSubmit={enviar} noValidate aria-label={producto ? "Editar producto" : "Nuevo producto"} className="space-y-5 px-5 pb-6 lg:px-6">
      {producto && <><input type="hidden" name="id" value={producto.id} /><input type="hidden" name="version" value={Math.max(versionEsperada, versionPropia ?? 0)} /></>}
      <fieldset disabled={pendiente} className="grid min-w-0 gap-5 sm:grid-cols-2">
        {campos.map((campo) => {
          const requerido = "requerido" in campo && campo.requerido
          return <div key={campo.nombre} className="min-w-0 space-y-2">
            <Label htmlFor={`producto-${campo.nombre}`}>{campo.etiqueta}{requerido ? " *" : ""}</Label>
            <Input id={`producto-${campo.nombre}`} name={campo.nombre} value={valores[campo.nombre]}
              onChange={(e) => setValores({ ...valores, [campo.nombre]: e.target.value })}
              required={requerido} aria-invalid={Boolean(errores[campo.nombre])}
              aria-describedby={errores[campo.nombre] ? `error-${campo.nombre}` : campo.nombre === "precio" ? "ayuda-precio" : undefined}
              inputMode={campo.nombre === "precio" ? "decimal" : undefined} className="h-11 bg-background" />
            {campo.nombre === "precio" && <p id="ayuda-precio" className="text-xs text-muted-foreground">Mayor que $0. Decimales opcionales, hasta dos: 222, 222.5 o 222.50.</p>}
            {errores[campo.nombre] && <p id={`error-${campo.nombre}`} className="text-sm text-destructive">{errores[campo.nombre]}</p>}
          </div>
        })}
        <div className="min-w-0 space-y-2">
          <Label htmlFor="producto-categoria">Categoría *</Label>
          <select id="producto-categoria" name="categoriaCodigo" value={valores.categoriaCodigo}
            onChange={(e) => setValores({ ...valores, categoriaCodigo: e.target.value })} required
            aria-invalid={Boolean(errores.categoriaCodigo)} aria-describedby={errores.categoriaCodigo ? "error-categoriaCodigo" : undefined}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary">
            <option value="">Elegí una categoría</option>
            {categorias.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select>
          {errores.categoriaCodigo && <p id="error-categoriaCodigo" className="text-sm text-destructive">{errores.categoriaCodigo}</p>}
        </div>
      </fieldset>
      {resultado.estado === "ok" && <p role="status" className="text-sm text-primary">Producto guardado correctamente.</p>}
      {mensaje(resultado) && <div role="alert" className="space-y-2 text-sm text-destructive">
        <p>{mensaje(resultado)}</p>
        {resultado.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}
        {(resultado.estado === "conflicto_version" || resultado.estado === "no_encontrado") && <Button type="button" variant="outline" onClick={() => { window.location.reload() }}>Recargar listado</Button>}
      </div>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente || categorias.length === 0} aria-busy={pendiente}>{pendiente ? "Guardando…" : producto ? "Guardar cambios" : "Guardar y continuar"}</Button>
        {producto && <Button type="button" variant="outline" disabled={pendiente} onClick={cancelar}>Cancelar edición</Button>}
      </div>
    </form>
  </PanelAdmin>
}
