import type { Equipment } from "../types"
import { equipmentApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const equipmentHooks = createDirectoryQueryHooks<Equipment>("equipment", equipmentApi)
