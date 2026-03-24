import type { VercelRequest, VercelResponse } from "../shared/vercel-types";
import { isDatabaseConfigured } from "../shared/db";
import { users } from "../shared/schema";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const payload = {
    ok: true,
    timestamp: Date.now(),
    dbConfigured: isDatabaseConfigured(),
    usersTableName: (users as any)?._?.name || "unknown",
  };

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

