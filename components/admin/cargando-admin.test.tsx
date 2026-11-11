import { fireEvent,render,screen } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { CargandoAdmin } from './cargando-admin'
import { FiltroAdmin,BotonFiltrar } from './filtro-admin'
const {push}=vi.hoisted(()=>({push:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push})}))
it.each(['listado','resumen','finanzas','detalle','imagenes','preview','grafico','formulario'] as const)('carga %s reserva estructura visual accesible y sin acciones falsas',tipo=>{const {container}=render(<CargandoAdmin tipo={tipo} nombre="sección"/>);expect(screen.getByRole('status',{name:'Cargando sección'}).getAttribute('aria-busy')).toBe('true');expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(3);expect(container.querySelector('[data-slot="skeleton"]')?.className).toContain('motion-reduce:animate-none');expect(screen.queryByRole('button')).toBeNull()})
it('filtra por RSC conservando nombres y valores de campos sin recargar el documento',()=>{render(<FiltroAdmin action="/admin/egresos" aria-label="Filtro"><input name="desde" defaultValue="2026-11-01"/><select name="estado" defaultValue="ANULADO"><option>ANULADO</option></select><BotonFiltrar>Filtrar</BotonFiltrar></FiltroAdmin>);fireEvent.submit(screen.getByRole('form',{name:'Filtro'}));expect(push).toHaveBeenCalledWith('/admin/egresos?desde=2026-11-01&estado=ANULADO',{scroll:false})})
