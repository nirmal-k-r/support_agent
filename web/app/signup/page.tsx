"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (res.ok) {
      router.push("/submit");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Sign up failed.");
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h1>Create account</h1>
      <p className="lead">Register to track the tickets you submit.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="name">Name (optional)</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Sign up"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="lead" style={{ marginTop: 16 }}>
        Already registered? <Link href="/login" className="link">Log in</Link>
      </p>
    </div>
  );
}
