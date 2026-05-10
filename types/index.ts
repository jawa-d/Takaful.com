export type UserRole = "Employee" | "Manager" | "Finance" | "Admin";
export type RequestStatus = "Draft" | "Pending Review" | "Approved" | "Rejected" | "Archived";
export type RequestType = "Financial" | "Internal Approval" | "Administrative" | "Purchase" | "HR";
export type CurrencyCode = "USD" | "IQD";
export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "REQUEST_CREATED"
  | "REQUEST_UPDATED"
  | "REQUEST_STATUS_CHANGED"
  | "REQUEST_DELETED"
  | "REQUESTS_CLEARED"
  | "REQUEST_ARCHIVED"
  | "REQUEST_RESTORED";

export interface WorkflowEntry {
  at: string;
  by: string;
  role: UserRole;
  action: string;
  comment?: string;
}

export interface RequestItem {
  id: string;
  requestId: string;
  employeeName: string;
  department: string;
  requestType: RequestType;
  title: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  status: RequestStatus;
  priority: "Low" | "Medium" | "High" | "Critical";
  attachments: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
  approvalFlow?: UserRole[];
  currentApprovalStep?: number;
  approvalSignature?: {
    approvedBy: string;
    approvedRole: UserRole;
    approvedAt: string;
    signatureText: string;
  };
  workflow: WorkflowEntry[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: UserRole;
  action: AuditAction;
  requestId?: string;
  requestCode?: string;
  details: string;
}

export interface ExecutiveMetrics {
  pendingIT: number;
  pendingCEO: number;
  overdue48h: number;
}

export interface UserSession {
  name: string;
  role: UserRole;
  department: string;
  rtl: boolean;
}
