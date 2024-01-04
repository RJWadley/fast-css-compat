import { CompatStatement } from "@mdn/browser-compat-data";
import browserslist from "browserslist";
import { Location } from "lightningcss";
import { caniuseToMdn } from "./util/caniuseToMdn.js";
import { versionCompare } from "./util/versionCompare.js";
import { runDetection } from "./runDetection.js";

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

const isDescribedCompatStatement = (
  statement: CompatStatement
): statement is DescribedCompatStatement => {
  return typeof statement.description === "string";
};

type BrowserslistQuery = string | readonly string[] | null;

export class Detector {
  private browsers;
  private violationCache: Record<string, Violation | null> = {};

  public constructor(browsers: BrowserslistQuery) {
    this.browsers = browserslist(browsers).flatMap((browser) => {
      // if the browser name is reported as a range, split it into two
      // e.g ios_saf 16.6-16.7 -> ios_saf 16.6, ios_saf 16.7
      const [name, version] = browser.split(" ");
      if (!version) return browser;
      const [minVersion, maxVersion] = version.split("-");
      if (!maxVersion) return browser;
      return [`${name} ${minVersion}`, `${name} ${maxVersion}`];
    });
  }

  private getViolation = (
    location: Location | undefined,
    compatStatement: DescribedCompatStatement
  ): Violation | null => {
    const violatingBrowsers = this.browsers.filter((browser) => {
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

  public detect(code: Uint8Array) {
    const violations: Violation[] = [];

    runDetection(
      code,
      (
        location: Location | undefined,
        compatStatement: CompatStatement | undefined
      ): undefined => {
        if (!compatStatement) {
          violations.push({ location });
          return;
        }

        // ensure this is a compat statement with a description
        if (!isDescribedCompatStatement(compatStatement)) {
          console.error(
            "Missing description for compat statement",
            compatStatement
          );
          violations.push({ location });
          return;
        }

        // check for any cached violations
        const cachedViolation =
          this.violationCache[compatStatement.description];
        if (cachedViolation) {
          // submit a new violation with a new location
          violations.push({
            ...cachedViolation,
            location,
          });
          return;
        }

        // check for any uncached violations
        const violation = this.getViolation(
          location,
          // type is checked above, but TS doesn't narrow it
          compatStatement
        );
        if (violation) {
          violations.push(violation);
          this.violationCache[compatStatement.description] = violation;
        }
      }
    );
  }
}
