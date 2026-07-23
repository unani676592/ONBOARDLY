"use client";

import { createContext, useContext } from "react";
import type { Subtype } from "./workflow-data";

// Node/edge components are rendered by React Flow, so canvas mutations reach
// them through context rather than being threaded through node `data` (which
// must stay serializable for step 3).
export type WorkflowActions = {
  deleteNode: (id: string) => void;
  insertNodeOnEdge: (edgeId: string, subtype: Subtype) => void;
};

export const WorkflowActionsContext = createContext<WorkflowActions | null>(null);

export function useWorkflowActions(): WorkflowActions {
  const ctx = useContext(WorkflowActionsContext);
  if (!ctx) {
    throw new Error("useWorkflowActions must be used within WorkflowActionsContext");
  }
  return ctx;
}
