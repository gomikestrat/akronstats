import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
    CF_API_TOKEN: string;
    CF_ACCOUNT_ID: string;
    CORS_ORIGIN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use(
    "/api/*",
    cors({
        origin: (origin, c) => c.env.CORS_ORIGIN || "*",
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["Content-Type"],
    })
);

// ─── List all zones ───
app.get("/api/zones", async (c) => {
    const token = c.env.CF_API_TOKEN;

    const zones: Array<{ id: string; name: string; status: string }> = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const res = await fetch(
            `https://api.cloudflare.com/client/v4/zones?per_page=50&page=${page}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = (await res.json()) as {
            success: boolean;
            result: Array<{ id: string; name: string; status: string }>;
            result_info: { total_pages: number };
            errors?: Array<{ message: string }>;
        };

        if (!data.success) {
            return c.json(
                { error: "Failed to fetch zones", details: data.errors },
                500
            );
        }

        zones.push(
            ...data.result.map((z) => ({
                id: z.id,
                name: z.name,
                status: z.status,
            }))
        );

        totalPages = data.result_info.total_pages;
        page++;
    }

    return c.json({ zones });
});

// ─── Helper: Build Edge analytics query & parse results ───
function buildEdgeQuery(dataNode: string, filterKey: string, dateField: string) {
    return `
    query GetEdgeAnalytics($zoneIds: [String!], $since: String!, $until: String!) {
      viewer {
        zones(filter: { zoneTag_in: $zoneIds }) {
          zoneTag
          totals: ${dataNode}(
            limit: 1
            filter: { ${filterKey}_geq: $since, ${filterKey}_lt: $until }
          ) {
            sum {
              requests
              pageViews
              bytes
              threats
            }
            uniq {
              uniques
            }
          }
          timeseries: ${dataNode}(
            limit: 1000
            filter: { ${filterKey}_geq: $since, ${filterKey}_lt: $until }
            orderBy: [${filterKey}_ASC]
          ) {
            dimensions {
              ${dateField}
            }
            sum {
              requests
              pageViews
              bytes
              countryMap {
                clientCountryName
                requests
                bytes
              }
              responseStatusMap {
                edgeResponseStatus
                requests
              }
              threats
            }
            uniq {
              uniques
            }
          }
        }
      }
    }
  `;
}

function parseEdgeZone(zone: any, dateField: string) {
    const totalData = (zone.totals as any[])?.[0] || {};
    const groupData = (zone.timeseries as any[]) || [];

    const totalRequests = totalData.sum?.requests || 0;
    const totalPageViews = totalData.sum?.pageViews || 0;
    const totalBytes = totalData.sum?.bytes || 0;
    const totalUniques = totalData.uniq?.uniques || 0;
    const totalThreats = totalData.sum?.threats || 0;

    const countryAgg: Record<string, { requests: number; bytes: number }> = {};
    const statusAgg: Record<string, number> = {};
    const timeseries: Array<{
        timestamp: string;
        requests: number;
        pageViews: number;
        visits: number;
        bytes: number;
        uniques: number;
    }> = [];

    for (const group of groupData) {
        timeseries.push({
            timestamp: group.dimensions?.[dateField as "date" | "datetime"] || "",
            requests: group.sum?.requests || 0,
            pageViews: group.sum?.pageViews || 0,
            visits: group.uniq?.uniques || 0,
            bytes: group.sum?.bytes || 0,
            uniques: group.uniq?.uniques || 0,
        });

        const countryMap = group.sum?.countryMap || [];
        for (const country of countryMap) {
            if (!countryAgg[country.clientCountryName]) {
                countryAgg[country.clientCountryName] = { requests: 0, bytes: 0 };
            }
            countryAgg[country.clientCountryName].requests += country.requests;
            countryAgg[country.clientCountryName].bytes += country.bytes;
        }

        const responseStatusMap = group.sum?.responseStatusMap || [];
        for (const status of responseStatusMap) {
            const key = String(status.edgeResponseStatus);
            statusAgg[key] = (statusAgg[key] || 0) + status.requests;
        }
    }

    const topCountries = Object.entries(countryAgg)
        .sort((a, b) => b[1].requests - a[1].requests)
        .slice(0, 10)
        .map(([name, data]) => ({ country: name, ...data }));

    const statusGroups = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
    for (const [code, count] of Object.entries(statusAgg)) {
        const codeNum = parseInt(code);
        if (codeNum >= 200 && codeNum < 300) statusGroups["2xx"] += count;
        else if (codeNum >= 300 && codeNum < 400) statusGroups["3xx"] += count;
        else if (codeNum >= 400 && codeNum < 500) statusGroups["4xx"] += count;
        else if (codeNum >= 500) statusGroups["5xx"] += count;
    }

    return {
        totals: {
            requests: totalRequests,
            pageViews: totalPageViews,
            bytes: totalBytes,
            visits: totalUniques,
            uniques: totalUniques,
            threats: totalThreats,
        },
        timeseries,
        topCountries,
        statusCodes: statusGroups,
    };
}

// ─── Helper: Build RUM analytics query & parse results ───
// Cloudflare Web Analytics (rumPageloadEventsAdaptiveGroups) lives at the
// ACCOUNT level, not the zone level. It tracks real human visits via the JS
// beacon — the same data shown in Cloudflare Dashboard → Web Analytics.
// We need the account ID and must resolve zone IDs to Web Analytics site tags.

async function fetchRumSiteTags(
    accountId: string,
    token: string
): Promise<Array<{ tag: string; host: string; zoneTag: string; autoInstall: boolean }>> {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/rum/site_info/list?per_page=100`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
    const data = (await res.json()) as {
        success: boolean;
        result: Array<{
            site_tag: string;
            host: string;
            auto_install: boolean;
            ruleset?: {
                zone_tag?: string;
                zone_name?: string;
                enabled?: boolean;
            };
        }>;
    };
    if (!data.success || !data.result) return [];
    return data.result.map((s) => ({
        tag: s.site_tag,
        host: s.host,
        zoneTag: s.ruleset?.zone_tag || "",
        autoInstall: s.auto_install,
    }));
}

async function resolveZoneToSiteTags(
    zoneIds: string[],
    accountId: string,
    token: string
): Promise<{ siteTags: string[]; zoneToSiteTag: Record<string, string> }> {
    // Fetch all RUM sites — each includes a ruleset.zone_tag we can match directly
    const rumSites = await fetchRumSiteTags(accountId, token);

    const zoneToSiteTag: Record<string, string> = {};
    const siteTags: string[] = [];
    for (const zoneId of zoneIds) {
        const site = rumSites.find((s) => s.zoneTag === zoneId);
        if (site) {
            zoneToSiteTag[zoneId] = site.tag;
            siteTags.push(site.tag);
        }
    }

    return { siteTags, zoneToSiteTag };
}

function buildRumQuery(siteTags: string[]) {
    const siteTagFilter = siteTags.length === 1
        ? `siteTag: "${siteTags[0]}"`
        : `siteTag_in: [${siteTags.map((t) => `"${t}"`).join(", ")}]`;

    return `
    query GetRumAnalytics($accountId: String!, $since: String!, $until: String!) {
      viewer {
        accounts(filter: { accountTag: $accountId }) {
          timeseries: rumPageloadEventsAdaptiveGroups(
            limit: 10000
            filter: { ${siteTagFilter}, datetime_geq: $since, datetime_lt: $until }
            orderBy: [datetimeHour_ASC]
          ) {
            count
            dimensions {
              datetimeHour
            }
            sum {
              visits
            }
          }
          countries: rumPageloadEventsAdaptiveGroups(
            limit: 15
            filter: { ${siteTagFilter}, datetime_geq: $since, datetime_lt: $until }
            orderBy: [count_DESC]
          ) {
            count
            dimensions {
              countryName
            }
          }
        }
      }
    }
  `;
}

function parseRumAccount(accountData: any): Record<string, any> {
    const groupData = (accountData.timeseries as any[]) || [];
    const countryData = (accountData.countries as any[]) || [];

    const timeseries: Array<{
        timestamp: string;
        requests: number;
        pageViews: number;
        visits: number;
        bytes: number;
        uniques: number;
    }> = [];

    // RUM timeseries is grouped by datetimeHour; aggregate duplicates
    const tsMap: Record<string, { pageViews: number; visits: number }> = {};
    for (const group of groupData) {
        const ts = group.dimensions?.datetimeHour || "";
        if (!tsMap[ts]) {
            tsMap[ts] = { pageViews: 0, visits: 0 };
        }
        tsMap[ts].pageViews += group.count || 0;
        tsMap[ts].visits += group.sum?.visits || 0;
    }

    // Build timeseries and compute totals from the same data
    let totalPageViews = 0;
    let totalVisits = 0;
    for (const [ts, data] of Object.entries(tsMap)) {
        totalPageViews += data.pageViews;
        totalVisits += data.visits;
        timeseries.push({
            timestamp: ts,
            requests: data.pageViews,
            pageViews: data.pageViews,
            visits: data.visits,
            bytes: 0,
            uniques: data.visits,
        });
    }
    timeseries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const topCountries = countryData
        .filter((c: any) => c.dimensions?.countryName)
        .map((c: any) => ({
            country: c.dimensions.countryName,
            requests: c.count || 0,
            bytes: 0,
        }))
        .slice(0, 10);

    return {
        totals: {
            requests: totalPageViews,
            pageViews: totalPageViews,
            bytes: 0,
            visits: totalVisits,
            uniques: totalVisits,
            threats: 0,
        },
        timeseries,
        topCountries,
        statusCodes: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
    };
}

// ─── Analytics for selected zones ───
app.get("/api/analytics", async (c) => {
    const token = c.env.CF_API_TOKEN;
    const zoneIds = c.req.query("zoneIds")?.split(",").filter(Boolean);
    if (!zoneIds || zoneIds.length === 0) {
        return c.json({ error: "zoneIds parameter is required" }, 400);
    }
    const timeRange = c.req.query("timeRange") || "24h";
    const customSince = c.req.query("since");
    const customUntil = c.req.query("until");
    const source = c.req.query("source") || "edge"; // edge | rum

    const now = new Date();
    let since: string;
    let untilDate: string;
    let dataNode: string;
    let dateField: string;

    if (source === "rum") {
        // RUM always uses datetime (ISO) filtering regardless of range
        if (customSince && customUntil) {
            // Ensure ISO format for RUM
            since = new Date(customSince).toISOString();
            untilDate = new Date(customUntil).toISOString();
        } else {
            switch (timeRange) {
                case "7d":
                    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case "31d":
                    since = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case "24h":
                default:
                    since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                    break;
            }
            untilDate = now.toISOString();
        }
        dataNode = "rumPageloadEventsAdaptiveGroups";
        dateField = "datetimeHour";
    } else {
        // Edge analytics uses httpRequests1hGroups / httpRequests1dGroups
        if (customSince && customUntil) {
            since = customSince;
            untilDate = customUntil;
            const start = new Date(since);
            const end = new Date(untilDate);
            const diffMs = end.getTime() - start.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays > 3) {
                dataNode = "httpRequests1dGroups";
                dateField = "date";
            } else {
                dataNode = "httpRequests1hGroups";
                dateField = "datetime";
            }
        } else {
            switch (timeRange) {
                case "7d":
                    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                    dataNode = "httpRequests1dGroups";
                    dateField = "date";
                    break;
                case "31d":
                    since = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                    dataNode = "httpRequests1dGroups";
                    dateField = "date";
                    break;
                case "24h":
                default:
                    since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                    dataNode = "httpRequests1hGroups";
                    dateField = "datetime";
                    break;
            }
            untilDate = dataNode === "httpRequests1dGroups" ? now.toISOString().split("T")[0] : now.toISOString();
        }
    }

    const filterKey = dataNode === "httpRequests1dGroups" ? "date" : "datetime";

    // ─── RUM path: account-level query with site tag resolution ───
    if (source === "rum") {
        const accountId = c.env.CF_ACCOUNT_ID;
        if (!accountId) {
            return c.json({ error: "CF_ACCOUNT_ID is required for RUM analytics" }, 500);
        }

        // Resolve zone IDs to Web Analytics site tags
        const { siteTags, zoneToSiteTag } = await resolveZoneToSiteTags(zoneIds, accountId, token);
        if (siteTags.length === 0) {
            return c.json({
                error: "No Web Analytics sites found for the selected zones. Enable Cloudflare Web Analytics (Browser Insights) for your zones first.",
                details: { zoneIds },
            }, 404);
        }

        const query = buildRumQuery(siteTags);
        const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: {
                    accountId,
                    since,
                    until: untilDate,
                },
            }),
        });

        const data = (await res.json()) as {
            data?: { viewer: { accounts: Array<Record<string, unknown>> } };
            errors?: Array<{ message: string }>;
        };

        if (data.errors && data.errors.length > 0) {
            const unknownField = data.errors.some((e) => e.message?.includes("unknown field"));
            if (unknownField) {
                return c.json({
                    error: "RUM analytics query failed. Ensure your API token has 'Account: Account Analytics: Read' permission and that Web Analytics (Browser Insights) is enabled for your account.",
                    details: data.errors,
                }, 403);
            }
            return c.json({ error: "GraphQL query failed", details: data.errors }, 500);
        }

        const accountData = data.data?.viewer?.accounts?.[0];
        if (!accountData) {
            return c.json({ error: "No RUM data returned" }, 500);
        }

        // RUM data is aggregated at account level across all matched site tags.
        // We return the same aggregated data for each requested zone that has a site tag.
        const parsed = parseRumAccount(accountData);
        const results: Record<string, unknown> = {};
        for (const zoneId of zoneIds) {
            if (zoneToSiteTag[zoneId]) {
                results[zoneId] = parsed;
            }
        }

        return c.json({ analytics: results, source });
    }

    // ─── Edge path: zone-level query ───
    // Build the appropriate GraphQL query based on source
    const query = buildEdgeQuery(dataNode, filterKey, dateField);

    const fetchChunk = async (chunk: string[]) => {
        const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: {
                    zoneIds: chunk,
                    since,
                    until: untilDate,
                },
            }),
        });
        return res.json() as Promise<{
            data?: { viewer: { zones: Array<{ zoneTag: string;[key: string]: unknown }> } };
            errors?: Array<{ message: string }>;
        }>;
    };

    const BATCH_SIZE = 10;
    const zoneChunks = [];
    for (let i = 0; i < zoneIds.length; i += BATCH_SIZE) {
        zoneChunks.push(zoneIds.slice(i, i + BATCH_SIZE));
    }

    const chunkResults = await Promise.all(zoneChunks.map((chunk) => fetchChunk(chunk)));
    const allZones: Array<{ zoneTag: string;[key: string]: unknown }> = [];

    for (const data of chunkResults) {
        if (data.errors && data.errors.length > 0) {
            return c.json({ error: "GraphQL query failed", details: data.errors }, 500);
        }
        if (data.data?.viewer?.zones) {
            allZones.push(...data.data.viewer.zones);
        }
    }

    const results: Record<string, unknown> = {};

    try {
        for (const zone of allZones) {
            results[zone.zoneTag] = parseEdgeZone(zone, dateField);
        }
    } catch (e: any) {
        return c.json({ error: "Aggregation failed", details: e.message, stack: e.stack }, 500);
    }

    return c.json({ analytics: results, source });
});

app.get("/api/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
