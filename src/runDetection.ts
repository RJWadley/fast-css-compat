import bcd, { CompatStatement } from "@mdn/browser-compat-data";
import { Location, transform } from "lightningcss";

export const runDetection = (
  code: Uint8Array | string,
  check: (
    location: Location,
    compatStatement: CompatStatement | undefined
  ) => void
) =>
  transform({
    errorRecovery: true,
    filename: "fast-css-compat.css",
    code: typeof code === "string" ? Buffer.from(code) : code,
    visitor: {
      Rule(rule) {
        if (rule.type === "container") {
          check(rule.value.loc, bcd?.css?.["at-rules"]?.container?.__compat);
          console.log(rule.value);
        }
      },
    },
  });
