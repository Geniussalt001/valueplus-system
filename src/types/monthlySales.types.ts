export interface MonthlySalesTrend {
  key: string;
  year: number;
  month: number;
  monthName: string;
  periodEnd?: string | null;
  sourceFile?: string | null;
  importedAt?: string | null;
  sales: number;
  cn: number;
  net: number;
}

export interface MonthlySalesSelected
  extends MonthlySalesTrend {
  periodStart?: string | null;
  transactionCount?: number | null;
  cnRate: number;
}

export interface MonthlySalesProduct {
  productCode: string;
  sourceCode: string;
  name: string;
  sales: number;
  cn: number;
  net: number;
  salesAmount?: number;
  cnAmount?: number;
  cnRate: number;
  salesShare: number;
  previousNet: number;
  change: number;
  changeRate: number | null;
}

export interface MonthlySalesHistory {
  monthKey: string;
  monthName: string;
  periodEnd: string;
  sourceFile: string;
  sourceHash: string;
  importedAt: string;
  transactionCount: number;
  sales: number;
  cn: number;
  net: number;
}

export interface MonthlySalesSummary {
  months: MonthlySalesTrend[];
  selectedMonth: string | null;
  selected?: MonthlySalesSelected;
  totals: {
    sales: number;
    cn: number;
    net: number;
  };
  products: MonthlySalesProduct[];
  history: MonthlySalesHistory[];
  workbookPath: string;
}

export interface MonthlySalesPreview {
  year: number;
  month: number;
  monthKey: string;
  monthName: string;
  periodStart: string;
  periodEnd: string;
  sourceFile: string;
  sourceHash: string;
  transactionCount: number;
  salesRowCount: number;
  cnRowCount: number;
  sales: number;
  cn: number;
  net: number;
  salesAmount: number;
  cnAmount: number;
  duplicate: boolean;
  olderThanStored: boolean;
  replacesExistingMonth: boolean;
  previous: {
    sales: number;
    cn: number;
    net: number;
    periodEnd?: string | null;
  } | null;
  difference: {
    sales: number;
    cn: number;
    net: number;
  };
  ignoredProducts: string[];
}
