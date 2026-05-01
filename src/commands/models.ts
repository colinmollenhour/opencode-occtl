import { Command } from "commander";
import { ensureServer, getClientV2 } from "../client.js";
import { formatJSON } from "../format.js";

interface Model {
  id: string;
  name: string;
  status: "alpha" | "beta" | "deprecated" | "active";
  limit: { context: number; output: number };
  variants?: { [key: string]: { [key: string]: unknown } };
}

interface Provider {
  id: string;
  name: string;
  source?: string;
  key?: string;
  env?: string[];
  models: { [id: string]: Model };
}

export function modelsCommand(): Command {
  return new Command("models")
    .description(
      "List providers, models, and variants from /config/providers (uses v2 SDK)"
    )
    .argument(
      "[selector]",
      "Filter: <provider> for that provider's models, or <provider>/<model> for detail view"
    )
    .option("-j, --json", "Output as JSON")
    .option(
      "--enabled",
      "Only show providers that have credentials present (key set on the server)"
    )
    .action(async (selector: string | undefined, opts) => {
      // ensureServer uses v1 just for the health check; the actual call is v2.
      await ensureServer();
      const clientV2 = getClientV2();

      const result = await clientV2.config.providers();
      if (!result.data) {
        console.error("Failed to load providers.");
        process.exit(1);
      }

      let providers = (result.data.providers ?? []) as Provider[];

      if (opts.enabled) {
        providers = providers.filter((p) => !!p.key);
      }

      let providerFilter: string | undefined;
      let modelFilter: string | undefined;
      if (selector) {
        const slash = selector.indexOf("/");
        if (slash >= 0) {
          providerFilter = selector.slice(0, slash);
          modelFilter = selector.slice(slash + 1);
        } else {
          providerFilter = selector;
        }
      }

      const filtered = providerFilter
        ? providers.filter((p) => p.id === providerFilter)
        : providers;

      if (providerFilter && filtered.length === 0) {
        console.error(`Provider '${providerFilter}' not found.`);
        process.exit(1);
      }

      if (modelFilter) {
        const provider = filtered[0]!;
        const model = provider.models[modelFilter];
        if (!model) {
          console.error(
            `Model '${modelFilter}' not found under provider '${provider.id}'.`
          );
          process.exit(1);
        }
        if (opts.json) {
          console.log(formatJSON(model));
          return;
        }
        printModelDetail(provider.id, model);
        return;
      }

      if (opts.json) {
        if (providerFilter) {
          console.log(formatJSON(filtered[0]));
        } else {
          console.log(formatJSON({ providers: filtered, default: result.data.default }));
        }
        return;
      }

      for (const provider of filtered) {
        const models = Object.values(provider.models);
        if (models.length === 0) continue;
        console.log(`${provider.id} (${provider.name})`);
        for (const model of models) {
          const variantNames = model.variants ? Object.keys(model.variants) : [];
          const variantStr =
            variantNames.length > 0 ? `  variants: ${variantNames.join(", ")}` : "";
          const statusStr = model.status === "active" ? "" : ` [${model.status}]`;
          console.log(`  ${model.id}${statusStr}${variantStr}`);
        }
        console.log();
      }
    });
}

function printModelDetail(providerId: string, model: Model): void {
  console.log(`${providerId}/${model.id}`);
  console.log(`  Name:    ${model.name}`);
  console.log(`  Status:  ${model.status}`);
  console.log(`  Context: ${model.limit.context}`);
  console.log(`  Output:  ${model.limit.output}`);
  if (model.variants) {
    const names = Object.keys(model.variants);
    if (names.length > 0) {
      console.log(`  Variants:`);
      for (const name of names) {
        console.log(`    - ${name}`);
      }
    }
  }
}
