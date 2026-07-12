import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Onboardly",
  description: "How Onboardly collects and uses your data. Draft.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: "What data we collect",
          body: "This is placeholder draft copy. Onboardly collects the information you and your clients provide through onboarding forms — such as names, email addresses, brand details, and uploaded files — along with basic usage data needed to run the service.",
        },
        {
          heading: "How we use it",
          body: "This is placeholder draft copy. We use collected data solely to deliver onboarding automations on your behalf: sending welcome emails, creating folders, syncing CRM records, and generating tasks. We do not sell your data.",
        },
        {
          heading: "Contact",
          body: "This is placeholder draft copy. Questions about privacy? Reach us at privacy@onboardly.com. This document is a draft and does not yet constitute a binding privacy policy.",
        },
      ]}
    />
  );
}
