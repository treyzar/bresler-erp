import type { Contact } from "../types"
import { contactsApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const contactHooks = createDirectoryQueryHooks<Contact>("contacts", contactsApi)
