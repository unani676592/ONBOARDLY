"use client";

import { useMemo } from "react";
import PalettePanel from "./PalettePanel";
import InspectorPanel from "./InspectorPanel";
import WorkflowCanvas from "./WorkflowCanvas";
import { WorkflowActionsContext } from "./workflow-context";
import type { WorkflowState } from "./useWorkflowState";

export default function WorkflowEditor({ wf }: { wf: WorkflowState }) {
  const actions = useMemo(
    () => ({ deleteNode: wf.deleteNode, insertNodeOnEdge: wf.insertNodeOnEdge }),
    [wf.deleteNode, wf.insertNodeOnEdge],
  );

  return (
    <WorkflowActionsContext.Provider value={actions}>
      <div className="flex min-h-0 flex-1 gap-4 lg:gap-5">
        {/* Left: palette */}
        <div className="hidden w-64 shrink-0 md:block">
          <PalettePanel />
        </div>

        {/* Centre: canvas */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <WorkflowCanvas
            nodes={wf.nodes}
            edges={wf.edges}
            onNodesChange={wf.onNodesChange}
            onEdgesChange={wf.onEdgesChange}
            onConnect={wf.onConnect}
            isValidConnection={wf.isValidConnection}
            onDropBlock={wf.onDropBlock}
            issues={wf.issues}
          />
        </div>

        {/* Right: inspector */}
        <div className="hidden w-72 shrink-0 lg:block">
          <InspectorPanel
            node={wf.selectedNode}
            onChange={wf.updateNodeData}
            onClose={wf.clearSelection}
          />
        </div>
      </div>
    </WorkflowActionsContext.Provider>
  );
}
