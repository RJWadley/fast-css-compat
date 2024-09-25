import { google } from "@ai-sdk/google";
import { generateObjectWithHandling } from "./generateObject.js";
import dedent from "dedent";
import { z } from "zod";

const googleModel = google("gemini-1.5-flash");

export const createTestStub = async ({
	id,
	description,
	docs,
	link,
}: {
	id: string;
	description: string | undefined;
	docs: string | undefined;
	link: string | undefined;
}) => {
	if (!docs) return "/* TODO no data */";

	const { nonUsageExample, usageExample } = await generateObjectWithHandling({
		schema: z.object({
			usageExample: z.string(),
			nonUsageExample: z.string(),
		}),
		prompt: dedent`
			The following documentation may or may not be useful
			${docs}

			# Instructions
			You are helping write tests for a CSS feature detector.
			generate one example that uses ${id.replace(".", " ")},
			and one example that does not use it.
		`,
	});

	return dedent`
		/* AUTO_GENERATED: true */

		/* 
		feature: ${id}
		${description ?? "No description provided"}
		
		see: ${link ?? "no link provided"}
		*/

		/* sample that triggers the feature */
		${usageExample}

		/* sample that does not trigger the feature */
		${nonUsageExample}
	`;
};
