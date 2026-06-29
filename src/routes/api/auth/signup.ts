import { createFileRoute } from "@tanstack/react-router";
import { query, run } from "~/lib/db";
import { hashPassword, createSession } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; password?: string; name?: string };
          const email = body.email?.trim().toLowerCase();
          const password = body.password;
          const name = body.name?.trim() || "";

          if (!email || !password || password.length < 6) {
            return Response.json(
              { error: "Email and password (min 6 chars) required" },
              { status: 400 }
            );
          }

          // Check if user exists
          const existing = query(
            `SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`
          );
          if (existing.length > 0) {
            return Response.json(
              { error: "Email already registered" },
              { status: 409 }
            );
          }

          const passwordHash = hashPassword(password);
          run(
            `INSERT INTO users (email, password_hash, name) VALUES ('${email.replace(/'/g, "''")}', '${passwordHash.replace(/'/g, "''")}', '${name.replace(/'/g, "''")}')`
          );

          const newUser = query(
            `SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`
          ) as { id: number }[];
          const sessionId = createSession(newUser[0].id);

          return Response.json(
            { success: true, sessionId },
            {
              status: 201,
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