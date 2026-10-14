#!/usr/bin/env node
// Daily reporting to the team's PMS (CLAUDE.md "Daily PMS report"). Reads PMS_BASE_URL,
// PMS_PROJECT_ID, PMS_USER_ID and PMS_API_TOKEN from the environment or web/.env.local.
// Never commit the token.
//
//   node scripts/pms.mjs list                       the project's tasks, by column
//   node scripts/pms.mjs add "<title>" [--column todo|backlog|progress|review|blocked|done]
//        [--desc "..."] [--assignee <email, name or id>] [--priority LOW|MEDIUM|HIGH|URGENT] [--due YYYY-MM-DD]
//                                                   a new task (default: To Do, assigned to PMS_USER_ID);
//                                                   --column done files it as done today
//   node scripts/pms.mjs done <taskId> [--desc "..."]  move a task to Done (dated now), optionally rewriting its description
//   node scripts/pms.mjs report [YYYY-MM-DD]        PMS_USER_ID's daily report (default: today, Manila time)

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const envFile = join(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^(PMS_[A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const { PMS_BASE_URL: base, PMS_PROJECT_ID: project, PMS_USER_ID: me, PMS_API_TOKEN: token } = process.env;
if (!base || !project || !me || !token) {
  console.error("Set PMS_BASE_URL, PMS_PROJECT_ID, PMS_USER_ID and PMS_API_TOKEN (web/.env.local).");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return data;
}

const COLUMN_NAMES = { backlog: "Backlog", todo: "To Do", progress: "In Progress", review: "Review/QA", blocked: "Blocked", done: "Done" };
const manilaToday = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

async function columns() {
  const list = await api("GET", `/api/projects/${project}/columns`);
  return Object.fromEntries(Object.entries(COLUMN_NAMES).map(([key, name]) => [key, list.find((c) => c.name === name)?.id]));
}

async function assigneeId(who) {
  if (!who) return me;
  const people = await api("GET", `/api/projects/${project}/assignable`);
  const w = who.toLowerCase();
  const hit = people.find(({ user }) => user.id === who || user.email?.toLowerCase() === w || user.name?.toLowerCase() === w);
  if (!hit) throw new Error(`No assignable user matches "${who}". Run "list" to see the team.`);
  return hit.user.id;
}

function flags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) out[args[i].slice(2)] = args[++i];
    else out._.push(args[i]);
  }
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
const f = flags(rest);

if (cmd === "list") {
  const cols = await api("GET", `/api/projects/${project}/columns`);
  const tasks = await api("GET", `/api/projects/${project}/tasks`);
  for (const c of cols) {
    const mine = tasks.filter((t) => t.columnId === c.id);
    console.log(`\n${c.name} (${mine.length})`);
    for (const t of mine) {
      const who = t.assignees.map((a) => (a.user ?? a).name).join(", ") || "unassigned";
      console.log(`  ${t.id}  ${t.title}  [${who}]${t.completedAt ? `  done ${t.completedAt.slice(0, 10)}` : ""}`);
    }
  }
} else if (cmd === "add") {
  const title = f._.join(" ");
  if (!title) throw new Error('Usage: add "<title>" [--column todo] [--desc "..."] [--assignee <email>]');
  const cols = await columns();
  const target = f.column ?? "todo";
  if (!cols[target]) throw new Error(`Unknown column "${target}" (${Object.keys(COLUMN_NAMES).join(", ")}).`);
  const task = await api("POST", `/api/projects/${project}/tasks`, {
    title,
    description: f.desc,
    columnId: target === "done" ? cols.progress : cols[target],
    priority: f.priority ?? "MEDIUM",
    dueDate: f.due ?? null,
    assigneeIds: [await assigneeId(f.assignee)],
  });
  if (target === "done") await api("PATCH", `/api/tasks/${task.id}/move`, { columnId: cols.done });
  console.log(`${target === "done" ? "Done" : COLUMN_NAMES[target]}: ${task.id}  ${title}`);
} else if (cmd === "done") {
  const cols = await columns();
  if (f.desc) await api("PATCH", `/api/tasks/${f._[0]}`, { description: f.desc });
  await api("PATCH", `/api/tasks/${f._[0]}/move`, { columnId: cols.done });
  console.log(`Done: ${f._[0]}`);
} else if (cmd === "report") {
  const date = f._[0] ?? manilaToday();
  const r = await api("GET", `/api/users/${me}/daily-report?date=${date}`);
  const line = (t) => `  - ${t.title} (${t.projectName})`;
  console.log(`Daily report for ${r.submitterName}, ${r.shiftDate}${r.submitted ? " (submitted)" : ""}`);
  console.log(`Completed (${r.data.completed.length}):\n${r.data.completed.map(line).join("\n")}`);
  const ours = r.data.inProgress.filter((t) => t.projectId === project);
  console.log(`Open in this project (${ours.length}):\n${ours.map(line).join("\n")}`);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).join("\n"));
}
