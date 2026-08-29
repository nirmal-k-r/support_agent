import Link from "next/link";
import { logout } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";

export function Nav({
  user,
  isStaff,
}: {
  user: SessionUser | null;
  isStaff: boolean;
}) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          My Support
        </Link>
        <nav className="nav-links">
          <Link href="/submit">Submit ticket</Link>
          {isStaff && <Link href="/dashboard">Dashboard</Link>}
          {user?.role === "admin" && <Link href="/admin">Admin</Link>}
          {user ? (
            <>
              <span className="muted">{user.email}</span>
              <form action={logout}>
                <button type="submit" className="link-btn">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
