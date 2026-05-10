"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuditEntry, RequestItem, RequestStatus, UserRole, UserSession } from "@/types";

interface AppState {
  requests: RequestItem[];
  session: UserSession | null;
  notifications: string[];
  auditLogs: AuditEntry[];
  hasHydrated: boolean;
  setRequests: (requests: RequestItem[]) => void;
  hydrateMock: () => void;
  setHasHydrated: (value: boolean) => void;
  login: (session: UserSession) => void;
  logout: () => void;
  createRequest: (payload: Omit<RequestItem, "id" | "requestId" | "createdAt" | "updatedAt" | "workflow">, role: UserSession["role"]) => string | null;
  updateStatus: (id: string, status: RequestStatus, actor: string, role: UserSession["role"]) => boolean;
  updateRequest: (
    id: string,
    patch: Partial<Pick<RequestItem, "title" | "description" | "amount" | "currency" | "priority" | "requestType">>,
    actor: string,
    role: UserSession["role"]
  ) => boolean;
  deleteRequest: (id: string, role: UserSession["role"]) => boolean;
  clearAllRequests: (role: UserSession["role"]) => boolean;
  archiveRequest: (id: string, actor: string, role: UserSession["role"]) => boolean;
  restoreRequest: (id: string, actor: string, role: UserSession["role"]) => boolean;
}

const buildApprovalFlow = (request: Pick<RequestItem, "requestType" | "amount" | "currency">): UserRole[] => {
  void request;
  return ["Admin"];
};

const getCurrentApprover = (request: RequestItem) =>
  request.approvalFlow?.[request.currentApprovalStep ?? 0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      requests: [],
      session: null,
      notifications: [],
      auditLogs: [],
      hasHydrated: false,
      setRequests: (requests) => set({ requests }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      hydrateMock: () => {},
      login: (session) => {
        const now = new Date().toISOString();
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor: session.name,
          role: session.role,
          action: "USER_LOGIN",
          details: `User logged in (${session.department})`,
        };
        set((s) => ({
          session,
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
      },
      logout: () => {
        const current = get().session;
        const now = new Date().toISOString();
        const log: AuditEntry | null = current
          ? {
              id: crypto.randomUUID(),
              at: now,
              actor: current.name,
              role: current.role,
              action: "USER_LOGOUT",
              details: "User logged out",
            }
          : null;
        set((s) => ({
          session: null,
          auditLogs: log ? [log, ...s.auditLogs].slice(0, 1000) : s.auditLogs,
        }));
      },
      createRequest: (payload, role) => {
        if (role !== "Manager" && role !== "Finance") return null;
        const id = crypto.randomUUID();
        const requestId = `REQ-${new Date().getFullYear()}-${String(get().requests.length + 1).padStart(3, "0")}`;
        const now = new Date().toISOString();
        const approvalFlow = buildApprovalFlow(payload);
        const autoSubmit = role === "Finance";
        const created: RequestItem = {
          ...payload,
          id,
          requestId,
          createdAt: now,
          updatedAt: now,
          approvalFlow,
          currentApprovalStep: 0,
          status: autoSubmit ? "Pending Review" : "Draft",
          workflow: [
            { at: now, by: payload.employeeName, role: "Employee", action: "Draft Created" },
            ...(autoSubmit ? [{ at: now, by: payload.employeeName, role: "Finance" as UserRole, action: "Submitted to CEO Review" }] : []),
          ],
        };
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor: payload.employeeName,
          role,
          action: "REQUEST_CREATED",
          requestId: id,
          requestCode: requestId,
          details: `Created request (${payload.requestType}) with route ${approvalFlow.join(" -> ")}`,
        };
        set((s) => ({
          requests: [created, ...s.requests],
          notifications: [`${requestId} created`, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return id;
      },
      updateStatus: (id, status, actor, role) => {
        const current = get().requests.find((r) => r.id === id);
        if (!current) return false;
        if (role === "Finance") return false;
        if ((current.status === "Approved" || current.status === "Rejected") && status !== current.status) return false;

        const now = new Date().toISOString();
        const currentApprover = getCurrentApprover(current);
        let nextRequest: RequestItem = current;
        let notification = `${current.requestId} moved to ${status}`;
        let details = `Changed status to ${status}`;

        if (status === "Pending Review") {
          if (role !== "Manager") return false;
          if (current.status !== "Draft") return false;
          nextRequest = {
            ...current,
            status: "Pending Review",
            updatedAt: now,
            workflow: [...current.workflow, { at: now, by: actor, role, action: "Submitted to approval workflow" }],
          };
        } else if (status === "Approved") {
          if (role !== currentApprover) return false;
          const nextStep = (current.currentApprovalStep ?? 0) + 1;
          const isFinal = nextStep >= (current.approvalFlow?.length ?? 1);
          if (isFinal) {
            nextRequest = {
              ...current,
              status: "Approved",
              updatedAt: now,
              currentApprovalStep: nextStep,
              approvalSignature: {
                approvedBy: actor,
                approvedRole: role,
                approvedAt: now,
                signatureText: `APPROVED-${current.requestId}-${actor}`,
              },
              workflow: [...current.workflow, { at: now, by: actor, role, action: "Final approval completed" }],
            };
            notification = `${current.requestId} fully approved`;
            details = "Final approval completed";
          } else {
            const nextApprover = current.approvalFlow?.[nextStep];
            nextRequest = {
              ...current,
              status: "Pending Review",
              updatedAt: now,
              currentApprovalStep: nextStep,
              workflow: [...current.workflow, { at: now, by: actor, role, action: `Approved and forwarded to ${nextApprover}` }],
            };
            notification = `${current.requestId} forwarded to ${nextApprover}`;
            details = `Approved at stage ${role}, forwarded to ${nextApprover}`;
          }
        } else if (status === "Rejected") {
          if (role !== currentApprover) return false;
          nextRequest = {
            ...current,
            status: "Rejected",
            updatedAt: now,
            approvalSignature: undefined,
            workflow: [...current.workflow, { at: now, by: actor, role, action: "Rejected" }],
          };
          notification = `${current.requestId} rejected`;
          details = "Rejected by approver";
        } else if (status === "Draft") {
          if (role !== "Manager") return false;
          nextRequest = {
            ...current,
            status: "Draft",
            updatedAt: now,
            workflow: [...current.workflow, { at: now, by: actor, role, action: "Returned to draft" }],
          };
        } else if (status === "Archived") {
          if (role !== "Manager") return false;
          nextRequest = {
            ...current,
            status: "Archived",
            updatedAt: now,
            workflow: [...current.workflow, { at: now, by: actor, role, action: "Archived from status update" }],
          };
        }
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUEST_STATUS_CHANGED",
          requestId: current.id,
          requestCode: current.requestId,
          details,
        };

        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? nextRequest : r)),
          notifications: [notification, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
      updateRequest: (id, patch, actor, role) => {
        const current = get().requests.find((r) => r.id === id);
        if (role !== "Manager") return false;
        if (!current || current.status === "Approved" || current.status === "Rejected") return false;
        const now = new Date().toISOString();
        const patched = { ...current, ...patch };
        const approvalFlow = buildApprovalFlow(patched);
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUEST_UPDATED",
          requestId: current.id,
          requestCode: current.requestId,
          details: "Updated request details",
        };
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...patched,
                  approvalFlow,
                  currentApprovalStep: Math.min(r.currentApprovalStep ?? 0, approvalFlow.length - 1),
                  updatedAt: now,
                  workflow: [...r.workflow, { at: now, by: actor, role, action: "Request details updated" }],
                }
              : r
          ),
          notifications: [`${current.requestId} updated`, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
      deleteRequest: (id, role) => {
        const current = get().requests.find((r) => r.id === id);
        if (role !== "Manager") return false;
        if (!current || current.status === "Approved" || current.status === "Rejected") return false;
        const now = new Date().toISOString();
        const actor = get().session?.name || "Unknown";
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUEST_DELETED",
          requestId: current.id,
          requestCode: current.requestId,
          details: "Deleted request",
        };
        set((s) => ({
          requests: s.requests.filter((r) => r.id !== id),
          notifications: [`${current.requestId} deleted`, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
      clearAllRequests: (role) => {
        if (role !== "Manager") return false;
        const now = new Date().toISOString();
        const actor = get().session?.name || "Unknown";
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUESTS_CLEARED",
          details: "Deleted all requests",
        };
        set((s) => ({
          requests: [],
          notifications: ["all requests deleted", ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
      archiveRequest: (id, actor, role) => {
        if (role !== "Manager") return false;
        const current = get().requests.find((r) => r.id === id);
        if (!current || current.status === "Archived") return false;
        const now = new Date().toISOString();
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUEST_ARCHIVED",
          requestId: current.id,
          requestCode: current.requestId,
          details: "Archived request",
        };
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "Archived",
                  updatedAt: now,
                  workflow: [...r.workflow, { at: now, by: actor, role, action: "Archived" }],
                }
              : r
          ),
          notifications: [`${current.requestId} archived`, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
      restoreRequest: (id, actor, role) => {
        if (role !== "Manager") return false;
        const current = get().requests.find((r) => r.id === id);
        if (!current || current.status !== "Archived") return false;
        const now = new Date().toISOString();
        const log: AuditEntry = {
          id: crypto.randomUUID(),
          at: now,
          actor,
          role,
          action: "REQUEST_RESTORED",
          requestId: current.id,
          requestCode: current.requestId,
          details: "Restored archived request",
        };
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "Draft",
                  updatedAt: now,
                  currentApprovalStep: 0,
                  workflow: [...r.workflow, { at: now, by: actor, role, action: "Restored from archive" }],
                }
              : r
          ),
          notifications: [`${current.requestId} restored`, ...s.notifications].slice(0, 12),
          auditLogs: [log, ...s.auditLogs].slice(0, 1000),
        }));
        return true;
      },
    }),
    {
      name: "acs-enterprise-local",
      version: 2,
      migrate: () => ({
        requests: [],
        session: null,
        notifications: [],
        auditLogs: [],
      }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        requests: state.requests,
        session: state.session,
        notifications: state.notifications,
        auditLogs: state.auditLogs,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.requests?.length) {
          state.requests = state.requests.map((r) => ({
            ...r,
            currency: r.currency ?? "USD",
            approvalFlow: r.approvalFlow ?? buildApprovalFlow(r),
            currentApprovalStep: r.currentApprovalStep ?? 0,
            approvalSignature: r.approvalSignature,
          }));
        }
        if (!state?.auditLogs) state!.auditLogs = [];
        state?.setHasHydrated(true);
      },
    }
  )
);
