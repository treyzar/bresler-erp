import type { TypeOfWork } from "../types"
import { worksApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const worksHooks = createDirectoryQueryHooks<TypeOfWork>("works", worksApi)
