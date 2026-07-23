"use client";

import { useCallback, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type Connection,
} from "@xyflow/react";
import { AlertTriangle, Maximize, Minus, Plus } from "lucide-react";
import WorkflowNode from "./nodes/WorkflowNode";
import PlusEdge from "./edges/PlusEdge";
import {
  BLOCKS,
  DND_MIME,
  type Subtype,
  type WorkflowNode as WorkflowNodeType,
} from "./workflow-data";

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = { plus: PlusEdge };

type Props = {
  nodes: WorkflowNodeType[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<WorkflowNodeType>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: IsValidConnection;
  onDropBlock: (subtype: Subtype, position: { x: number; y: number }) => void;
  issues: string[];
};

// Zoom controls, bottom-left: fit-to-view, minus, live percentage, plus.
function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  const btn =
    "grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <Panel position="bottom-left">
      <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => fitView({ padding: 0.3, duration: 200 })}
          aria-label="Fit to view"
          title="Fit to view"
          className={btn}
        >
          <Maximize className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomOut({ duration: 150 })}
          aria-label="Zoom out"
          className={btn}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-xs font-semibold tabular-nums text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomIn({ duration: 150 })}
          aria-label="Zoom in"
          className={btn}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </Panel>
  );
}

// Non-blocking validation banner, top-left of the canvas.
function ValidationBanner({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <Panel position="top-left">
      <div className="max-w-xs rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold">
            {issues.length === 1 ? "1 issue to fix" : `${issues.length} issues to fix`}
          </p>
        </div>
        <ul className="mt-1.5 space-y-1 pl-6">
          {issues.map((issue, i) => (
            <li
              key={i}
              className="list-disc text-[11px] leading-relaxed text-amber-700 marker:text-amber-400"
            >
              {issue}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export default function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onDropBlock,
  issues,
}: Props) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const subtype = e.dataTransfer.getData(DND_MIME) as Subtype;
      if (!subtype || !BLOCKS[subtype]?.available) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropBlock(subtype, position);
    },
    [screenToFlowPosition, onDropBlock],
  );

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.4}
        maxZoom={2}
        nodesConnectable
        elementsSelectable
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#dbe0ea" />
        <ValidationBanner issues={issues} />
        <ZoomControls />
      </ReactFlow>
    </div>
  );
}
