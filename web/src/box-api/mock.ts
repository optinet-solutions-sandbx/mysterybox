import { randomHex } from "@/domain/fair";
import type { BoxApi } from "./contract";
import * as server from "./mock-server";
import type { MockDeps, MockWorld, OpResult } from "./mock-server";

/** Where the mock keeps its state: the signed-in account's session in the app, a variable in tests. */
export interface MockHost {
  read(): Omit<MockWorld, "now">;
  write(world: Omit<MockWorld, "now">): void;
}

export interface MockOptions {
  now?: () => number;
  /** Simulated network time per call, so loading states show. */
  latencyMs?: () => number;
  deps?: MockDeps;
}

const wait = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

/**
 * The backend's API, served in the browser. Calls that touch state run one at a time, in order,
 * so a double click or a retry can never interleave two payments or two spins.
 */
export function createMockBoxApi(host: MockHost, opts: MockOptions = {}): BoxApi {
  const now = opts.now ?? Date.now;
  const latency = opts.latencyMs ?? (() => 120 + Math.random() * 130);
  const deps = opts.deps ?? { randomHex, uuid: () => crypto.randomUUID() };
  let queue: Promise<unknown> = Promise.resolve();

  function stateful<A, R>(op: (w: MockWorld, args: A, deps: MockDeps) => Promise<OpResult<R>>, args: A): Promise<R> {
    const run = queue.then(async () => {
      await wait(latency());
      const { world, result } = await op({ ...host.read(), now: now() }, args, deps);
      const { now: _now, ...persist } = world;
      host.write(persist);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  async function stateless<R>(f: () => Promise<R>): Promise<R> {
    await wait(latency());
    return f();
  }

  return {
    listBoxes: () => stateless(server.apiBoxes),
    getBox: (slug) => stateless(() => server.apiBox(slug)),
    createOpen: (boxSlug) => stateful(server.createOpen, { boxSlug }),
    setClientSeed: (openId, clientSeed) => stateful(server.setClientSeed, { openId, clientSeed }),
    pay: (openId, body) => stateful(server.pay, { openId, method: body.method, idempotencyKey: body.idempotencyKey }),
    spin: (openId) => stateful(server.spin, { openId }),
    getOpen: (openId) => stateful(server.getOpen, { openId }),
    tradeIn: (awardId) => stateful(server.tradeIn, { awardId }),
    myCredits: () => stateful(server.myCredits, undefined),
    verify: (q) => stateless(() => server.verify(q)),
    getTable: (hash) => stateless(() => server.getTable(hash)),
    tableLog: () => stateless(server.tableLog),
    listAwards: () => stateful(server.listAwards, undefined),
  };
}
