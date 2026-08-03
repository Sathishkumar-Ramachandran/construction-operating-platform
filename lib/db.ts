import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Holds the current request/job's companyId for the lifetime of an async
 * call chain. Set via withTenant() at each entry point (see
 * lib/auth/guards.ts's withTenant* wrappers) — never call
 * tenantContext.run() and simply return from inside it; AsyncLocalStorage
 * only covers work started *inside* the run() callback, so the callback
 * must wrap the entire rest of the request handling, not just the
 * guard check.
 *
 * Deduplicated via globalThis exactly like basePrisma/extendedPrisma below.
 * Route Handlers and page/action Server Components can each resolve a
 * separate instantiation of this module under Turbopack's dev-mode
 * per-entrypoint bundling — without this guard, withTenant() called from
 * one bundle's copy of this file would `.run()` on a DIFFERENT
 * AsyncLocalStorage instance than the one the shared, globally-cached `db`
 * client's query extension reads via currentCompanyId(), so every
 * tenant-scoped query would throw "no companyId in context" even though
 * withTenant() was called correctly.
 */
const globalForTenantContext = globalThis as unknown as {
  tenantContext?: AsyncLocalStorage<{ companyId: string }>;
};

export const tenantContext: AsyncLocalStorage<{ companyId: string }> =
  globalForTenantContext.tenantContext ?? new AsyncLocalStorage<{ companyId: string }>();

globalForTenantContext.tenantContext = tenantContext;

/**
 * The ONLY models exempt from tenant scoping. Keep this list exactly this
 * short — every other model in schema.prisma carries a companyId column
 * (see Company's doc comment there) specifically so this list never needs
 * a per-model judgment call.
 */
const UNSCOPED_MODELS = new Set(["Company", "PlatformAdmin", "PlatformAdminSession"]);

const WHERE_SCOPED_OPERATIONS = new Set([
  "update",
  "delete",
  "updateMany",
  "deleteMany",
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/**
 * Reads the current request's companyId out of AsyncLocalStorage. Exported
 * for the handful of call sites that need to build a composite-unique
 * `where` key by hand (e.g. `{ companyId_code: { companyId: currentCompanyId(), code } }`)
 * — the extension auto-injects companyId for ordinary flat `where` filters,
 * but a compound unique selector's nested object has to be constructed
 * explicitly since Prisma requires every field of a compound key present.
 * Throws under the same conditions as an unscoped query would.
 */
export function currentCompanyId(): string {
  const store = tenantContext.getStore();
  if (!store) {
    throw new Error(
      "Tenant-scoped query attempted with no companyId in context. Wrap the " +
        "call site in withTenant(companyId, fn) (see the withTenant* guards " +
        "in lib/auth/guards.ts), or use rawDb for a deliberate cross-tenant " +
        "query (auth bootstrap, prisma/seed.ts, the Platform Admin control panel)."
    );
  }
  return store.companyId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scopeArgs(operation: string, args: any, companyId: string): any {
  const scopedArgs = args ?? {};

  if (operation === "create") {
    scopedArgs.data = { ...(scopedArgs.data ?? {}), companyId };
  } else if (operation === "createMany" || operation === "createManyAndReturn") {
    scopedArgs.data = Array.isArray(scopedArgs.data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? scopedArgs.data.map((row: any) => ({ ...row, companyId }))
      : { ...(scopedArgs.data ?? {}), companyId };
  } else if (operation === "upsert") {
    scopedArgs.where = { ...(scopedArgs.where ?? {}), companyId };
    scopedArgs.create = { ...(scopedArgs.create ?? {}), companyId };
  } else if (WHERE_SCOPED_OPERATIONS.has(operation)) {
    scopedArgs.where = { ...(scopedArgs.where ?? {}), companyId };
  }

  return scopedArgs;
}

function createBaseClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function extendWithTenantScoping(base: PrismaClient) {
  return base.$extends({
    name: "tenant-scoping",
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || UNSCOPED_MODELS.has(model)) {
            return query(args);
          }
          const companyId = currentCompanyId();
          return query(scopeArgs(operation, args, companyId));
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  basePrisma?: PrismaClient;
  extendedPrisma?: ReturnType<typeof extendWithTenantScoping>;
};

const basePrisma = globalForPrisma.basePrisma ?? createBaseClient();

/**
 * Deliberate cross-tenant / bootstrap escape hatch — no scoping applied at
 * all. Every use of this must be one of: login/session lookup
 * (auth-service.ts, before a tenant is known), prisma/seed.ts, the
 * backfill script, or the Platform Admin control panel (inherently
 * cross-tenant). Grep for `rawDb` to audit every cross-tenant query in the
 * codebase.
 */
export const rawDb = basePrisma;

/** The tenant-scoped client every service already imports as `db`. */
export const db = globalForPrisma.extendedPrisma ?? extendWithTenantScoping(basePrisma);

/** Anything that can run `db.<model>.<op>()` calls — `db` itself, or a
 * `db.$transaction((tx) => ...)` callback's `tx`. Deliberately the
 * *reduced* transaction-client shape (no `$transaction`/`$connect`/
 * `$disconnect`/`$extends`), not `typeof db` — `tx` is a strict subset of
 * `db`, so typing this as the subset lets both satisfy it, whereas typing
 * it as the full `db` shape would reject `tx` for lacking those methods.
 * Use this instead of the generated `PrismaClient`/`Prisma.TransactionClient`
 * types for functions that accept either, since the tenant-scoping
 * extension changes `db`'s concrete type. */
type TransactionCallback = Parameters<typeof db.$transaction>[0];
export type Db = TransactionCallback extends (client: infer C, ...args: never[]) => unknown ? C : never;

if (env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.extendedPrisma = db;
}

/**
 * Runs `fn` with `companyId` bound to every `db` query made anywhere inside
 * it (including inside `db.$transaction`, which inherits the extension).
 * Must wrap the entire remainder of a request/job — see the withTenant*
 * wrappers in lib/auth/guards.ts, which are the actual call sites; don't
 * call this directly from page/action/route code.
 */
export function withTenant<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
  return tenantContext.run({ companyId }, fn);
}
