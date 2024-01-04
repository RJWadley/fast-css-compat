import bcd, { CompatStatement } from "@mdn/browser-compat-data";
import browserslist from "browserslist";
import { Location, transform } from "lightningcss";
import { caniuseToMdn } from "./util/caniuseToMdn.js";
import { versionCompare } from "./util/versionCompare.js";

type Violation =
  | {
      location: Location | undefined;
    }
  | {
      location: Location;
      featureName: string;
      browsers: string[];
    };

type DescribedCompatStatement = CompatStatement & {
  description: string;
};

const getViolation = (
  browserslist: string[],
  location: Location | undefined,
  compatStatement: DescribedCompatStatement
): Violation | null => {
  const violatingBrowsers = browserslist.filter((browser) => {
    const [name, version] = browser.split(" ");
    const mdnName = caniuseToMdn(name);

    // if there is no MDN name, never report
    if (!mdnName) return false;

    const supportStatement = compatStatement.support[mdnName];

    const allStatements = Array.isArray(supportStatement)
      ? supportStatement
      : [supportStatement];

    const supported = allStatements.every((statement) => {
      return (
        statement &&
        versionCompare(
          statement.version_added,
          version,
          statement.version_removed
        )
      );
    });

    return !supported;
  });

  if (violatingBrowsers.length > 0) {
    return {
      location,
      featureName: compatStatement.description,
      browsers: violatingBrowsers,
    };
  }

  return null;
};

export const checkCSS = (
  code: Uint8Array,
  browsers?: string | readonly string[] | null
) => {
  const list = browserslist(browsers).flatMap((browser) => {
    // if the browser name is reported as a range, split it into two
    // e.g ios_saf 16.6-16.7 -> ios_saf 16.6, ios_saf 16.7
    const [name, version] = browser.split(" ");
    if (!version) return browser;
    const [minVersion, maxVersion] = version.split("-");
    if (!maxVersion) return browser;
    return [`${name} ${minVersion}`, `${name} ${maxVersion}`];
  });
  const violations: Violation[] = [];
  const violationCache: Record<string, Violation | null> = {};

  const check = (
    location: Location | undefined,
    compatStatement: CompatStatement | undefined
  ): undefined => {
    if (!compatStatement) {
      violations.push({ location });
      return;
    }

    // ensure this is a compat statement with a description
    if (!compatStatement.description) {
      console.error(
        "Missing description for compat statement",
        compatStatement
      );
      violations.push({ location });
      return;
    }

    // check for any cached violations
    const cachedViolation = violationCache[compatStatement.description];
    if (cachedViolation) {
      // submit a new violation with a new location
      violations.push({
        ...cachedViolation,
        location,
      });
      return;
    }

    // check for any uncached violations
    const violation = getViolation(
      list,
      location,
      // type is checked above, but TS doesn't narrow it
      compatStatement as DescribedCompatStatement
    );
    if (violation) {
      violations.push(violation);
      violationCache[compatStatement.description] = violation;
    }
  };

  transform({
    errorRecovery: true,
    filename: "fast-css-compat.css",
    code: code,
    visitor: {
      Rule() {
        check(undefined, bcd?.css?.["at-rules"]?.container?.__compat);
      },
      Declaration() {
        check(undefined, bcd?.css?.["at-rules"]?.container?.__compat);
      },
    },
  });
};
