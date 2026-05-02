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

function getHomeDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return home;
}

function getInstallDirs(): string[] {
  const home = getHomeDir();
  const defaultRoot = join(home, ".config", "opencode", "skills");
  const candidateRoots = [
    defaultRoot,
    join(home, ".claude", "skills"),
    join(home, ".agents", "skills"),
  ];

  const roots = candidateRoots.filter((root) => root === defaultRoot || existsSync(root));
  return [...new Set(roots)].map((root) => join(root, "occtl"));
}

export function installSkillCommand(): Command {
  return new Command("install-skill")
    .description("Install the occtl skill to found user-level skill directories")
    .option("-f, --force", "Overwrite existing skill if present")
    .action(async (opts) => {
      const src = getSkillPath();
      if (!existsSync(src)) {
        console.error(`SKILL.md not found at ${src}`);
        process.exit(1);
      }

      const destDirs = getInstallDirs();
      const existing = destDirs.filter((destDir) => existsSync(join(destDir, "SKILL.md")));

      if (existing.length > 0 && !opts.force) {
        console.error("Skill already installed at:");
        for (const destDir of existing) {
          console.error(`  ${destDir}`);
        }
        console.error("Use --force to overwrite.");
        process.exit(1);
      }

      for (const destDir of destDirs) {
        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, join(destDir, "SKILL.md"));
      }

      console.log("Installed occtl skill to:");
      for (const destDir of destDirs) {
        console.log(`  ${destDir}`);
      }
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
