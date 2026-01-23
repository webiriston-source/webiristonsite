import fs from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";

function loadEnvFile(path) {
  const contents = fs.readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  loadEnvFile(envPath);
  if (process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL?.includes("unpooled")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
  }

  const { createApp } = await import("../server/app.ts");
  const app = await createApp();
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  let cookie = "";

  const request = async (path, payload) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(payload),
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      cookie = setCookie.split(";")[0];
    }

    const text = await res.text();
    return { res, text };
  };

  const loginResult = await request("/api/admin/login", {
    login: process.env.ADMIN_LOGIN,
    password: process.env.ADMIN_PASSWORD,
  });
  console.log("admin_login", loginResult.res.status);

  const sessionRes = await fetch(`${baseUrl}/api/admin/session`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const sessionJson = await sessionRes.json().catch(() => null);
  console.log("admin_session", sessionRes.status, sessionJson);

  const contactResult = await request("/api/contact", {
    name: "Local Test",
    email: "local-test@example.com",
    message: "Проверка контактной формы локально.",
  });
  console.log("contact", contactResult.res.status);

  const estimateResult = await request("/api/estimate", {
    projectType: "website",
    features: ["auth"],
    designComplexity: "basic",
    urgency: "standard",
    budget: "100000",
    contactName: "Local Test",
    contactEmail: "local-test@example.com",
    contactTelegram: "@localtest",
    description: "Проверка заявки на оценку локально.",
    estimation: {
      minPrice: 100000,
      maxPrice: 150000,
      minDays: 14,
      maxDays: 21,
    },
  });
  console.log("estimate", estimateResult.res.status);

  await new Promise((resolve) => server.close(resolve));
}

main().catch((error) => {
  console.error("smoke test failed");
  console.error(error);
  process.exit(1);
});
