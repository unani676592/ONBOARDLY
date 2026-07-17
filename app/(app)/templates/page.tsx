import { FileText } from "lucide-react";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata = {
  title: "Templates — Onboardly",
};

export default function TemplatesPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Templates"
      description="Reusable welcome emails and intake forms you set up once and send to every new client."
    />
  );
}
