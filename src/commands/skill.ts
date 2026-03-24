import { Command } from "commander";
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getSkillPath(): string {
  // SKILL.md lives at the package root, two levels up from dist/commands/
  return resolve(__dirname, "..", "..", "SKILL.md");
}

function getInstallDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return join(home, ".config", "opencode", "skills", "occtl");
}

export function installSkillCommand(): Command {
  return new Command("install-skill")
    .description("Install the occtl skill as an OpenCode user-level skill")
    .option("-f, --force", "Overwrite existing skill if present")
    .action(async (opts) => {
      const src = getSkillPath();
      if (!existsSync(src)) {
        console.error(`SKILL.md not found at ${src}`);
        process.exit(1);
      }

      const destDir = getInstallDir();
      const dest = join(destDir, "SKILL.md");

      if (existsSync(dest) && !opts.force) {
        console.error(`Skill already installed at ${destDir}`);
        console.error("Use --force to overwrite.");
        process.exit(1);
      }

      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);

      console.log(`Installed occtl skill to ${destDir}`);
      console.log("Restart OpenCode to pick up the new skill.");
    });
}

export function viewSkillCommand(): Command {
  return new Command("view-skill")
    .description("Display the occtl SKILL.md contents")
    .option("--path", "Only print the path to SKILL.md")
    .action(async (opts) => {
      const src = getSkillPath();
      if (!existsSync(src)) {
        console.error(`SKILL.md not found at ${src}`);
        process.exit(1);
      }

      if (opts.path) {
        console.log(src);
        return;
      }

      const content = readFileSync(src, "utf-8");
      console.log(content);
    });
}
