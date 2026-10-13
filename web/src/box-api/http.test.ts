import { afterEach, describe, expect, it, vi } from "vitest";
import { BoxApiError } from "./contract";
import { createHttpBoxApi } from "./http";

afterEach(() => vi.unstubAllGlobals());

describe("http box API client", () => {
  it("calls the backend's endpoints with the bearer token", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ status: "paid", creditBalance: 3 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const api = createHttpBoxApi("https://api.example.com", () => "tok");
    expect(await api.pay("o-1", { method: "card", idempotencyKey: "k" })).toEqual({ status: "paid", creditBalance: 3 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/opens/o-1/pay");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ method: "card", idempotencyKey: "k" });
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
  });

  it("turns an error response into a BoxApiError with the body's code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "insufficient_funds" }), { status: 402 })));
    const err = await createHttpBoxApi("https://api.example.com", () => null)
      .pay("o-1", { method: "credit", idempotencyKey: "k" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BoxApiError);
    expect(err).toMatchObject({ status: 402, code: "insufficient_funds" });
  });
});
