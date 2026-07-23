import {
  Clock,
  Contact,
  FileText,
  Folder,
  FolderPlus,
  Mail,
  Split,
  SquareCheckBig,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Edge, Node } from "@xyflow/react";

// Colour accents shared by palette blocks and canvas nodes.
export type Accent = "emerald" | "indigo" | "amber" | "sky";

export const ACCENTS: Record<Accent, { chip: string; label: string }> = {
  emerald: { chip: "bg-emerald-50 text-emerald-600", label: "text-emerald-600" },
  indigo: { chip: "bg-indigo-50 text-indigo-600", label: "text-indigo-600" },
  amber: { chip: "bg-amber-50 text-amber-600", label: "text-amber-600" },
  sky: { chip: "bg-sky-50 text-sky-600", label: "text-sky-600" },
};

export type NodeKind = "trigger" | "action";

export type Subtype =
  | "client-invited"
  | "form-completed"
  | "files-uploaded"
  | "send-email"
  | "create-folder"
  | "create-task"
  | "add-crm-record"
  | "condition"
  | "delay";

// Settings for the one real action (send-email). UI-only this step; this is the
// nested object step 3 will persist.
export type SendEmailSettings = {
  template: string;
  includeMagicLink: boolean;
  senderName: string;
  replyTo: string;
};

// The only data stored per node — serializable, DB-ready for step 3. Icon /
// accent / labels are NOT stored here; they're derived from `subtype` via BLOCKS.
export type WorkflowNodeData = {
  kind: NodeKind;
  subtype: Subtype;
  title: string;
  description: string;
  settings?: SendEmailSettings;
};

export type WorkflowNode = Node<WorkflowNodeData, "workflow">;

// ---------------------------------------------------------------------------
// Block registry — single source of truth for the palette AND canvas nodes.
// ---------------------------------------------------------------------------
export type BlockGroup = "Triggers" | "Actions" | "Flow";

export type BlockDef = {
  subtype: Subtype;
  kind: NodeKind;
  group: BlockGroup;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  typeLabel: string;
  available: boolean;
  // Shown on hover for unavailable palette blocks — honest, not dead UI.
  unavailableReason?: string;
  // Read-only explanation shown in the inspector for trigger nodes.
  fires?: string;
};

export const BLOCKS: Record<Subtype, BlockDef> = {
  "client-invited": {
    subtype: "client-invited",
    kind: "trigger",
    group: "Triggers",
    label: "Client invited",
    description: "When a new client is invited",
    icon: UserPlus,
    accent: "emerald",
    typeLabel: "Trigger",
    available: true,
    fires: "Runs the moment you invite a new client from the Clients page.",
  },
  "form-completed": {
    subtype: "form-completed",
    kind: "trigger",
    group: "Triggers",
    label: "Form completed",
    description: "When a client completes their intake form",
    icon: FileText,
    accent: "emerald",
    typeLabel: "Trigger",
    available: true,
    fires: "Runs when a client submits their onboarding intake form.",
  },
  "files-uploaded": {
    subtype: "files-uploaded",
    kind: "trigger",
    group: "Triggers",
    label: "Files uploaded",
    description: "When a client uploads their files",
    icon: Folder,
    accent: "emerald",
    typeLabel: "Trigger",
    available: true,
    fires: "Runs when a client uploads files on their intake page.",
  },
  "send-email": {
    subtype: "send-email",
    kind: "action",
    group: "Actions",
    label: "Send email",
    description: "Send an email to the client",
    icon: Mail,
    accent: "indigo",
    typeLabel: "Action",
    available: true,
  },
  "create-folder": {
    subtype: "create-folder",
    kind: "action",
    group: "Actions",
    label: "Create folder",
    description: "Create a folder for the client",
    icon: FolderPlus,
    accent: "indigo",
    typeLabel: "Action",
    available: false,
    unavailableReason: "Needs a storage integration — coming soon.",
  },
  "create-task": {
    subtype: "create-task",
    kind: "action",
    group: "Actions",
    label: "Create task",
    description: "Create a task for your team",
    icon: SquareCheckBig,
    accent: "indigo",
    typeLabel: "Action",
    available: false,
    unavailableReason: "Tasks are coming soon.",
  },
  "add-crm-record": {
    subtype: "add-crm-record",
    kind: "action",
    group: "Actions",
    label: "Add CRM record",
    description: "Add the client to your CRM",
    icon: Contact,
    accent: "indigo",
    typeLabel: "Action",
    available: false,
    unavailableReason: "Needs a CRM integration — coming soon.",
  },
  condition: {
    subtype: "condition",
    kind: "action",
    group: "Flow",
    label: "Condition",
    description: "Branch based on a rule",
    icon: Split,
    accent: "amber",
    typeLabel: "Flow",
    available: false,
    unavailableReason: "Branching is coming soon.",
  },
  delay: {
    subtype: "delay",
    kind: "action",
    group: "Flow",
    label: "Delay",
    description: "Wait before the next step",
    icon: Clock,
    accent: "sky",
    typeLabel: "Flow",
    available: false,
    unavailableReason: "Delays are coming soon.",
  },
};

export const BLOCK_LIST: BlockDef[] = Object.values(BLOCKS);
export const PALETTE_GROUPS: BlockGroup[] = ["Triggers", "Actions", "Flow"];

// Email template options — honestly, one for now.
export const EMAIL_TEMPLATES = [{ id: "default-invite", label: "Default invite email" }];

export const DEFAULT_EMAIL_SETTINGS: SendEmailSettings = {
  template: "default-invite",
  includeMagicLink: true,
  senderName: "",
  replyTo: "",
};

// Unique-enough ids without extra deps; only ever called client-side.
let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

// Create a fresh canvas node from a palette block.
export function makeNode(
  subtype: Subtype,
  position: { x: number; y: number },
): WorkflowNode {
  const def = BLOCKS[subtype];
  const data: WorkflowNodeData = {
    kind: def.kind,
    subtype,
    title: def.label,
    description: def.description,
  };
  if (subtype === "send-email") {
    data.settings = { ...DEFAULT_EMAIL_SETTINGS };
  }
  return { id: uid(subtype), type: "workflow", position, data };
}

// The MIME key used to carry a block subtype through an HTML5 drag.
export const DND_MIME = "application/x-onboardly-block";

// ---------------------------------------------------------------------------
// Hardcoded starting workflow: Client invited → Send invite email
// ---------------------------------------------------------------------------
export const initialNodes: WorkflowNode[] = [
  {
    id: "trigger-client-invited",
    type: "workflow",
    position: { x: 0, y: 0 },
    data: {
      kind: "trigger",
      subtype: "client-invited",
      title: "Client invited",
      description: "When a new client is invited",
    },
  },
  {
    id: "action-send-invite",
    type: "workflow",
    position: { x: 0, y: 200 },
    data: {
      kind: "action",
      subtype: "send-email",
      title: "Send invite email",
      description: "Send the invite email with magic link",
      settings: { ...DEFAULT_EMAIL_SETTINGS },
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "trigger-to-action",
    source: "trigger-client-invited",
    target: "action-send-invite",
    type: "plus",
  },
];

// ---------------------------------------------------------------------------
// Validation — non-blocking warnings about an incomplete workflow.
// ---------------------------------------------------------------------------
export function computeIssues(nodes: WorkflowNode[], edges: Edge[]): string[] {
  if (nodes.length === 0) return [];
  const issues: string[] = [];

  const triggerIds = nodes.filter((n) => n.data.kind === "trigger").map((n) => n.id);

  // Reachability from any trigger, following edge direction.
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.source) ?? [];
    list.push(e.target);
    adjacency.set(e.source, list);
  }
  const reachable = new Set<string>(triggerIds);
  const queue = [...triggerIds];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of adjacency.get(id) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  if (triggerIds.length === 0) {
    issues.push("This workflow has no trigger to start it.");
  }

  for (const n of nodes) {
    const connected = edges.some((e) => e.source === n.id || e.target === n.id);
    if (!connected && nodes.length > 1) {
      issues.push(`“${n.data.title}” isn’t connected to anything.`);
    } else if (n.data.kind === "action" && !reachable.has(n.id)) {
      issues.push(`“${n.data.title}” has no trigger upstream.`);
    }
  }

  return issues;
}
