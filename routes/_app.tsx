import { asset, Head } from "$fresh/runtime.ts";
import { defineApp } from "$fresh/server.ts";
import { Context } from "deco/deco.ts";
import Theme from "../sections/Theme/Theme.tsx";

const sw = () =>
  addEventListener("load", () =>
    navigator && navigator.serviceWorker &&
    navigator.serviceWorker.register("/sw.js"));

export default defineApp(async (_req, ctx) => {
  const revision = await Context.active().release?.revision();

  return (
    <>
      {/* Include default fonts and css vars */}
      <Theme />

      {/* Include Icons and manifest */}
      <Head>
        {/* Enable View Transitions API */}
        <meta name="view-transition" content="same-origin" />

        {/* Tailwind v3 CSS file */}
        <link
          href={asset(`/styles.css?revision=${revision}`)}
          rel="stylesheet"
        />
      </Head>

      {/* Rest of Preact tree */}
      <ctx.Component />

      {/* Include service worker */}
      <script
        type="module"
        dangerouslySetInnerHTML={{ __html: `(${sw})();` }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
      @font-face {
    font-family: 'Outfit';
    src: url('${asset("fonts/outfit/OutfitThin-Light.woff2")}') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Light.woff")}') format('woff');
    font-weight: 300;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${
            asset("fonts/outfit/OutfitThin-ExtraLight.woff2")
          }') format('woff2'),
        url('${
            asset("fonts/outfit/OutfitThin-ExtraLight.woff")
          }') format('woff');
    font-weight: 200;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${asset("fonts/outfit/OutfitThin-Thin.woff2")}') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Thin.woff")}') format('woff');
    font-weight: 100;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${
            asset("fonts/outfit/OutfitThin-Medium.woff2")
          }') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Medium.woff")}') format('woff');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${
            asset("fonts/outfit/OutfitThin-SemiBold.woff2")
          }') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-SemiBold.woff")}') format('woff');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${
            asset("fonts/outfit/OutfitThin-Regular.woff2")
          }') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Regular.woff")}') format('woff');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${asset("fonts/outfit/OutfitThin-Bold.woff2")}') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Bold.woff")}') format('woff');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${asset("fonts/outfit/OutfitThin-Black.woff2")}') format('woff2'),
        url('${asset("fonts/outfit/OutfitThin-Black.woff")}') format('woff');
    font-weight: 900;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Outfit';
    src: url('${
            asset("fonts/outfit/OutfitThin-ExtraBold.woff2")
          }') format('woff2'),
        url('${
            asset("fonts/outfit/OutfitThin-ExtraBold.woff")
          }') format('woff');
    font-weight: 800;
    font-style: normal;
    font-display: swap;
}  
      `,
        }}
      />
    </>
  );
});
