import { BrowserName } from "@mdn/browser-compat-data";

/**
 * converts browser names from caniuse to MDN
 */
export const caniuseToMdn = (
  browser: string | undefined
): BrowserName | false => {
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
