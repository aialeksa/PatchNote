import { execSync } from "node:child_process";

export function query(sql: string): any[] {
  const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
  });
  return JSON.parse(result);
}

export function run(sql: string): void {
  execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf8" });
}