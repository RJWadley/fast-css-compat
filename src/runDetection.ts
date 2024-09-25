import bcd, { CompatStatement, Identifier } from "@mdn/browser-compat-data";
import { Location, transform } from "lightningcss";
import { formatDescription } from "./util/formatDescription.js";
import { recurseNode } from "./util/recurseNode.js";

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
        if (rule.type === "ignored" || rule.type === "custom") return;
        check(rule.value.loc, getBCD(`at-rules.${rule.type}`));

        if (rule.type === "container") {
          if (
            rule.value.condition.type === "style" ||
            recurseNode(rule.value.condition).some(
              (child) => child.type === "style"
            )
          ) {
            check(
              rule.value.loc,
              getBCD("at-rules.container.style_queries_for_custom_properties")
            );
          }
        }
      },
    },
  });
