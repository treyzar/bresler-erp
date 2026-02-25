import type { Facility } from "../types"
import { facilitiesApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const facilityHooks = createDirectoryQueryHooks<Facility>("facilities", facilitiesApi)
