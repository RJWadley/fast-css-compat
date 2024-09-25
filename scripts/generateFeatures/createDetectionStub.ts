import bcd, { type Identifier } from "@mdn/browser-compat-data";
import { google } from "@ai-sdk/google";
import dedent from "dedent";
import { z } from "zod";
import { generateObjectWithHandling } from "./generateObject.js";

const googleModel = google("gemini-1.5-flash");

export const createDetectionStub = async ({
	id,
	description,
	docs,
}: {
	id: string;
	description: string | undefined;
	docs: string | undefined;
}) => {
	if (!docs) return '{"TODO": "no data"}';

	const object = await generateObjectWithHandling({
		schema: z.object({
			type: z.enum(["feature", "feature-value", "at-rule", "unit", "other"]),
			specificProperty: z
				.string()
				.optional()
				.describe(
					"if this is specific to one css property or it is a css property",
				),
			specificValue: z
				.string()
				.optional()
				.describe("if this is specific to one css value or it is a css value"),
			specificAtRule: z
				.string()
				.optional()
				.describe(
					"if this is specific to one css at-rule or it is a css at-rule",
				),
		}),
		prompt: dedent`
			The following documentation may or may not be useful
			${docs}

			# Instructions
			You are helping write tests for a CSS feature detector.
			collect data about the feature ${id.replace(".", " ")}.
		`,
	});

	const augmented = {
		...object,
		id: id,
		flex_context: id.includes("flex_context") ? true : undefined,
		grid_context: id.includes("grid_context") ? true : undefined,
	};

	return JSON.stringify(augmented, null, "\t");
};
