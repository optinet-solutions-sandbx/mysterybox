import { revalidateTag } from "next/cache";
import { staffFromRequest } from "@/backend/server-auth";

/** POST /api/catalog/revalidate: staff changed items, boxes or odds; the site re-reads the catalog now. */
export async function POST(req: Request) {
  const caller = await staffFromRequest(req, ["admin", "super_admin"]);
  if (!caller) return Response.json({ error: "forbidden" }, { status: 403 });
  revalidateTag("catalog", { expire: 0 });
  return Response.json({ ok: true });
}
