import bcd, { CompatStatement } from "@mdn/browser-compat-data";
import { Location, transform } from "lightningcss";

export const runDetection = (
  code: Uint8Array,
  check: (
    location: Location | undefined,
    compatStatement: CompatStatement | undefined
  ) => void
) =>
  transform({
    errorRecovery: true,
    filename: "fast-css-compat.css",
    code,
    visitor: {
      Rule() {
        check(undefined, bcd?.css?.["at-rules"]?.container?.__compat);
      },
      Declaration() {
        check(undefined, bcd?.css?.["at-rules"]?.container?.__compat);
      },
    },
  });
