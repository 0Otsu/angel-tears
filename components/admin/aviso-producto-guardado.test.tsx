import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

afterEach(() => { cleanup(); vi.useRealTimers(); window.history.replaceState(null, "", "/") })
it("confirma con check una vez, consume el parametro y desaparece sin mover el listado", () => {
  vi.useFakeTimers()
  window.history.replaceState({ conservado: true }, "", "/admin/productos?cancelado=id&filtro=oculto#lista")
  render(<AvisoProductoGuardado texto="El producto quedó guardado como oculto." />)
  expect(screen.getByRole("status").textContent).toBe("El producto quedó guardado como oculto.")
  expect(screen.getByRole("status").querySelector("svg")).toBeTruthy()
  expect(window.location.pathname + window.location.search + window.location.hash).toBe("/admin/productos?filtro=oculto#lista")
  expect(window.history.state).toEqual({ conservado: true })
  act(() => vi.advanceTimersByTime(5000))
  expect(screen.queryByRole("status")).toBeNull()
})
