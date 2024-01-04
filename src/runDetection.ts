import bcd, { CompatStatement, Identifier } from "@mdn/browser-compat-data";
import { Location, transform } from "lightningcss";
import { formatDescription } from "./util/formatDescription.js";

export type DescribedCompatStatement = CompatStatement & {
  id: string;
};

const recurseBCD = (
  path: string,
  data: Identifier = bcd.css
): CompatStatement | undefined => {
  const [key, ...rest] = path.split(".");
  if (key) return recurseBCD(rest.join("."), data[key]);

  return data.__compat;
};

const getBCD = (path: string): DescribedCompatStatement | undefined => {
  const statement = recurseBCD(path);
  if (!statement) return undefined;

  return {
    ...statement,
    id: path,
    description: formatDescription(statement.description),
  };
};

export const runDetection = (
  code: Uint8Array | string,
  check: (
    location: Location,
    compatStatement: DescribedCompatStatement | undefined
  ) => void
) =>
  transform({
    errorRecovery: true,
    filename: "fast-css-compat.css",
    code: typeof code === "string" ? Buffer.from(code) : code,
    visitor: {
      Rule(rule) {
        if (rule.type === "container") {
          check(rule.value.loc, getBCD("atRules.container"));
          check(
            rule.value.loc,
            getBCD("at-rules.container.style_queries_for_custom_properties")
          );
        }
      },
    },
  });
