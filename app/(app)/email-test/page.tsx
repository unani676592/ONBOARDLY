import { getAllClients } from "@/lib/clientQueries";
import EmailTester from "@/components/app/EmailTester";

// Internal, temporary testing tool for step-4A email delivery. Not linked from
// the sidebar — reachable only by visiting /email-test directly. Sends a REAL
// invite email via the /api/clients/[clientId]/send-invite route.
export const metadata = {
  title: "Email tester — Onboardly",
};

export default async function EmailTestPage() {
  const clients = await getAllClients();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h1 className="text-base font-bold tracking-tight text-slate-900">
          Internal email tester
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">
          Sends a <strong>real</strong> invite email. With Resend&rsquo;s test
          sender it only delivers to your own Resend account email — so send to a
          client whose email is that address. This page is a temporary testing
          tool and isn&rsquo;t part of the product.
        </p>
      </div>

      <div className="mt-5">
        <EmailTester
          clients={clients.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
        />
      </div>
    </div>
  );
}
