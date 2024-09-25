import { dirname, join as joinPath, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Detector } from "../Detector.js";
import { getFiles } from "../util/getFiles.js";
import { expect, test } from "bun:test";

const selfPath = dirname(fileURLToPath(import.meta.url));

/**
 * Parse the feature-key: count lines in the leading comment of
 * each test case fixture.
 */
function parseTestCase(cssString: string) {
  const metaRegex = /\s*\/\*\s*expect:\s*([_.\d\s:A-Za-z-]*)/;
  const metadata = cssString.match(metaRegex);
  if (!metadata) return null;

  const featureCounts: Record<string, number> = {};
  const features = metadata[1]?.split("\n") ?? [];

  for (const feature of features) {
    const [name, count] = feature.replace(/\s*/, "").split(":");
    if (name) featureCounts[name] = Number(count ?? 0);
  }

  return featureCounts;
}

// read in the test cases from /cases/**/*.css
const casePath = joinPath(selfPath, "cases");
for await (const caseFileName of getFiles(casePath)) {
  const testFilePath = relative(casePath, caseFileName);
  if (testFilePath.startsWith("unimplemented/")) continue;

  const cssString = await Bun.file(caseFileName).text();
  const expectedCounts = parseTestCase(cssString);
  if (!expectedCounts) continue;

  test(`detecting CSS features (${testFilePath})`, () => {
    const actualCounts: Record<string, number> = {};

    const detector = new Detector("defaults", {
      onFeatureUsage(feature) {
        actualCounts[feature] = (actualCounts[feature] ?? 0) + 1;
      },
    });
    detector.process(cssString);

    // verify that the detector found at least one feature in the test case
    expect(Object.entries(expectedCounts).length).not.toBe(0);

    // verify that the expected features were detected the expected number of times
    for (const [feature, expectedCount] of Object.entries(expectedCounts)) {
      const actualCount = actualCounts[feature] ?? 0;
      expect(actualCount).toBe(expectedCount);
    }
  });
}
