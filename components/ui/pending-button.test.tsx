import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { PendingButton } from "./pending-button"
import { NavigationButton } from "./navigation-button"
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
it("pending muestra texto/spinner accesible, bloquea click y recupera la accion al fallar", () => {
  const click = vi.fn()
  const { rerender } = render(<PendingButton pending={false} pendingLabel="Guardando…" onClick={click}>Guardar</PendingButton>)
  screen.getByRole("button").focus()
  rerender(<PendingButton pending pendingLabel="Guardando…" onClick={click}>Guardar</PendingButton>)
  const boton = screen.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement
  expect(boton.disabled).toBe(true); expect(boton.getAttribute("aria-busy")).toBe("true")
  expect(boton.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  fireEvent.click(boton); expect(click).not.toHaveBeenCalled()
  rerender(<PendingButton pending={false} pendingLabel="Guardando…" onClick={click}>Guardar</PendingButton>)
  fireEvent.click(screen.getByRole("button", { name: "Guardar" })); expect(click).toHaveBeenCalledTimes(1)
})
it("navegacion mantiene pending hasta completar la transicion, sin bloquear otro CTA", async () => {
  let completar!: () => void
  push.mockImplementationOnce(() => new Promise<void>(r => { completar = r }))
  render(<><NavigationButton href="/destino">Nuevo producto</NavigationButton><PendingButton pending={false} pendingLabel="Guardando…">Otra fila</PendingButton></>)
  fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }))
  const cargando = screen.getByRole("button", { name: "Cargando…" }) as HTMLButtonElement
  fireEvent.click(cargando)
  expect(push).toHaveBeenCalledTimes(1); expect(cargando.disabled).toBe(true)
  expect((screen.getByRole("button", { name: "Otra fila" }) as HTMLButtonElement).disabled).toBe(false)
  await act(async () => completar())
  expect((screen.getByRole("button", { name: "Nuevo producto" }) as HTMLButtonElement).disabled).toBe(false)
})
