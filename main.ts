import { time } from "@/util.ts";
import indexProfiles from "./scripts/index-profiles.ts";

const nextMinute = new Date().getMinutes() + 1;

Deno.cron(indexProfiles.name, `${nextMinute} * * * *`, time(indexProfiles));
