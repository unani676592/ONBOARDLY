import { Workflow } from "lucide-react";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata = {
  title: "Automations — Onboardly",
};

export default function AutomationsPage() {
  return (
    <ComingSoon
      icon={Workflow}
      title="Automations"
      description="The rules that run automatically after a client submits their onboarding form."
    />
  );
}
