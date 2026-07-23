import type { Edge } from "@xyflow/react";
import type { WorkflowNode, WorkflowNodeData } from "./workflow-data";

// The serializable, DB-ready shapes (jsonb columns). Presentation is derived
// from BLOCKS at render time and is never stored.
export type PersistedNode = {
  id: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
};

export type PersistedEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowStatus = "draft" | "enabled";

// A row of public.workflows.
export type WorkflowRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: PersistedNode[];
  edges: PersistedEdge[];
  created_at: string;
  updated_at: string;
};

// --- Canvas <-> DB conversion ---------------------------------------------

export function toPersistedNodes(nodes: WorkflowNode[]): PersistedNode[] {
  return nodes.map((n) => ({
    id: n.id,
    position: { x: n.position.x, y: n.position.y },
    data: n.data,
  }));
}

export function toPersistedEdges(edges: Edge[]): PersistedEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

// Re-apply the custom node/edge types that aren't stored.
export function hydrateNodes(nodes: PersistedNode[]): WorkflowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "workflow",
    position: n.position,
    data: n.data,
  }));
}

export function hydrateEdges(edges: PersistedEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "plus",
  }));
}

// A stable, order-independent fingerprint of the persistable state, used for
// dirty detection. Accepts either live canvas objects or persisted rows since
// both expose { id, position, data } / { id, source, target }.
type NodeLike = { id: string; position: { x: number; y: number }; data: WorkflowNodeData };
type EdgeLike = { id: string; source: string; target: string };

export function fingerprint(
  nodes: NodeLike[],
  edges: EdgeLike[],
  status: WorkflowStatus,
  name: string,
  description: string,
): string {
  const byId = (a: { id: string }, b: { id: string }) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return JSON.stringify({
    name,
    description,
    status,
    nodes: nodes
      .map((n) => ({
        id: n.id,
        position: { x: n.position.x, y: n.position.y },
        data: n.data,
      }))
      .sort(byId),
    edges: edges
      .map((e) => ({ id: e.id, source: e.source, target: e.target }))
      .sort(byId),
  });
}
