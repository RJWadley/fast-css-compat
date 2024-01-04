import { CompatStatement } from "@mdn/browser-compat-data";
import browserslist from "browserslist";
import { Location } from "lightningcss";
import { caniuseToMdn } from "./util/caniuseToMdn.js";
import { versionCompare } from "./util/versionCompare.js";
import { runDetection } from "./runDetection.js";
import { formatDescription } from "./util/formatDescription.js";

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
  name: string;
};

type BrowserslistQuery = string | readonly string[] | null;

type DetectorOptions = {
  onFeatureUsage?: (feature: string, location: Location) => void;
};

export class Detector {
  private browsers;
  private violationCache: Record<string, Violation | null> = {};
  private onFeatureUsage;

  public constructor(browsers: BrowserslistQuery, options?: DetectorOptions) {
    this.onFeatureUsage = options?.onFeatureUsage;

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
        featureName: compatStatement.name,
        browsers: violatingBrowsers,
      };
    }

    return null;
  };

  public process(code: Uint8Array | string) {
    const violations: Violation[] = [];

    runDetection(
      code,
      (
        location: Location,
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

        const feature = {
          ...compatStatement,
          name: formatDescription(compatStatement.description),
        };

        this.onFeatureUsage?.(feature.name, location);

        // check for any cached violations
        const cachedViolation = this.violationCache[feature.name];
        if (cachedViolation) {
          // submit a new violation with a new location
          violations.push({
            ...cachedViolation,
            location,
          });
          return;
        }

        // check for any uncached violations
        const violation = this.getViolation(location, feature);
        if (violation) {
          violations.push(violation);
          this.violationCache[feature.name] = violation;
        }
      }
    );

    return violations;
  }
}
