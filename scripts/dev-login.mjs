// Local dev helper: email/rate-limit ke bina instant login link.
// Usage: node scripts/dev-login.mjs tumhara@email.com
// Secret key .env.local se padhi jaati hai — print/serve kabhi nahi hoti.
import { readFileSync } from "node:fs";

function readEnv(path) {
  const result = {};
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  } catch {
    // file missing
  }
  return result;
}

const env = { ...readEnv(".env.local"), ...readEnv(".env") };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error("❌ .env.local mein NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY nahi mile");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/dev-login.mjs <email>");
  process.exit(1);
}

const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "magiclink", email }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`❌ generate_link fail (${response.status}): ${body.slice(0, 200)}`);
  console.error("   Email wahi hona chahiye jisse account bana tha.");
  process.exit(1);
}

const data = await response.json();
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const link = `${appUrl}/auth/confirm?token_hash=${data.hashed_token}&type=magiclink`;

console.log("");
console.log("👉 Ye link browser mein kholo (ek hi baar chalega, ~1 ghanta valid):");
console.log("");
console.log(link);
console.log("");
console.log("(Login ke baad editor khulega — AI + Pixabay ab kaam karenge.)");
