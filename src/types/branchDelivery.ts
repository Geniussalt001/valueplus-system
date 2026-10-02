export interface DeliveryBranch {
  code: string;
  name: string;
  address: string;
  route: string;
  bdc?: string;
}
export interface DeliveryLine {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  orderedQuantity?: number;
  packSize?: string;
}
export interface BranchDeliveryNote {
  number: string;
  date: string;
  branch: DeliveryBranch;
  lines: DeliveryLine[];
  remark: string;
  preparedBy: string;
  vendor?: string;
}
export interface BranchDeliveryStore {
  branches: DeliveryBranch[];
  notes: BranchDeliveryNote[];
}
