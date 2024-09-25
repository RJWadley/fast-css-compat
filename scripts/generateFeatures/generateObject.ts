import bcd, { type Identifier } from "@mdn/browser-compat-data";
import { google } from "@ai-sdk/google";
import dedent from "dedent";
import type { z } from "zod";
import { generateObject, type GenerateObjectResult } from "ai";

let globalRetry: Promise<void> | undefined;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateObjectWithHandling = async <Schema>({
	prompt,
	schema,
}: {
	prompt: string;
	schema: z.ZodType<Schema>;
}): Promise<GenerateObjectResult<Schema>["object"]> => {
	try {
		const response = await generateObject({
			prompt,
			maxRetries: 0,
			model: google("gemini-1.5-flash"),
			schema,
			seed: 69_69_420,
		});

		return response.object;
	} catch (e) {
		if (e instanceof Error) {
			if (e.name === "AI_APICallError") {
				globalRetry ||= sleep(5000).then(() => {
					console.log("retrying...");
					globalRetry = undefined;
				});
				await globalRetry;
				return generateObjectWithHandling({ prompt, schema });
			}
		}

		throw e;
	}
};
