"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DIAS_SEMANA, type DiaAtencion, type FranjaAtencion, type HorariosAtencion } from "@/lib/modulos/configuracion/contrato"
import { esquemaFranjasDia } from "@/lib/modulos/configuracion/validacion"
import { NOMBRES_DIAS, describirFranjas } from "@/lib/negocio-publico"

const horas = Array.from({ length: 96 }, (_, indice) =>
  `${String(Math.floor(indice / 4)).padStart(2, "0")}:${String((indice % 4) * 15).padStart(2, "0")}`,
)
const franjaVacia: FranjaAtencion = { apertura: "", cierre: "" }

function SelectorHora({ id, etiqueta, valor, original, alCambiar }: {
  id: string
  etiqueta: string
  valor: string
  original?: string
  alCambiar: (valor: string) => void
}) {
  const opciones = [...new Set([...horas, original, valor].filter((hora): hora is string => Boolean(hora)))].sort()
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>{etiqueta}</Label>
    <Select value={valor} onValueChange={alCambiar}>
      <SelectTrigger id={id} className="w-full data-[size=default]:h-11">
        <SelectValue placeholder="Seleccioná" />
      </SelectTrigger>
      <SelectContent align="start" collisionPadding={8}
        className="max-h-[min(18rem,var(--radix-select-content-available-height))] [&_[data-radix-select-viewport]]:h-auto">
        {opciones.map(hora => <SelectItem key={hora} value={hora} className="min-h-11">{hora}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
}

export function HorariosConfiguracion({ horarios, inicial, diaEnEdicion, editar, cambiar, mostrarErrores, errorServidor }: {
  horarios: HorariosAtencion
  inicial: HorariosAtencion
  diaEnEdicion: DiaAtencion | null
  editar: (dia: DiaAtencion | null) => void
  cambiar: (horarios: HorariosAtencion) => void
  mostrarErrores: boolean
  errorServidor?: string
}) {
  return <fieldset className="min-w-0 space-y-2" aria-describedby={errorServidor ? "negocio-horarios-error" : undefined}>
    <legend className="text-sm font-medium">Horarios de atención</legend>
    <ul className="divide-y divide-border rounded-md border border-border">
      {DIAS_SEMANA.map(dia => {
        const nombre = NOMBRES_DIAS[dia]
        const franjas = horarios[dia]
        const abierto = diaEnEdicion === dia
        const panel = `horario-${dia}`
        const validacion = esquemaFranjasDia.safeParse(franjas)
        const error = mostrarErrores ? validacion.error?.issues[0]?.message : undefined
        const actualizar = (nuevas: FranjaAtencion[]) => cambiar({ ...horarios, [dia]: nuevas })

        function cambiarHora(indice: number, campo: keyof FranjaAtencion, valor: string) {
          actualizar(franjas.map((franja, i) => i === indice ? { ...franja, [campo]: valor } : franja))
        }

        function aplicarEntreSemana() {
          if (!validacion.success) return
          const siguientes = { ...horarios }
          for (const laborable of DIAS_SEMANA.slice(0, 5)) siguientes[laborable] = validacion.data
          cambiar(siguientes)
        }

        return <li key={dia} className="px-3 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-3 py-1">
            <div className="min-w-0 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-3">
              <span className="block font-medium sm:w-24">{nombre}</span>
              <span className="block text-muted-foreground">{describirFranjas(franjas)}</span>
            </div>
            <Button type="button" variant="ghost" className="min-h-11 shrink-0 px-2"
              aria-label={abierto ? `Cerrar edición de ${nombre}` : `Editar ${nombre}`}
              aria-expanded={abierto} aria-controls={panel} onClick={() => editar(abierto ? null : dia)}>
              {abierto ? "Cerrar edición" : "Editar"}
            </Button>
          </div>
          <div id={panel} hidden={!abierto}>
            {abierto && <fieldset className="min-w-0 space-y-3 border-t border-border pb-3 pt-2"
              aria-label={`Horario de ${nombre}`} aria-describedby={error ? `${panel}-error` : undefined}>
              <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={franjas.length === 0}
                  onChange={e => actualizar(e.target.checked ? [] : [franjaVacia])} />
                Día cerrado
              </label>
              {franjas.map((franja, indice) => (
                <fieldset key={indice} className="min-w-0 space-y-2">
                  {franjas.length > 1 && <legend className="text-sm font-medium">Franja {indice + 1}</legend>}
                  <div className="grid grid-cols-2 gap-3">
                    {(["apertura", "cierre"] as const).map(campo => <SelectorHora
                      key={campo} id={`${panel}-${indice}-${campo}`}
                      etiqueta={campo === "apertura" ? "Apertura" : "Cierre"}
                      valor={franja[campo]} original={inicial[dia][indice]?.[campo]}
                      alCambiar={valor => cambiarHora(indice, campo, valor)} />)}
                  </div>
                  {indice === 1 && <Button type="button" variant="ghost" className="min-h-11"
                    onClick={() => actualizar(franjas.slice(0, 1))}>Quitar segunda franja</Button>}
                </fieldset>
              ))}
              {franjas.length > 0 && <div className="flex flex-wrap gap-2">
                {franjas.length === 1 && <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => actualizar([...franjas, franjaVacia])}>+ Agregar otra franja</Button>}
                <Button type="button" variant="outline" disabled={!validacion.success}
                  className="min-h-11 h-auto max-w-full whitespace-normal text-left"
                  onClick={aplicarEntreSemana}>Aplicar este horario de lunes a viernes</Button>
              </div>}
            </fieldset>}
          </div>
          {error && <p role="alert" id={`${panel}-error`} className="pb-2 text-sm text-destructive">{error}</p>}
        </li>
      })}
    </ul>
    {errorServidor && <p id="negocio-horarios-error" role="alert" className="text-sm text-destructive">{errorServidor}</p>}
  </fieldset>
}
