export const ORDER_STATUSES = {
  N: "Новый",
  P: "В работе",
  C: "Завершён",
  T: "Тендер",
  A: "Архив",
} as const

export const UNIT_TYPES: Record<string, string> = {
  company: "Головная компания / Холдинг",
  branch: "Филиал / Дочерняя компания",
  division: "Производственное отделение",
  service: "Служба",
  department: "Отдел",
  sector: "Сектор",
  site: "Площадка",
  other: "Другое",
}

export const BUSINESS_ROLES: Record<string, string> = {
  customer: "Заказчик",
  supplier: "Поставщик",
  participant: "Участник запроса",
  internal: "Внутренняя компания",
  partner: "Партнёр / Посредник",
  manufacturer: "Производитель оборудования",
  contractor: "Генподрядчик",
  designer: "Проектировщик",
  expertise: "Орган экспертизы",
  buyer_branch: "Филиал-покупатель (Legacy)",
  shipment_site: "Площадка отгрузки (Legacy)",
  other: "Другое",
}
