"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { crearCategoriaAccion } from "@/app/admin/(panel)/productos/categorias-acciones"
import type { CategoriaProducto } from "@/lib/modulos/productos/categorias"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"

export function DialogoNuevaCategoria({ deshabilitado, alCrear }: {
  deshabilitado: boolean
  alCrear: (categoria: CategoriaProducto) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")
  const [sesionVencida, setSesionVencida] = useState(false)
  const [pendiente, setPendiente] = useState(false)

  function cambiarApertura(valor: boolean) {
    if (pendiente) return
    setAbierto(valor)
    if (!valor) {
      setNombre("")
      setError("")
      setSesionVencida(false)
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    evento.stopPropagation()
    if (pendiente) return
    setPendiente(true)
    setError("")
    setSesionVencida(false)
    try {
      const resultado = await crearCategoriaAccion(nombre)
      switch (resultado.estado) {
        case "ok":
          alCrear(resultado.categoria)
          cambiarApertura(false)
          break
        case "nombre_invalido": setError("Ingresá un nombre de entre 1 y 60 caracteres."); break
        case "duplicada": setError("Ya existe una categoría con ese nombre."); break
        case "sesion_requerida":
          setSesionVencida(true)
          setError("Tu sesión venció.")
          break
        default: setError("No pudimos crear la categoría. Intentá nuevamente.")
      }
    } catch {
      setError("No pudimos crear la categoría. Intentá nuevamente.")
    } finally {
      setPendiente(false)
    }
  }

  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="min-h-11 text-primary" disabled={deshabilitado}>+ Nueva categoría</Button>
    </DialogTrigger>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Nueva categoría</DialogTitle>
        <DialogDescription>La categoría quedará disponible para asignarla a productos.</DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nueva-categoria">Nombre de la categoría</Label>
          <Input id="nueva-categoria" required maxLength={60} value={nombre} disabled={pendiente}
            onChange={evento => setNombre(evento.target.value)} aria-invalid={Boolean(error)}
            aria-describedby={error ? "nueva-categoria-error" : undefined} />
          {error && <p id="nueva-categoria-error" role="alert" className="text-sm text-destructive">{error}
            {sesionVencida && <> <Link href="/admin/login" className="underline">Volvé a iniciar sesión</Link>.</>}
          </p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pendiente} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton type="submit" className="min-h-11" pending={pendiente} pendingLabel="Creando…">Crear categoría</PendingButton>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
