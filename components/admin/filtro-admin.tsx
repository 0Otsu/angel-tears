"use client"
import { createContext,useContext,useTransition,type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { PendingButton } from '@/components/ui/pending-button'
const Pendiente=createContext(false)
export function FiltroAdmin({action,children,...props}:Omit<ComponentProps<'form'>,'action'|'onSubmit'> & {action:string}){
 const router=useRouter(),[pendiente,iniciar]=useTransition()
 return <Pendiente.Provider value={pendiente}><form {...props} action={action} method="get" aria-busy={pendiente} onSubmit={e=>{e.preventDefault();if(pendiente)return;const valores=new FormData(e.currentTarget),params=new URLSearchParams();for(const [k,v] of valores)if(typeof v==='string')params.append(k,v);iniciar(()=>router.push(`${action}?${params}`,{scroll:false}))}}>{children}</form></Pendiente.Provider>
}
export function BotonFiltrar({children,...props}:Omit<ComponentProps<typeof PendingButton>,'pending'|'pendingLabel'>){const pendiente=useContext(Pendiente);return <PendingButton {...props} type="submit" pending={pendiente} pendingLabel="Filtrando…">{children}</PendingButton>}
