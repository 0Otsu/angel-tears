import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion"
import { FormularioCambioContrasena } from "@/components/admin/formulario-cambio-contrasena"
import { EncabezadoAdmin, PanelAdmin, TituloPanel } from "@/components/admin/piezas-admin"

// Cuenta de la Administradora (tareas 3.3 y 3.5). Nombre y correo son de SOLO LECTURA: no hay
// edicion de identidad, perfil ni roles (decision K1). El tema claro/oscuro NO esta aca: es de
// /admin/configuracion y pertenece a la Ronda 3.
export function CuentaAdmin({ nombre, email }: { nombre: string; email: string }) {
  return (
    <div className="space-y-6">
      <EncabezadoAdmin titulo="Cuenta" descripcion="Tus datos de acceso y la seguridad de tu sesión." />

      <PanelAdmin>
        <TituloPanel titulo="Tus datos" detalle="El nombre y el correo no se pueden modificar desde acá." />
        <dl className="grid gap-5 px-5 pb-6 sm:grid-cols-2 lg:px-6">
          <div>
            <dt className="text-xs text-muted-foreground">Nombre</dt>
            <dd className="mt-1 text-sm font-medium">{nombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Correo</dt>
            <dd className="mt-1 break-all text-sm font-medium">{email}</dd>
          </div>
        </dl>
      </PanelAdmin>

      <PanelAdmin>
        <TituloPanel
          titulo="Cambiar contraseña"
          detalle="Al cambiarla se cierran tus otras sesiones y esta sigue abierta."
        />
        <div className="px-5 pb-6 lg:px-6">
          <FormularioCambioContrasena />
        </div>
      </PanelAdmin>

      <PanelAdmin>
        <TituloPanel titulo="Sesión" detalle="Cerrá esta sesión si usás un dispositivo compartido." />
        <div className="max-w-xs px-5 pb-6 lg:px-6">
          <BotonCerrarSesion />
        </div>
      </PanelAdmin>
    </div>
  )
}
