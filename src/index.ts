import { checkCSS } from "./checkCSS.js";

const css = String.raw;

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
