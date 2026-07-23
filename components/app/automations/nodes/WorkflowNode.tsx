import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  ACCENTS,
  BLOCKS,
  type WorkflowNode as WorkflowNodeType,
} from "../workflow-data";
import { useWorkflowActions } from "../workflow-context";

const handleClass =
  "!h-2.5 !w-2.5 !border !border-slate-300 !bg-white hover:!border-indigo-500";

function WorkflowNode({ id, data, selected }: NodeProps<WorkflowNodeType>) {
  const def = BLOCKS[data.subtype];
  const accent = ACCENTS[def.accent];
  const Icon = def.icon;
  const { deleteNode } = useWorkflowActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the overflow menu on any outside interaction.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <div
      className={`w-[280px] rounded-2xl border bg-white p-4 shadow-sm transition-shadow ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : "border-slate-200 hover:shadow-md"
      }`}
    >
      {/* Triggers can't have an incoming edge → no target handle. */}
      {data.kind !== "trigger" && (
        <Handle type="target" position={Position.Top} className={handleClass} />
      )}

      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent.chip}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold ${accent.label}`}>
              {def.typeLabel}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                aria-label="Node options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="nodrag grid h-6 w-6 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="nodrag nopan absolute right-0 top-7 z-10 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      deleteNode(id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
            {data.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {data.description}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export default memo(WorkflowNode);
