import { beforeEach, expect, it, vi } from 'vitest'
import { ErrorSesionRequerida } from '@/lib/modulos/autenticacion/contrato'
const {guardia,consultar}=vi.hoisted(()=>({guardia:vi.fn(),consultar:vi.fn()}))
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('redirect:'+url)}}))
vi.mock('@/lib/modulos/autenticacion/guardia-admin',()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock('@/lib/modulos/finanzas/aplicacion',()=>({obtenerConsultaFinanzas:()=>({consultar})}))
import PaginaFinanzas from './page'
beforeEach(()=>{vi.clearAllMocks();guardia.mockResolvedValue(undefined)})
it('ruta antigua autoriza y conserva período en Resumen sin duplicar consulta',async()=>{await expect(PaginaFinanzas({searchParams:Promise.resolve({modo:'rango',desde:'2020-01-01',hasta:'2020-01-31',estado:'anulado'})})).rejects.toThrow('redirect:/admin?modo=rango&desde=2020-01-01&hasta=2020-01-31&estado=anulado');expect(guardia).toHaveBeenCalledOnce();expect(consultar).not.toHaveBeenCalled()})
it('destino fijo, ignora parámetros ajenos y arrays',async()=>{await expect(PaginaFinanzas({searchParams:Promise.resolve({next:'https://otro.test',modo:['mes','anio']} as never)})).rejects.toThrow('redirect:/admin');expect(consultar).not.toHaveBeenCalled()})
it('sin permiso no redirige a datos ni consulta',async()=>{guardia.mockRejectedValue(new ErrorSesionRequerida());await expect(PaginaFinanzas({searchParams:Promise.resolve({})})).rejects.toBeInstanceOf(ErrorSesionRequerida);expect(consultar).not.toHaveBeenCalled()})
