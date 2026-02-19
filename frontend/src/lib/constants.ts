export const ORDER_STATUSES = {
  N: "Новый",
  P: "В работе",
  C: "Завершён",
  T: "Тендер",
  A: "Архив",
} as const

export const UNIT_TYPES = {
  COMPANY: "Компания",
  BRANCH: "Филиал",
  DIVISION: "Подразделение",
  DEPARTMENT: "Отдел",
  SITE: "Объект",
} as const

export const BUSINESS_ROLES = {
  CUSTOMER: "Заказчик",
  SUPPLIER: "Поставщик",
  PARTNER: "Партнёр",
  OWN: "Собственная",
} as const
