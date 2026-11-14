import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { crearConexionBd } from "../../lib/infraestructura/conexion-bd"
import { crearPlanDemo, resumirPlan, PRODUCTO_EXPOSICION } from "./plan"
import { EMAIL_DEMO, ErrorDemo, exigirConfirmacion, leerDestinoDemo, verificarIdentidadDemo } from "./seguridad"

// Se resuelve desde el script, no desde una carpeta de trabajo arbitraria.
const raiz = fileURLToPath(new URL("../../", import.meta.url))

async function procesoAdministradora(url: string) {
  const secreto = process.env.DEMO_BETTER_AUTH_SECRET ?? "", origen = process.env.DEMO_BETTER_AUTH_URL ?? ""
  if (secreto.length < 32 || !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(origen)) throw new ErrorDemo("Falta el secreto independiente o el origen HTTPS definitivo de demo.")
  // Reutiliza el comando de Better Auth sin heredar la conexion/secretos comerciales.
  await new Promise<void>((resolver, rechazar) => {
    const hijo = spawn(process.execPath, ["--import", "tsx", "scripts/auth/crear-administradora.ts"], { cwd: raiz, stdio: "inherit", env: {
      ...process.env, DATABASE_URL: url, DATABASE_URL_TEST: "", BETTER_AUTH_SECRET: secreto, BETTER_AUTH_URL: origen,
      ADMIN_EMAIL: EMAIL_DEMO, ADMIN_NOMBRE: "Administradora Demo", ADMIN_CONTRASENA: process.env.DEMO_ADMIN_CONTRASENA ?? "", RESEND_API_KEY: "", RESEND_FROM: "",
    } })
    hijo.on("error", () => rechazar(new ErrorDemo("No se pudo iniciar el comando de administradora.")))
    hijo.on("exit", codigo => codigo === 0 ? resolver() : rechazar(new ErrorDemo("El comando de administradora no termino correctamente.")))
  })
}

async function main() {
  try { process.loadEnvFile(new URL("../../.env.demo.local", import.meta.url)) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new ErrorDemo("No se pudo leer la configuracion local de demo.")
  }
  const [operacion, ...args] = process.argv.slice(2)
  if (operacion === "plan") {
    if (args.length) throw new ErrorDemo("El plan no acepta argumentos.")
    const plan = crearPlanDemo()
    console.log(JSON.stringify({ corte: "2026-11-14", cantidades: { productos: plan.productos.length, proveedores: plan.proveedores.length,
      compras: plan.compras.length, ventas: plan.ventas.length, gastos: plan.gastos.length }, meses: resumirPlan(plan),
      productoExposicion: { id: PRODUCTO_EXPOSICION.id, nombre: PRODUCTO_EXPOSICION.nombre, stockInicial: 5 },
      productosParaImagenes: plan.productos.map(p => ({ id: p.id, nombre: p.nombre, imagenRequerida: p.publicar })) }, null, 2))
    return // No pool, red, migraciones, usuario ni escritura de archivos.
  }
  if (!["verificar", "validar", "imagenes", "migrar", "categorias", "administradora", "seed", "restablecer"].includes(operacion)) throw new ErrorDemo("Comando de demo desconocido.")
  if (operacion === "verificar" || operacion === "validar") { if (args.length) throw new ErrorDemo("La verificacion no acepta argumentos.") }
  else exigirConfirmacion(args, operacion)
  const url = leerDestinoDemo(process.env)
  let imagenes
  if (operacion === "seed" || operacion === "restablecer") {
    const archivo = process.env.DEMO_IMAGENES_ARCHIVO
    if (!archivo) throw new ErrorDemo("Falta DEMO_IMAGENES_ARCHIVO. No se crearan productos sin las imagenes requeridas.")
    const { validarImagenesDemo } = await import("./imagenes")
    let contenido: unknown
    try { contenido = JSON.parse(await readFile(archivo, "utf8")) } catch { throw new ErrorDemo("No se pudo leer el manifiesto local de imagenes.") }
    imagenes = validarImagenesDemo(contenido, process.env.DEMO_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME)
  }
  const conexion = crearConexionBd(url)
  try {
    const identidad = await verificarIdentidadDemo(conexion.pool, operacion !== "verificar")
    if (operacion === "verificar") { console.log(JSON.stringify(identidad)); return }
    if (operacion === "validar") {
      const { validarDatosDemo } = await import("./validar")
      console.log(JSON.stringify(await validarDatosDemo(conexion.db), null, 2))
    } else if (operacion === "imagenes") {
      const { prepararImagenesDemo } = await import("./preparar-imagenes")
      console.log(JSON.stringify(await prepararImagenesDemo(process.env)))
    } else if (operacion === "migrar") {
      // Mismo migrador y mismos SQL que db:migrate; URL explicita, sin .env.local ni generate.
      const { migrate } = await import("drizzle-orm/node-postgres/migrator")
      await migrate(conexion.db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
    } else if (operacion === "administradora") {
      await procesoAdministradora(url)
    } else if (operacion === "categorias") {
      const { sembrarCategorias } = await import("../../lib/modulos/productos/persistencia")
      await conexion.db.transaction(sembrarCategorias)
    } else {
      const { sembrarDemo } = await import("./sembrar")
      await sembrarDemo(conexion.db, imagenes!, operacion === "restablecer")
    }
    console.log(`Demo: ${operacion} completado.`)
  } finally { await conexion.pool.end() }
}

main().catch(error => {
  // Nunca SQL, stack, payload, cadena de conexion ni mensajes de terceros.
  console.error(error instanceof ErrorDemo ? error.message : "No se pudo completar el comando de demo; revisar configuracion y conectividad sin publicar secretos.")
  process.exitCode = 1
})
