"use client"
import { useTransition, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { PendingButton } from "./pending-button"

// CTA explicito; los enlaces secundarios conservan su comportamiento nativo.
export function NavigationButton({ href, children, ...props }: Omit<ComponentProps<typeof PendingButton>, "pending" | "pendingLabel" | "onClick"> & { href: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return <PendingButton {...props} type="button" pending={pending} pendingLabel="Cargando…" onClick={() => { if (!pending) start(() => router.push(href)) }}>{children}</PendingButton>
}
