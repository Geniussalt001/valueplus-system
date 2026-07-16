export interface WarehousePrintOption {
  warehouse: string;
  sheets: string[];
  selected: boolean;
  copies: number;
}

export interface WarehousePrintRequest {
  warehouse: string;
  sheets: string[];
  copies: number;
}

export interface PrintWorkbookInput {
  workbookPath: string;
  warehouses:
    WarehousePrintRequest[];
}