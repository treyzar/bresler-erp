import type { DeliveryType } from "../types"
import { deliveryTypesApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const deliveryTypeHooks = createDirectoryQueryHooks<DeliveryType>("delivery-types", deliveryTypesApi)
