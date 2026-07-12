import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — Onboardly",
  description: "The terms governing your use of Onboardly. Draft.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      sections={[
        {
          heading: "Using the service",
          body: "This is placeholder draft copy. By accessing Onboardly you agree to use it lawfully and to be responsible for the accuracy of the client information you collect and process through the platform.",
        },
        {
          heading: "Accounts & payment",
          body: "This is placeholder draft copy. Plans are offered as one-time payments with no recurring subscription. Feature availability depends on the plan you select at purchase.",
        },
        {
          heading: "Contact",
          body: "This is placeholder draft copy. Questions about these terms? Reach us at legal@onboardly.com. This document is a draft and does not yet constitute a binding agreement.",
        },
      ]}
    />
  );
}
