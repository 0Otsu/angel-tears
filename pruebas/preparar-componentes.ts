import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Vitest no expone `afterEach` global, asi que React Testing Library no limpia el DOM solo.
afterEach(() => {
  cleanup()
})
