import { time } from "@/util/helper.ts";
import indexing from "./scripts/indexing.ts";

const nextMinute = new Date().getMinutes() + 1;

Deno.cron(indexing.name, `${nextMinute} * * * *`, time(indexing));
