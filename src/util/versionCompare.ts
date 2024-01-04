import { VersionValue } from "@mdn/browser-compat-data";

/**
 * check if a version is within a version range
 * @param minVersion the minimum supported version
 * @param version the version to check
 * @param maxVersion the maximum supported version
 * @returns true if the version is within the range
 */
export const versionCompare = (
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
