"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export function CancelarProducto({ productoId, hayCambios = false, ocupado = false }: { productoId?: string; hayCambios?: boolean; ocupado?: boolean }) {
  const [abierto, abrir] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  useEffect(() => {
    if (!hayCambios) return
    const advertir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", advertir)
    return () => window.removeEventListener("beforeunload", advertir)
  }, [hayCambios])
  const salir = () => router.push(productoId ? `/admin/productos?cancelado=${encodeURIComponent(productoId)}` : "/admin/productos")
  return <Dialog open={abierto} onOpenChange={abrir}>
    <Button ref={boton} type="button" variant="outline" className="min-h-11 border-destructive/35 text-destructive hover:bg-destructive/5" disabled={ocupado} onClick={() => hayCambios ? abrir(true) : salir()}>Cancelar</Button>
    <DialogContent onCloseAutoFocus={e => { e.preventDefault(); boton.current?.focus() }}>
      <DialogTitle>¿Salir sin guardar estos cambios?</DialogTitle>
      <DialogDescription>{productoId ? "Los cambios locales y la selección sin subir se descartarán. El producto conservará su último estado guardado; no se eliminará." : "Los datos que completaste todavía no se guardaron."}</DialogDescription>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => abrir(false)}>Seguir editando</Button>
        <Button type="button" variant="outline" className="border-destructive/35 text-destructive hover:bg-destructive/5" onClick={salir}>Salir sin guardar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
