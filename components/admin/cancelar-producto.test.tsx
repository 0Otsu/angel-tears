import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { CancelarProducto } from "./cancelar-producto"
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
beforeEach(() => push.mockReset())
it("antes de persistir cancela sin mutacion y vuelve al listado", () => {
  render(<CancelarProducto />); fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
  expect(push).toHaveBeenCalledWith("/admin/productos")
})
it("producto persistido se conserva: navega para consultar/mostrar estado, sin comando de borrado", () => {
  render(<CancelarProducto productoId="producto-conservado" />)
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
  expect(push).toHaveBeenCalledWith("/admin/productos?cancelado=producto-conservado")
})
it("borrador requiere decision; Escape devuelve foco y salir acepta descartar solo cambios locales", async () => {
  render(<CancelarProducto productoId="producto-conservado" hayCambios />)
  const boton = screen.getByRole("button", { name: "Cancelar" }); boton.focus(); fireEvent.click(boton)
  expect(await screen.findByRole("dialog")).toBeTruthy()
  expect(screen.getByText(/no se eliminará/)).toBeTruthy(); expect(push).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }))
  await waitFor(() => expect(document.activeElement).toBe(boton))
  fireEvent.click(boton); fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  await waitFor(() => expect(document.activeElement).toBe(boton))
  fireEvent.click(boton); fireEvent.click(screen.getByRole("button", { name: "Salir sin guardar" }))
  expect(push).toHaveBeenCalledWith("/admin/productos?cancelado=producto-conservado")
})
it("no permite abandonar una operacion pendiente", () => {
  render(<CancelarProducto productoId="producto-conservado" ocupado />)
  expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true)
})
