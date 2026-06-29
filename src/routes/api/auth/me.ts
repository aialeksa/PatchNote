import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ user: null });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ user: null });
        }
        return Response.json({ user });
      },
    },
  },
});