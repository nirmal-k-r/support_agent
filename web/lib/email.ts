import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.SUPPORT_FROM_EMAIL || "My Support <onboarding@resend.dev>";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTicketEmail({ to, subject, text }: EmailInput) {
  if (!RESEND_API_KEY) {
    // No provider configured: log instead of failing the approval flow.
    console.log(
      `[email:skipped] to=${to} subject="${subject}"\n---\n${text}\n---`
    );
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    text,
  });

  if (error) {
    console.error("[email:failed]", error);
    return { sent: false, reason: error.message };
  }
  return { sent: true, id: data?.id };
}
