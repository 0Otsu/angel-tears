"use client"

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { crearProductoAccion, editarProductoAccion } from "@/app/admin/(panel)/productos/acciones"
import type { ConsultaAdministrativa, EstadoFormularioProducto, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EncabezadoAdmin, EtiquetaEstado, PanelAdmin, TituloPanel } from "./piezas-admin"

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

function FormularioProducto({ producto, categorias, cancelar }: {
  producto?: ProductoAdministrativo
  categorias: ConsultaAdministrativa["categorias"]
  cancelar: () => void
}) {
  const [valores, setValores] = useState(() => valoresIniciales(producto))
  const [versionEsperada, setVersionEsperada] = useState(producto?.version ?? 0)
  const [resultado, setResultado] = useState<EstadoFormularioProducto>({ estado: "inicial" })
  const [pendiente, iniciar] = useTransition()
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
        if (!producto) setValores(valoresIniciales())
        else setVersionEsperada((version) => version + 1)
        router.refresh()
      }
    })
  }

  return <PanelAdmin>
    <TituloPanel titulo={producto ? "Editar producto" : "Nuevo producto"} detalle={producto ? "La URL y los estados actuales se conservan." : "Se guardará oculto, sin imagen y con stock inicial cero."} />
    <form ref={formularioRef} onSubmit={enviar} noValidate aria-label={producto ? "Editar producto" : "Nuevo producto"} className="space-y-5 px-5 pb-6 lg:px-6">
      {producto && <><input type="hidden" name="id" value={producto.id} /><input type="hidden" name="version" value={versionEsperada} /></>}
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
            {campo.nombre === "precio" && <p id="ayuda-precio" className="text-xs text-muted-foreground">Mayor que cero. Hasta dos decimales, con punto: 1250.50.</p>}
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
        {(resultado.estado === "conflicto_version" || resultado.estado === "no_encontrado") && <Button type="button" variant="outline" onClick={() => { router.refresh(); cancelar() }}>Recargar listado</Button>}
      </div>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente || categorias.length === 0} aria-busy={pendiente}>{pendiente ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}</Button>
        {producto && <Button type="button" variant="outline" disabled={pendiente} onClick={cancelar}>Cancelar edición</Button>}
      </div>
    </form>
  </PanelAdmin>
}

export function ProductosAdmin({ consulta, errorCarga = false }: { consulta: ConsultaAdministrativa; errorCarga?: boolean }) {
  const [seleccion, seleccionar] = useState<string | null>(null)
  const producto = consulta.productos.find((p) => p.id === seleccion)
  return <>
    <EncabezadoAdmin titulo="Productos" descripcion="Administrá los datos y el precio de tus accesorios. El stock se gestiona desde Stock." />
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar los productos. Probá recargar la página.</p><Link href="/admin/productos" className="text-primary underline">Reintentar consulta</Link></PanelAdmin> : <>
      {consulta.categorias.length === 0 && <p role="alert" className="text-sm text-destructive">No hay categorías configuradas. Se necesita completar la preparación de categorías antes de crear productos.</p>}
      <FormularioProducto key={producto?.id ?? "nuevo"} producto={producto} categorias={consulta.categorias} cancelar={() => seleccionar(null)} />
      <PanelAdmin>
        <TituloPanel titulo="Productos registrados" detalle={`${consulta.productos.length} productos · incluye ocultos`} />
        {consulta.productos.length === 0 ? <p className="px-5 pb-6 text-sm text-muted-foreground">Todavía no hay productos registrados.</p> : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><caption className="sr-only">Productos registrados en el negocio</caption>
            <thead><tr>{["Producto", "Categoría", "Precio ARS", "Visibilidad", "Acciones"].map((titulo) => <th key={titulo} className="px-5 py-3 font-medium">{titulo}</th>)}</tr></thead>
            <tbody>{consulta.productos.map((p) => <tr key={p.id} className="border-t border-border">
              <td className="px-5 py-4"><span className="block font-medium">{p.nombre}</span><span className="text-xs text-muted-foreground">{p.slug}</span></td>
              <td className="px-5 py-4">{p.categoriaNombre}</td><td className="whitespace-nowrap px-5 py-4 tabular-nums">$ {p.precio}</td>
              <td className="px-5 py-4"><EtiquetaEstado>{p.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado></td>
              <td className="px-5 py-4"><Button type="button" variant="outline" aria-label={`Editar ${p.nombre}`} onClick={() => seleccionar(p.id)}>Editar</Button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </PanelAdmin>
    </>}
  </>
}
