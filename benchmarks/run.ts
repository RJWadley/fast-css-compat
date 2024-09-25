// import fs from "fs/promises";
// import { Detector } from "../src/Detector.js";

// const detector = new Detector("defaults");

// const main = async () => {
//   const start = performance.now();

//   const folder = new URL("./data", import.meta.url).pathname;
//   const files = await fs.readdir(folder);
//   const cssFiles = files.filter((file) => file.endsWith(".css"));

//   for (const filePath of cssFiles) {
//     console.log(`Checking ${filePath}`);
//     const file = await Bun.file(
//       new URL(`./data/${filePath}`, import.meta.url).pathname
//     );
//     const arrBuffer = await file.arrayBuffer();
//     const byteArray = new Uint8Array(arrBuffer);
//     detector.process(byteArray);
//   }

//   const end = performance.now();
//   console.log(`Benchmark took ${end - start}ms`);
// };

// main();
