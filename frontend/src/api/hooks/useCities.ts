import type { City } from "../types"
import { citiesApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const cityHooks = createDirectoryQueryHooks<City>("cities", citiesApi)
