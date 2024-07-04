import type { FreshContext, Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req: Request, _ctx: FreshContext) {
    console.log(_req);
    console.log(JSON.stringify(_req, null, 4));
    return new Response("Hello world", { status: 200 });
  },
};
