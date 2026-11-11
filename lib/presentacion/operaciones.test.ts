import {expect,it} from "vitest"
import {resolverFiltrosOperaciones,enlaceOperaciones} from "./operaciones"
it("usa mes calendario argentino incluso cerca del cambio UTC",()=>{
 const r=resolverFiltrosOperaciones({},new Date("2026-03-01T01:00:00Z"))
 expect(r.filtros).toMatchObject({periodo:"mes",desde:"2026-02-01",hasta:"2026-02-28",pagina:"1"})
})
it("mes anterior cruza anio y febrero bisiesto",()=>{
 expect(resolverFiltrosOperaciones({periodo:"anterior"},new Date("2026-01-10T12:00Z")).filtros).toMatchObject({desde:"2025-12-01",hasta:"2025-12-31"})
 expect(resolverFiltrosOperaciones({periodo:"anterior"},new Date("2024-03-10T12:00Z")).filtros).toMatchObject({desde:"2024-02-01",hasta:"2024-02-29"})
})
it("historial completo no impone fechas y enlaces anteriores conservan rangos abiertos",()=>{
 expect(resolverFiltrosOperaciones({periodo:"todo"}).filtros).toMatchObject({desde:"",hasta:""})
 expect(resolverFiltrosOperaciones({desde:"2020-01-01"}).filtros).toMatchObject({periodo:"fechas",desde:"2020-01-01",hasta:""})
 expect(resolverFiltrosOperaciones({desde:"",hasta:""}).filtros.periodo).toBe("todo")
})
it("no acepta arrays ni periodos desconocidos",()=>{
 expect(resolverFiltrosOperaciones({periodo:"ayer"}).errores.periodo).toBeTruthy()
 expect(resolverFiltrosOperaciones({pagina:["1","2"]}).errores.pagina).toBeTruthy()
})
it("paginacion conserva filtros y cambiar filtro genera pagina uno",()=>{
 const f={periodo:"fechas" as const,desde:"2020-01-01",hasta:"2020-02-01",estado:"ANULADO",pagina:"8"}
 expect(enlaceOperaciones("/admin/gastos",f,2)).toBe("/admin/gastos?periodo=fechas&estado=ANULADO&desde=2020-01-01&hasta=2020-02-01&pagina=2")
 expect(enlaceOperaciones("/admin/gastos",f)).not.toContain("pagina=")
})
