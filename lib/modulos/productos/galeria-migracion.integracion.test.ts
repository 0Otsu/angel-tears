import { readFile } from "node:fs/promises"
import { expect, it } from "vitest"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

it("SQL real: nueva desde cero y backfill sobre historia previa sin alterar Producto/Inventario", async () => {
  const con = crearConexionPruebas(), cliente = await con.pool.connect()
  const archivos = ["0000_auth-base", "0001_catalogo-proveedores-base", "0002_inventario-base", "0003_producto-galeria"]
  const migraciones = await Promise.all(archivos.map(a => readFile(`drizzle/${a}.sql`, "utf8")))
  await cliente.query("BEGIN")
  try {
    // Dos namespaces aislados dentro de la BD _test validada. ROLLBACK retira todo.
    for (const existente of [true, false]) {
      const esquema = `galeria_${crypto.randomUUID().replaceAll("-", "")}`
      await cliente.query(`CREATE SCHEMA "${esquema}"`)
      await cliente.query(`SET LOCAL search_path TO "${esquema}", public`)
      const aplicar = async (indice: number) => cliente.query(migraciones[indice].replaceAll('"public".', `"${esquema}".`))
      for (let i = 0; i < 3; i++) await aplicar(i)
      if (existente) {
        await cliente.query("INSERT INTO categoria(codigo,nombre) VALUES('collares','Collares')")
        await cliente.query("INSERT INTO producto(slug,nombre,precio,categoria_codigo,publicado,imagen_asset_id,imagen_public_id,imagen_version_proveedor,imagen_url_segura,imagen_ancho,imagen_alto,imagen_formato) VALUES('anterior','Anterior',123.45,'collares',true,'asset-previo','public-previo','42','https://example.test/previa.png',12,8,'png')")
        await cliente.query("INSERT INTO inventario(producto_id,cantidad) SELECT id,5 FROM producto")
      }
      const antes = [(await cliente.query("SELECT * FROM producto")).rows, (await cliente.query("SELECT * FROM inventario")).rows]
      await aplicar(3)
      expect([(await cliente.query("SELECT * FROM producto")).rows, (await cliente.query("SELECT * FROM inventario")).rows]).toEqual(antes)
      const medios = (await cliente.query("SELECT * FROM producto_media")).rows
      expect(medios).toHaveLength(existente ? 1 : 0)
      if (existente) expect(medios[0]).toMatchObject({ tipo: "imagen", orden: 1, principal: true, asset_id: "asset-previo", public_id: "public-previo", version_proveedor: "42", url_segura: "https://example.test/previa.png" })
    }
  } finally { await cliente.query("ROLLBACK"); cliente.release(); await con.pool.end() }
})
