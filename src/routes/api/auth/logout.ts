import { createFileRoute } from "@tanstack/react-router";
import { deleteSession } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (match) {
          deleteSession(match[1]);
        }
        return new Response(null, {
          status: 204,
          headers: {
            "Set-Cookie": "patchnotes_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          },
        });
      },
    },
  },
});