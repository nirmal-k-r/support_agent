import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  createStaffAction,
  changeRoleAction,
} from "@/lib/actions";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
  }>("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC");

  return (
    <div>
      <h1>Admin</h1>
      <p className="lead">Manage staff accounts and roles.</p>

      <div className="card">
        <h2>Create staff account</h2>
        <form action={createStaffAction}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" />
          <label htmlFor="password">Temporary password</label>
          <input id="password" name="password" type="text" minLength={8} required />
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="officer">
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
          <div style={{ marginTop: 16 }}>
            <button className="btn" type="submit">
              Create account
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name || "—"}</td>
                <td>{u.role}</td>
                <td>
                  {u.id !== user.id && (
                    <form
                      action={changeRoleAction}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role}>
                        <option value="user">user</option>
                        <option value="officer">officer</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="btn btn-secondary" type="submit">
                        Set
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
