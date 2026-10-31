"use client"

import { ErrorDatosPublicos } from "@/components/publico/error-datos"
// Una solicitud nueva tambien descarta el resultado RSC fallido del navegador.
export default function ErrorCatalogo() { return <ErrorDatosPublicos reintentar={() => window.location.reload()} /> }
