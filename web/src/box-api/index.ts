import type { BoxApi } from "./contract";
import { createHttpBoxApi } from "./http";
import { createMockBoxApi } from "./mock";
import { sessionHost } from "./session-host";

export * from "./contract";

/**
 * The one switch (NEXT_PUBLIC_BACKEND): "mock" (the default) serves the backend's logic in the
 * browser; "api" calls the backend developer's server at NEXT_PUBLIC_BOX_API_URL.
 */
export const boxApi: BoxApi =
  process.env.NEXT_PUBLIC_BACKEND === "api"
    ? // Pending the backend: who issues the player's bearer token.
      createHttpBoxApi(process.env.NEXT_PUBLIC_BOX_API_URL ?? "", () => null)
    : createMockBoxApi(sessionHost);
