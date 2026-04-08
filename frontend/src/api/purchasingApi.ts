import client from "./client"
import type {
  ListParams,
  PaginatedResponse,
  StockItemType,
  StockMovementType,
  PurchaseRequestListItem,
  PurchaseRequestDetail,
  PurchaseOrderListItem,
  PurchaseOrderDetail,
  SupplierConditionsType,
  PurchasePaymentType,
} from "./types"

const BASE = "/purchasing"

export const purchasingApi = {
  // ── Stock ──────────────────────────────────────────────────
  stockList: (params?: ListParams): Promise<PaginatedResponse<StockItemType>> =>
    client.get(`${BASE}/stock/`, { params }).then((r) => r.data),

  stockDetail: (id: number): Promise<StockItemType> =>
    client.get(`${BASE}/stock/${id}/`).then((r) => r.data),

  stockMovements: (id: number): Promise<StockMovementType[]> =>
    client.get(`${BASE}/stock/${id}/movements/`).then((r) => r.data),

  stockReceive: (id: number, data: { quantity: number; comment?: string }) =>
    client.post(`${BASE}/stock/${id}/receive/`, data).then((r) => r.data),

  stockReserve: (id: number, data: { order: number; quantity: number; comment?: string }) =>
    client.post(`${BASE}/stock/${id}/reserve/`, data).then((r) => r.data),

  stockUnreserve: (id: number, data: { order: number }) =>
    client.post(`${BASE}/stock/${id}/unreserve/`, data).then((r) => r.data),

  // ── Purchase Requests ──────────────────────────────────────
  requestList: (params?: ListParams): Promise<PaginatedResponse<PurchaseRequestListItem>> =>
    client.get(`${BASE}/purchase-requests/`, { params }).then((r) => r.data),

  requestDetail: (id: number): Promise<PurchaseRequestDetail> =>
    client.get(`${BASE}/purchase-requests/${id}/`).then((r) => r.data),

  requestCreate: (data: Partial<PurchaseRequestDetail>) =>
    client.post(`${BASE}/purchase-requests/`, data).then((r) => r.data),

  requestUpdate: (id: number, data: Partial<PurchaseRequestDetail>) =>
    client.patch(`${BASE}/purchase-requests/${id}/`, data).then((r) => r.data),

  requestDelete: (id: number) =>
    client.delete(`${BASE}/purchase-requests/${id}/`),

  requestSubmit: (id: number) =>
    client.post(`${BASE}/purchase-requests/${id}/submit/`).then((r) => r.data),

  requestAddLine: (id: number, data: Record<string, unknown>) =>
    client.post(`${BASE}/purchase-requests/${id}/lines/`, data).then((r) => r.data),

  // ── Purchase Orders ────────────────────────────────────────
  orderList: (params?: ListParams): Promise<PaginatedResponse<PurchaseOrderListItem>> =>
    client.get(`${BASE}/purchase-orders/`, { params }).then((r) => r.data),

  orderDetail: (id: number): Promise<PurchaseOrderDetail> =>
    client.get(`${BASE}/purchase-orders/${id}/`).then((r) => r.data),

  orderCreate: (data: Partial<PurchaseOrderDetail>) =>
    client.post(`${BASE}/purchase-orders/`, data).then((r) => r.data),

  orderUpdate: (id: number, data: Partial<PurchaseOrderDetail>) =>
    client.patch(`${BASE}/purchase-orders/${id}/`, data).then((r) => r.data),

  orderDelete: (id: number) =>
    client.delete(`${BASE}/purchase-orders/${id}/`),

  orderAddLine: (id: number, data: Record<string, unknown>) =>
    client.post(`${BASE}/purchase-orders/${id}/lines/`, data).then((r) => r.data),

  orderExport: (params?: ListParams) =>
    client.get(`${BASE}/purchase-orders/export/`, { params, responseType: "blob" }),

  // ── Supplier Conditions ────────────────────────────────────
  supplierConditionsList: (params?: ListParams): Promise<PaginatedResponse<SupplierConditionsType>> =>
    client.get(`${BASE}/supplier-conditions/`, { params }).then((r) => r.data),

  supplierConditionsDetail: (id: number): Promise<SupplierConditionsType> =>
    client.get(`${BASE}/supplier-conditions/${id}/`).then((r) => r.data),

  supplierConditionsCreate: (data: Partial<SupplierConditionsType>) =>
    client.post(`${BASE}/supplier-conditions/`, data).then((r) => r.data),

  supplierConditionsUpdate: (id: number, data: Partial<SupplierConditionsType>) =>
    client.patch(`${BASE}/supplier-conditions/${id}/`, data).then((r) => r.data),

  // ── Payments ───────────────────────────────────────────────
  paymentList: (params?: ListParams): Promise<PaginatedResponse<PurchasePaymentType>> =>
    client.get(`${BASE}/payments/`, { params }).then((r) => r.data),

  paymentCreate: (data: Partial<PurchasePaymentType>) =>
    client.post(`${BASE}/payments/`, data).then((r) => r.data),

  paymentApprove: (id: number) =>
    client.post(`${BASE}/payments/${id}/approve/`).then((r) => r.data),

  paymentReject: (id: number) =>
    client.post(`${BASE}/payments/${id}/reject/`).then((r) => r.data),

  paymentMarkPaid: (id: number) =>
    client.post(`${BASE}/payments/${id}/mark-paid/`).then((r) => r.data),

  paymentPending: (): Promise<PurchasePaymentType[]> =>
    client.get(`${BASE}/payments/pending/`).then((r) => r.data),
}
