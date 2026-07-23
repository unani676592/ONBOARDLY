"use client";

import type { DragEvent } from "react";
import {
  ACCENTS,
  BLOCK_LIST,
  DND_MIME,
  PALETTE_GROUPS,
  type Subtype,
} from "./workflow-data";

// Left panel: grouped building blocks. Available blocks drag onto the canvas;
// unavailable ones stay visibly disabled with an on-hover reason.
export default function PalettePanel() {
  function onDragStart(e: DragEvent<HTMLDivElement>, subtype: Subtype) {
    e.dataTransfer.setData(DND_MIME, subtype);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex-1 space-y-5">
        {PALETTE_GROUPS.map((group) => (
          <div key={group}>
            <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group}
            </h3>
            <ul className="mt-2 space-y-1">
              {BLOCK_LIST.filter((b) => b.group === group).map((block) => {
                const accent = ACCENTS[block.accent];
                const Icon = block.icon;

                if (!block.available) {
                  return (
                    <li key={block.subtype}>
                      <div
                        title={block.unavailableReason}
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-2 py-2 opacity-55"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-slate-700">
                          {block.label}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Soon
                        </span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={block.subtype}>
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, block.subtype)}
                      title={`Drag “${block.label}” onto the canvas`}
                      className="flex cursor-grab items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 active:cursor-grabbing"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${accent.chip}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-slate-700">
                        {block.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 px-2 pb-1 text-xs leading-relaxed text-slate-400">
        Drag a block onto the canvas to add a step.
      </p>
    </div>
  );
}
