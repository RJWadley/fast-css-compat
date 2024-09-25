import bcd, { type Identifier } from "@mdn/browser-compat-data";
import { google } from "@ai-sdk/google";
import dedent from "dedent";
import { z } from "zod";
import { createTestStub } from "./createTestStub.js";
import { createDetectionStub } from "./createDetectionStub.js";

const googleModel = google("gemini-1.5-flash");

/**
 * iterate over bcd.css and generate a test stub for each __compat entry
 * note that stuff is nested here, so we need to recurse
 * write the test stub to ../src/featureTests/untriaged/${id}.css
 * the id, by the way, is the path to the feature in bcd.css using periods, such as at-rules.container.with_style_rules
 */
const recurseFeatures = async ({
	data = bcd.css,
	pathSoFar,
	lastKnownLink,
}: { data?: Identifier; pathSoFar?: string; lastKnownLink?: string } = {}) => {
	const thisCompat = data.__compat;

	// we want to recurse into any nested features
	for (const key in data) {
		if (key === "__compat") continue;
		const possibleLink = data.__compat?.mdn_url;

		const nextPath = pathSoFar ? `${pathSoFar}.${key}` : key;
		const nextData = data[key];

		if (nextData)
			recurseFeatures({
				data: nextData,
				pathSoFar: nextPath,
				lastKnownLink: possibleLink || lastKnownLink,
			});
	}

	// if we're seeing the compat key, we've reached an entry we need to test
	if (thisCompat && pathSoFar && pathSoFar.startsWith("properties.a")) {
		const hasNestedFeatures = Object.keys(data).some(
			(key) => key !== "__compat",
		);

		const { description, mdn_url } = thisCompat;
		const link = mdn_url || lastKnownLink;
		const parsedLink = link ? new URL(link) : undefined;
		const relevantDoc = parsedLink
			? Bun.file(
					`${parsedLink.pathname.replace(
						"/docs/Web/",
						"./node_modules/@mdn/content/files/en-us/web/",
					)}/index.md`
						.toLowerCase()
						.replaceAll("::", "_doublecolon_")
						.replaceAll(":", "_colon_")
						.replaceAll("*", "_star_"),
				)
			: null;

		// create a test
		{
			const testStub = await createTestStub({
				id: pathSoFar,
				description,
				link: link ?? lastKnownLink,
				docs: await relevantDoc?.text(),
			});
			const path = `./src/featureTests/generated/${pathSoFar.replace(
				/\./g,
				"/",
			)}${hasNestedFeatures ? "/index" : ""}.css`;
			if (testStub) {
				console.log(`writing ${path}`);
				await Bun.write(path, testStub);
			}
		}
		// stub out feature detection
		{
			const detectionStub = await createDetectionStub({
				id: pathSoFar,
				description,
				docs: await relevantDoc?.text(),
			});
			const path = `./src/detection/generated/${pathSoFar.replace(
				/\./g,
				"/",
			)}${hasNestedFeatures ? "/index" : ""}.json`;
			if (detectionStub) {
				console.log(`writing ${path}`);
				await Bun.write(path, detectionStub);
			}
		}
	}
};

recurseFeatures();
