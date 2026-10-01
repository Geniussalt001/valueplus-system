export interface DeliveryBranch {
  code: string;
  name: string;
  address: string;
  route: string;
}
export interface DeliveryLine {
  code: string;
  name: string;
  quantity: number;
  unit: string;
}
export interface BranchDeliveryNote {
  number: string;
  date: string;
  branch: DeliveryBranch;
  lines: DeliveryLine[];
  remark: string;
  preparedBy: string;
}
export interface BranchDeliveryStore {
  branches: DeliveryBranch[];
  notes: BranchDeliveryNote[];
}
