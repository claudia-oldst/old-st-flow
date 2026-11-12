/** Client portal filter (Type / Epic / Version), shared by every portal tab. */
export const PORTAL_TYPES = [
  { value: "Standard", label: "Standard" },
  { value: "Bug", label: "Bugs" },
  { value: "CR", label: "Change Requests" },
  { value: "Proj", label: "Project" },
] as const;

/** Epic value used for tickets with no epic (matches the database's COALESCE(epic_id, 0)). */
export const NO_EPIC = 0;

export interface PortalFilters {
  /** Ticket types; empty = All. */
  types: string[];
  /** Epic ids (0 = No Epic); empty = all epics. */
  epics: number[];
  /** Versions within the published scope; empty = all published versions. */
  versions: string[];
}

export const EMPTY_FILTERS: PortalFilters = { types: [], epics: [], versions: [] };

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const typeValues = PORTAL_TYPES.map((t) => t.value) as string[];

/** Reads filters from the URL; unknown types and non-numeric epics are ignored. */
export function parsePortalFilters(params: URLSearchParams, scope?: string[] | null): PortalFilters {
  return {
    types: list(params.get("type")).filter((t) => typeValues.includes(t)),
    epics: list(params.get("epic")).map(Number).filter((n) => Number.isInteger(n) && n >= 0),
    versions: clampVersions(list(params.get("version")), scope),
  };
}

/** Clients can only narrow the published version scope, never widen it. */
export function clampVersions(versions: string[], scope?: string[] | null): string[] {
  if (!scope || scope.length === 0) return versions;
  return versions.filter((v) => scope.includes(v));
}

/** Writes filters into the URL params (removing empty ones). */
export function writePortalFilters(params: URLSearchParams, f: PortalFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (k: string, v: (string | number)[]) => (v.length ? next.set(k, v.join(",")) : next.delete(k));
  set("type", f.types);
  set("epic", f.epics);
  set("version", f.versions);
  return next;
}

export const hasFilters = (f: PortalFilters) => f.types.length + f.epics.length + f.versions.length > 0;

/** Stable key for query caches. */
export const filterKey = (f: PortalFilters) =>
  [f.types.slice().sort().join("|"), f.epics.slice().sort().join("|"), f.versions.slice().sort().join("|")].join("~");

/** RPC arguments; empty arrays mean "no filter" in the database. */
export const filterArgs = (f: PortalFilters) => ({
  _f_types: f.types,
  _f_epics: f.epics,
  _f_versions: f.versions,
});
