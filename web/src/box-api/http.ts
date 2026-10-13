import { BoxApiError, type BoxApi, type BoxApiErrorStatus } from "./contract";

/**
 * The backend developer's API over HTTP (`<base>/v1/...`, their openapi.yaml). Not used by the
 * showcase yet: turn it on with NEXT_PUBLIC_BACKEND=api and NEXT_PUBLIC_BOX_API_URL.
 */
export function createHttpBoxApi(baseUrl: string, token: () => string | null): BoxApi {
  async function call<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
    const bearer = token();
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      let code = `http_${res.status}`;
      try {
        const json = (await res.json()) as { code?: unknown };
        if (typeof json.code === "string") code = json.code;
      } catch {
        // No JSON body: keep the status code.
      }
      throw new BoxApiError(res.status as BoxApiErrorStatus, code);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  const id = encodeURIComponent;
  return {
    listBoxes: () => call("GET", "/boxes"),
    getBox: (slug) => call("GET", `/boxes/${id(slug)}`),
    createOpen: (boxSlug) => call("POST", "/opens", { boxSlug }),
    setClientSeed: (openId, clientSeed) => call("PUT", `/opens/${id(openId)}/client-seed`, { clientSeed }),
    pay: (openId, body) => call("POST", `/opens/${id(openId)}/pay`, body),
    spin: (openId) => call("POST", `/opens/${id(openId)}/spin`),
    getOpen: (openId) => call("GET", `/opens/${id(openId)}`),
    tradeIn: (awardId) => call("POST", `/awards/${id(awardId)}/trade-in`),
    myCredits: () => call("GET", "/me/credits"),
    verify: (q) => {
      // Their verify takes these parameters; the outcome and free-spin comparison happens in the browser.
      const params = new URLSearchParams({ slug: q.slug, serverSeed: q.serverSeed, clientSeed: q.clientSeed, nonce: "1", tableHash: q.tableHash });
      if (q.bonusHash) params.set("bonusHash", q.bonusHash);
      return call("GET", `/verify?${params}`);
    },
    getTable: (hash) => call("GET", `/tables/${id(hash)}`),
    tableLog: () => call("GET", "/tables/log"),
    // Pending the backend: no awards listing in their contract yet.
    listAwards: () => call("GET", "/me/awards"),
  };
}
