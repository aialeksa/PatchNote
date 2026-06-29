import { createFileRoute } from "@tanstack/react-router";
import { query } from "~/lib/db";
import { verifyPassword, createSession } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; password?: string };
          const email = body.email?.trim().toLowerCase();
          const password = body.password;

          if (!email || !password) {
            return Response.json(
              { error: "Email and password required" },
              { status: 400 }
            );
          }

          const users = query(
            `SELECT id, email, password_hash, name FROM users WHERE email = '${email.replace(/'/g, "''")}'`
          ) as { id: number; email: string; password_hash: string; name: string }[];

          if (users.length === 0 || !verifyPassword(password, users[0].password_hash)) {
            return Response.json(
              { error: "Invalid email or password" },
              { status: 401 }
            );
          }

          const sessionId = createSession(users[0].id);

          return Response.json(
            { user: { id: users[0].id, email: users[0].email, name: users[0].name } },
            {
              headers: {
                "Set-Cookie": `patchnotes_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
              },
            }
          );
        } catch {
          return Response.json(
            { error: "Something went wrong" },
            { status: 500 }
          );
        }
      },
    },
  },
});