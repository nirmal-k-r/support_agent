"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubmitForm({
  isLoggedIn,
  userEmail,
}: {
  isLoggedIn: boolean;
  userEmail?: string;
}) {
  const router = useRouter();
  const [customerIssue, setCustomerIssue] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_issue: customerIssue,
        submitter_email: isLoggedIn ? undefined : email,
      }),
    });
    if (res.ok) {
      router.push(isLoggedIn ? "/dashboard" : "/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not submit ticket.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {!isLoggedIn && (
        <>
          <label htmlFor="email">Contact email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </>
      )}
      <label htmlFor="issue">Describe your issue</label>
      <textarea
        id="issue"
        placeholder="e.g. I cannot connect to the Wi-Fi since this morning..."
        value={customerIssue}
        onChange={(e) => setCustomerIssue(e.target.value)}
        required
        minLength={3}
      />
      <div style={{ marginTop: 18 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit ticket"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
