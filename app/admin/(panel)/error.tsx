"use client"
import { useTransition } from 'react'
import { PendingButton } from '@/components/ui/pending-button'
export default function ErrorPanel({reset}:{reset:()=>void}){const[pendiente,iniciar]=useTransition();return <section className="space-y-4 rounded-2xl border p-5"><h1 className="font-serif text-2xl">No pudimos cargar esta sección</h1><p role="alert">Intentá nuevamente.</p><PendingButton pending={pendiente} pendingLabel="Reintentando…" onClick={()=>iniciar(reset)}>Reintentar consulta</PendingButton></section>}
