import { Zap } from "lucide-react";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata = {
  title: "Integrations — Onboardly",
};

export default function IntegrationsPage() {
  return (
    <ComingSoon
      icon={Zap}
      title="Integrations"
      description="Connect Google Drive, Gmail, and your CRM so onboarding data flows straight into the tools you already use."
    />
  );
}
