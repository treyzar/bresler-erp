import type { Country } from "../types"
import { countriesApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const countryHooks = createDirectoryQueryHooks<Country>("countries", countriesApi)
