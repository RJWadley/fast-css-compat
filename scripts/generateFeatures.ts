import bcd, { Identifier } from "@mdn/browser-compat-data";

const createTestStub = ({
  id,
  description,
  link,
}: {
  id: string;
  description?: string;
  link: string;
}) =>
  `/*

This file contains tests for ${id}
${description ?? "No description provided"}

${id}

See: ${link}

TODO: create a test for this feature and move it to test/cases/unimplemented/
TODO: write an implementation for this feature and move it to test/cases/features/

*/

/*
expect:
${id}: 0
*/
`;

/**
 * iterate over bcd.css and generate a test stub for each __compat entry
 * note that stuff is nested here, so we need to recurse
 * write the test stub to ../src/featureTests/untriaged/${id}.css
 * the id, by the way, is the path to the feature in bcd.css using periods, such as at-rules.container.with_style_rules
 */
const recurseFeatures = async (
  data: Identifier = bcd.css,
  pathSoFar?: string
) => {
  const thisCompat = data.__compat;

  if (thisCompat && pathSoFar) {
    const hasNestedFeatures = Object.keys(data).some(
      (key) => key !== "__compat"
    );

    const { description, mdn_url } = thisCompat;
    const link = mdn_url ?? "no link provided";
    const testStub = createTestStub({ id: pathSoFar, description, link });
    const path = `./src/featureTests/untriaged/${pathSoFar.replace(
      /\./g,
      "/"
    )}${hasNestedFeatures ? "/index" : ""}.css`;
    console.log(`writing ${path}`);
    await Bun.write(path, testStub);
  }

  for (const key in data) {
    if (key === "__compat") continue;
    const nextPath = pathSoFar ? `${pathSoFar}.${key}` : key;
    await recurseFeatures(data[key], nextPath);
  }
};

recurseFeatures();
