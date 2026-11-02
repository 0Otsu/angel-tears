import { LoaderCircle } from "lucide-react"
export function Spinner() {
  return <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
}
