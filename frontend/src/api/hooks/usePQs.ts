import type { PQ } from "../types"
import { pqsApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const pqHooks = createDirectoryQueryHooks<PQ>("pqs", pqsApi)
