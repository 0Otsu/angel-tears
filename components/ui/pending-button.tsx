"use client"
import type { ComponentProps } from "react"
import { Button } from "./button"
import { Spinner } from "./spinner"

export function PendingButton({ pending, pendingLabel, children, disabled, ...props }: Omit<ComponentProps<typeof Button>, "asChild"> & { pending: boolean; pendingLabel: string }) {
  return <Button {...props} disabled={disabled || pending} aria-busy={pending}>{pending ? <><Spinner />{pendingLabel}</> : children}</Button>
}
