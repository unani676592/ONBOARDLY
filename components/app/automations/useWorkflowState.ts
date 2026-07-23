"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type IsValidConnection,
} from "@xyflow/react";
import { supabase } from "@/lib/supabase";
import {
  computeIssues,
  initialEdges,
  initialNodes,
  makeNode,
  type Subtype,
  type WorkflowNode,
  type WorkflowNodeData,
} from "./workflow-data";
import {
  fingerprint,
  hydrateEdges,
  hydrateNodes,
  toPersistedEdges,
  toPersistedNodes,
  type WorkflowRow,
  type WorkflowStatus,
} from "./workflow-persistence";

const DEFAULT_NAME = "Invite Email Automation";
const DEFAULT_DESCRIPTION =
  "Automatically send an invite email when a client is invited.";

export type WorkflowState = ReturnType<typeof useWorkflowState>;

export function useWorkflowState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [name, setName] = useState(DEFAULT_NAME);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [status, setStatus] = useState<WorkflowStatus>("draft");

  // Fingerprint of the last-saved state (null = nothing persisted yet).
  const [savedPrint, setSavedPrint] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Latest state for handlers that must stay referentially stable.
  const stateRef = useRef({ nodes, edges });
  stateRef.current = { nodes, edges };
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load on mount -----------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("Your session expired — please log in again.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const row = data as WorkflowRow;
      setNodes(hydrateNodes(row.nodes));
      setEdges(hydrateEdges(row.edges));
      setName(row.name);
      setDescription(row.description);
      setStatus(row.status);
      setSavedPrint(
        fingerprint(row.nodes, row.edges, row.status, row.name, row.description),
      );
    } else {
      // First run: seed the starter pair as an UNSAVED starting point.
      setNodes(initialNodes);
      setEdges(initialEdges);
      setName(DEFAULT_NAME);
      setDescription(DEFAULT_DESCRIPTION);
      setStatus("draft");
      setSavedPrint(null); // → dirty, so Save is enabled
    }
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    load();
  }, [load]);

  // --- Dirty state -------------------------------------------------------
  const currentPrint = useMemo(
    () => fingerprint(nodes, edges, status, name, description),
    [nodes, edges, status, name, description],
  );
  const dirty = !loading && savedPrint !== currentPrint;

  // Warn before leaving with unsaved changes (reload / tab close / external
  // nav). In-app SPA navigation isn't covered — see report caveat.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // --- Save --------------------------------------------------------------
  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setJustSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setSaveError("Your session expired — please log in again.");
      return;
    }

    const { nodes: curNodes, edges: curEdges } = stateRef.current;
    const payload = {
      user_id: user.id,
      name,
      description,
      status,
      nodes: toPersistedNodes(curNodes),
      edges: toPersistedEdges(curEdges),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workflows")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Save failed — please try again.");
      return;
    }

    const row = data as WorkflowRow;
    setSavedPrint(
      fingerprint(row.nodes, row.edges, row.status, row.name, row.description),
    );
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 2500);
  }, [name, description, status]);

  // --- Canvas handlers ---------------------------------------------------
  const selectedNode = useMemo(
    () => nodes.find((n) => n.selected) ?? null,
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "plus" }, eds));
    },
    [setEdges],
  );

  const isValidConnection = useCallback<IsValidConnection>((conn) => {
    if (conn.source === conn.target) return false;
    const target = stateRef.current.nodes.find((n) => n.id === conn.target);
    return target?.data.kind !== "trigger";
  }, []);

  const onDropBlock = useCallback(
    (subtype: Subtype, position: { x: number; y: number }) => {
      setNodes((ns) => [...ns, makeNode(subtype, position)]);
    },
    [setNodes],
  );

  const updateNodeData = useCallback(
    (patch: Partial<WorkflowNodeData>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.selected ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
    },
    [setNodes],
  );

  const clearSelection = useCallback(() => {
    setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
  }, [setNodes]);

  const deleteNode = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setNodes((ns) => ns.filter((n) => n.id !== id));
    },
    [setEdges, setNodes],
  );

  const insertNodeOnEdge = useCallback(
    (edgeId: string, subtype: Subtype) => {
      const { nodes: cur, edges: curEdges } = stateRef.current;
      const edge = curEdges.find((e) => e.id === edgeId);
      if (!edge) return;
      const source = cur.find((n) => n.id === edge.source);
      const target = cur.find((n) => n.id === edge.target);
      if (!source || !target) return;

      const position = {
        x: source.position.x,
        y: (source.position.y + target.position.y) / 2,
      };
      const node = makeNode(subtype, position);

      setNodes((ns) => [...ns, node]);
      setEdges((eds) => [
        ...eds.filter((e) => e.id !== edgeId),
        { id: `${edge.source}->${node.id}`, source: edge.source, target: node.id, type: "plus" },
        { id: `${node.id}->${edge.target}`, source: node.id, target: edge.target, type: "plus" },
      ]);
    },
    [setNodes, setEdges],
  );

  const issues = useMemo(() => computeIssues(nodes, edges), [nodes, edges]);

  return {
    // meta
    name,
    description,
    status,
    setStatus,
    // lifecycle
    loading,
    loadError,
    reload: load,
    // canvas data + handlers
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    onDropBlock,
    updateNodeData,
    clearSelection,
    deleteNode,
    insertNodeOnEdge,
    selectedNode,
    issues,
    // save
    dirty,
    saving,
    saveError,
    justSaved,
    save,
  };
}
