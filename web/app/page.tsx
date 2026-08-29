import Link from "next/link";
import { getSessionUser, isStaff } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  const staff = isStaff(user?.role);

  return (
    <div>
      <div className="card">
        <h1>My Support</h1>
        <p className="lead">
          Submit a support ticket and our team will get back to you. Support
          officers can process and approve tickets from the dashboard.
        </p>
        <div className="row-actions">
          <Link href="/submit" className="btn">
            Submit a ticket
          </Link>
          {staff ? (
            <Link href="/dashboard" className="btn btn-secondary">
              Go to dashboard
            </Link>
          ) : user ? null : (
            <Link href="/login" className="btn btn-secondary">
              Staff log in
            </Link>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Anyone can submit</h2>
          <p className="lead">
            Logged-in users and anonymous visitors can raise a ticket. Anonymous
            submissions just need a contact email.
          </p>
        </div>
        <div className="card">
          <h2>AI-assisted responses</h2>
          <p className="lead">
            Officers process tickets by calling our support agent, which proposes
            a response based on similar past cases.
          </p>
        </div>
        <div className="card">
          <h2>Human approval</h2>
          <p className="lead">
            Every agent response is reviewed and approved by a support officer or
            admin before it is finalised.
          </p>
        </div>
      </div>
    </div>
  );
}
