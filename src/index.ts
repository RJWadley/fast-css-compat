import { Location, transform } from "lightningcss";
import bcd, {
  BrowserName,
  CompatStatement,
  VersionValue,
} from "@mdn/browser-compat-data" assert { type: "json" };
import browserslist from "browserslist";

const css = String.raw;

/**
 * converts browser names from caniuse to MDN
 */
const caniuseToMdn = (browser: string | undefined): BrowserName | false => {
  switch (browser) {
    // supported by MDN with different name
    case "and_chr":
      return "chrome_android";
    case "and_ff":
      return "firefox_android";
    case "android":
      return "webview_android";
    case "ios_saf":
      return "safari_ios";
    case "op_mob":
      return "opera_android";
    case "samsung":
      return "samsunginternet_android";

    // supported by MDN with same name
    case "chrome":
    case "edge":
    case "firefox":
    case "ie":
    case "opera":
    case "safari":
      return browser;

    // unsupported by MDN (never report)
    case "and_qq":
    case "and_uc":
    case "op_mini":
    case "kaios":
    case "baidu":
    case "bb":
    case "ie_mob":
      return false;

    default:
      console.error("unknown browser", browser);
      return false;
  }
};

const versionCompare = (
  minVersion: VersionValue,
  version: string | undefined,
  maxVersion: VersionValue | undefined
) => {
  try {
    if (!version) return false;

    // true means every version, false means no version
    if (minVersion === true) return true;
    if (minVersion === false) return false;
    if (maxVersion === true) return false;
    if (maxVersion === false) return true;
    if (!minVersion) return false;

    return maxVersion
      ? parseFloat(minVersion) <= parseFloat(version) &&
          parseFloat(version) <= parseFloat(maxVersion)
      : parseFloat(minVersion) <= parseFloat(version);
  } catch (error) {
    console.error("inavlid version", minVersion, version, maxVersion);
  }
};

type Violation =
  | {
      location: Location;
    }
  | {
      location: Location;
      featureName: string;
      browsers: string[];
    };

const checkCSS = (
  buffer: Buffer,
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

  const checkSupport = (node: Location, compatStatement?: CompatStatement) => {
    if (!compatStatement) {
      violations.push({ location: node });
      return;
    }

    const violatingBrowsers = list.filter((browser) => {
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

    console.log(violatingBrowsers);
  };

  transform({
    filename: "fast-css-compat.css",
    code: buffer,
    visitor: {
      Rule(rule) {
        switch (rule.type) {
          case "container":
            checkSupport(
              rule.value.loc,
              bcd?.css?.["at-rules"]?.container?.__compat
            );
            return;
        }
      },
      Declaration(property) {},
    },
  });
};

checkCSS(
  Buffer.from(css`
    /* A container context based on inline size */
    .post {
      container-type: inline-size;
    }

    /* Apply styles if the container is narrower than 650px */
    @container (width < 650px) {
      .card {
        width: 50%;
        background-color: gray;
        font-size: 1em;
      }
    }
  `),
  "defaults"
);
