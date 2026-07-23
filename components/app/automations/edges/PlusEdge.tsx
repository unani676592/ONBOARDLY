import { useEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { BLOCK_LIST } from "../workflow-data";
import { useWorkflowActions } from "../workflow-context";

// Blocks that can be inserted mid-flow: available actions only (a trigger can't
// sit between two nodes since it takes no incoming edge).
const INSERTABLE = BLOCK_LIST.filter((b) => b.available && b.kind === "action");

export default function PlusEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const { insertNodeOnEdge } = useWorkflowActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "#cbd5e1", strokeWidth: 1.5 }}
      />
      <EdgeLabelRenderer>
        <div
          ref={ref}
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Insert a step here"
            aria-haspopup="menu"
            aria-expanded={open}
            className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute left-1/2 top-8 z-10 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10"
            >
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Insert step
              </p>
              {INSERTABLE.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.subtype}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      insertNodeOnEdge(id, block.subtype);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-50 text-indigo-600">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {block.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
