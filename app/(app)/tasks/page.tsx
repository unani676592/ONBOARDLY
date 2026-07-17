import { SquareCheckBig } from "lucide-react";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata = {
  title: "Tasks — Onboardly",
};

export default function TasksPage() {
  return (
    <ComingSoon
      icon={SquareCheckBig}
      title="Tasks"
      description="Auto-created to-dos for your team, generated for each client as their onboarding progresses."
    />
  );
}
