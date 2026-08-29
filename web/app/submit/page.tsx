import { getSessionUser } from "@/lib/auth";
import { SubmitForm } from "@/components/SubmitForm";

export default async function SubmitPage() {
  const user = await getSessionUser();
  return (
    <div
      className="card"
      style={{ maxWidth: 640, margin: "0 auto", marginTop: 24 }}
    >
      <h1>Submit a ticket</h1>
      <p className="lead">
        {user
          ? `Logged in as ${user.email}. Describe your issue below.`
          : "Describe your issue. We'll need a contact email to follow up."}
      </p>
      <SubmitForm isLoggedIn={!!user} userEmail={user?.email} />
    </div>
  );
}
