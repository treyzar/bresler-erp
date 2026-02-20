import type { Designer } from "../types"
import { designersApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const designerHooks = createDirectoryQueryHooks<Designer>("designers", designersApi)
