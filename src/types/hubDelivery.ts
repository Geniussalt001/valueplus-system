export interface HubItem { code: string; name: string; quantity: number }
export interface HubBranch { code: string; name: string; bdc: string; route: string; ready: boolean; flood: boolean; items: HubItem[] }
export interface HubSettings { company: string; address: string; vendor: string; preparedBy: string }
export interface HubHistory { id: string; date: string; filename: string; path: string; count: number; branchCodes: string[]; sourceName: string; createdAt: string }
export interface HubStore { settings: HubSettings; source: { name: string; importedAt: string } | null; branches: HubBranch[]; templateName: string; history: HubHistory[] }
