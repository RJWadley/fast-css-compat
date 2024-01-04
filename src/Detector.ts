import browserslist from "browserslist";
import { Location } from "lightningcss";
import { caniuseToMdn } from "./util/caniuseToMdn.js";
import { versionCompare } from "./util/versionCompare.js";
import { DescribedCompatStatement, runDetection } from "./runDetection.js";

type Violation =
  | {
      location: Location | undefined;
    }
  | {
      location: Location;
      featureName: string;
      browsers: string[];
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
        featureName: compatStatement.id,
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
        compatStatement: DescribedCompatStatement | undefined
      ): undefined => {
        if (!compatStatement) {
          violations.push({ location });
          return;
        }

        this.onFeatureUsage?.(compatStatement.id, location);

        // check for any cached violations
        const cachedViolation = this.violationCache[compatStatement.id];
        if (cachedViolation) {
          // submit a new violation with a new location
          violations.push({
            ...cachedViolation,
            location,
          });
          return;
        }

        // check for any uncached violations
        const violation = this.getViolation(location, compatStatement);
        if (violation) {
          violations.push(violation);
          this.violationCache[compatStatement.id] = violation;
        }
      }
    );

    return violations;
  }
}
