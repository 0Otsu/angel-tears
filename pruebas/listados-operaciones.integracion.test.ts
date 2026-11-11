import { randomUUID } from "node:crypto"
import { expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { crearConexionPruebas } from "./arnes-bd"
import { listarVentas } from "@/lib/modulos/ventas/lectura"
import { listarCompras } from "@/lib/modulos/compras/lectura"
import { crearAdministracionEgresos } from "@/lib/modulos/egresos/administracion"
import type { Paginacion } from "@/lib/paginacion"

// Fixtures de proyeccion/volumen; no prueban registro ni efectos de inventario.
// Cabeceras y lineas solo existen dentro de la tx, siempre revertida.
it.each(["venta", "compra", "egreso"] as const)("%s pagina 2003 operaciones con empates, filtros y rollback", async tabla => {
  const c = crearConexionPruebas(), fin = new Error("ROLLBACK_VOLUMEN"), actor = `volumen-${randomUUID()}`, producto = randomUUID()
  try {
    try { await c.db.transaction(async tx => {
      const previos = await tx.execute(sql`SELECT count(*)::int AS n FROM ${sql.identifier(tabla)} WHERE fecha_operacion BETWEEN '1874-03-01' AND '1874-03-31'`)
      expect(previos.rows[0].n).toBe(0)
      await tx.execute(sql`INSERT INTO "user"(id,name,email) VALUES (${actor},'Volumen pruebas',${actor + "@test.invalid"})`)
      await tx.execute(sql`INSERT INTO categoria(codigo,nombre) VALUES ('anillos','Anillos') ON CONFLICT DO NOTHING`)
      await tx.execute(sql`INSERT INTO producto(id,slug,nombre,precio,categoria_codigo) VALUES (${producto},${"volumen-" + producto},'Volumen proyeccion',100.10,'anillos')`)
      const vigente = tabla === "egreso" ? "CONFIRMADO" : "CONFIRMADA", anulado = tabla === "egreso" ? "ANULADO" : "ANULADA"
      await tx.execute(sql`INSERT INTO ${sql.identifier(tabla)}(id,fecha_operacion,${sql.identifier(tabla === "egreso" ? "importe" : "total")},${sql.identifier(tabla === "egreso" ? "concepto" : tabla === "venta" ? "comprador" : "nota")},estado,actor_id,clave_solicitud,huella,anulado_en,anulado_por_id)
        SELECT md5(${actor}||n::text)::uuid, date '1874-03-01'+(n%28),100.10,'Volumen '||n,CASE WHEN n%3=0 THEN ${anulado} ELSE ${vigente} END,${actor},md5(${actor}||'clave'||n)::uuid,'fixture-lectura',CASE WHEN n%3=0 THEN now() ELSE NULL END,CASE WHEN n%3=0 THEN ${actor} ELSE NULL END FROM generate_series(1,2003) n`)
      if (tabla !== "egreso") {
        const linea = `${tabla}_linea`, columna = `${tabla}_id`, unitario = tabla === "venta" ? "precio_unitario_historico" : "costo_unitario_historico"
        await tx.execute(sql`INSERT INTO ${sql.identifier(linea)}(${sql.identifier(columna)},numero_linea,producto_id,nombre_producto_historico,cantidad,${sql.identifier(unitario)},subtotal) SELECT id,1,${producto},'Volumen',1,100.10,100.10 FROM ${sql.identifier(tabla)} WHERE actor_id=${actor}`)
      }
      const db = tx as unknown as typeof c.db
      const gastos = crearAdministracionEgresos({ db, exigir: async () => ({ id: actor, nombre: "Prueba", email: actor + "@test.invalid" }) })
      const consultar = async (filtro: { pagina?: unknown; desde?: string; hasta?: string; estado?: string }) => {
        const f = { desde: "1874-03-01", hasta: "1874-03-31", ...filtro }
        const r = tabla === "venta" ? await listarVentas(tx, f) : tabla === "compra" ? await listarCompras(tx, f) : await gastos.listar(new Headers(), f)
        expect(r.estado).toBe("ok")
        if (r.estado !== "ok") throw Error("Listado rechazado")
        const filas = "ventas" in r ? r.ventas : "compras" in r ? r.compras : r.egresos
        return { filas, paginacion: r.paginacion as Paginacion, hayMas: r.hayMas }
      }
      const referencia = (await tx.execute(sql`SELECT id FROM ${sql.identifier(tabla)} WHERE actor_id=${actor} ORDER BY fecha_operacion DESC,id DESC`)).rows.map(r => r.id)
      const vistos: string[] = []
      for (let pagina = 1; pagina <= 81; pagina++) {
        const r = await consultar({ pagina })
        expect(r.paginacion).toEqual({ pagina, porPagina: 25, total: 2003, paginas: 81 })
        expect(r.filas).toHaveLength(pagina === 81 ? 3 : 25)
        expect(r.hayMas).toBe(pagina < 81)
        vistos.push(...r.filas.map(f => f.id))
      }
      expect(vistos).toEqual(referencia); expect(new Set(vistos).size).toBe(2003)
      const filtro = await consultar({ estado: anulado, desde: "1874-03-05", hasta: "1874-03-10" })
      expect(filtro.paginacion.total).toBe(Array.from({ length: 2003 }, (_, i) => i + 1).filter(n => n % 3 === 0 && n % 28 >= 4 && n % 28 <= 9).length)
      expect(filtro.filas.every(f => f.estado === anulado)).toBe(true)
      expect((await consultar({ pagina: 99999 })).paginacion.pagina).toBe(81)
      const vacio = await consultar({ desde: "1873-01-01", hasta: "1873-01-02", pagina: 4 })
      expect(vacio.filas).toEqual([]); expect(vacio.paginacion).toEqual({ pagina: 1, porPagina: 25, total: 0, paginas: 1 })
      const invalido = tabla === "venta" ? await listarVentas(tx, { pagina: "1 OR 1=1" }) : tabla === "compra" ? await listarCompras(tx, { pagina: -1 }) : await gastos.listar(new Headers(), { pagina: "no" })
      expect(invalido.estado).toBe("datos_invalidos")
      const plan = await tx.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM ${sql.identifier(tabla)} WHERE estado=${anulado} AND fecha_operacion BETWEEN '1874-03-01' AND '1874-03-31' ORDER BY fecha_operacion DESC,id DESC LIMIT 25 OFFSET 250`)
      const detalle = (plan.rows[0]["QUERY PLAN"] as { "Execution Time": number }[])[0]
      console.info("[listados] volumen aislado", { tabla, filas: 2003, paginas: 81, lecturaMs: detalle["Execution Time"] })
      throw fin
    }) } catch (e) { if (e !== fin) throw e }
    expect((await c.db.execute(sql`SELECT 1 FROM "user" WHERE id=${actor}`)).rows).toHaveLength(0)
  } finally { await c.pool.end() }
}, 30000)
