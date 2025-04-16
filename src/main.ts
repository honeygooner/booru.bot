import postgres from "postgres";

try {
  const sql = postgres();
  console.log(await sql`select 1`);
} catch (error) {
  console.error("db connection failed", error);
}

Deno.cron("test cron", "* * * * *", () => {
  console.count("test cron");
});
