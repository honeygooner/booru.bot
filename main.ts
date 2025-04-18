import { db } from "@/db.ts";

Deno.cron("test cron", "* * * * *", async () => {
  await db.runs.add(Date.now());
  const count = await db.runs.count();

  console.log("test cron", count);
});
