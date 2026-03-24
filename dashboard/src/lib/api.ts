import type {
    Zone,
    ZoneAnalytics,
    TimeRange,
    AggregatedAnalytics,
    TimeseriesPoint,
    CountryData,
    AnalyticsSource,
} from "../types";

// In dev, we proxy through Vite. In prod, point to the Worker URL.
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchZones(): Promise<Zone[]> {
    const res = await fetch(`${API_BASE}/api/zones`);
    if (!res.ok) throw new Error(`Failed to fetch zones: ${res.statusText}`);
    const data = await res.json();
    return data.zones;
}

export async function fetchAnalytics(
    zoneIds: string[],
    timeRange: TimeRange,
    source: AnalyticsSource = "edge"
): Promise<AggregatedAnalytics> {
    const params = new URLSearchParams({
        zoneIds: zoneIds.join(","),
        source,
    });

    if (typeof timeRange === "string") {
        params.set("timeRange", timeRange);
    } else {
        // Custom date range — send as since/until query params
        params.set("since", timeRange.from);
        params.set("until", timeRange.to);
    }

    const res = await fetch(`${API_BASE}/api/analytics?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
    const data = await res.json();

    // Aggregate across all selected zones
    return { ...aggregateZones(data.analytics, zoneIds), source: data.source || source };
}

function aggregateZones(
    analytics: Record<string, ZoneAnalytics>,
    zoneIds: string[]
): Omit<AggregatedAnalytics, "source"> {
    const totals = {
        requests: 0,
        pageViews: 0,
        bytes: 0,
        visits: 0,
        uniques: 0,
        threats: 0,
    };

    const timeseriesMap: Record<string, TimeseriesPoint> = {};
    const countryMap: Record<string, { requests: number; bytes: number }> = {};
    const statusCodes = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };

    for (const zoneId of zoneIds) {
        const zone = analytics[zoneId];
        if (!zone) continue;

        // Sum totals
        totals.requests += zone.totals.requests;
        totals.pageViews += zone.totals.pageViews;
        totals.bytes += zone.totals.bytes;
        totals.visits += zone.totals.visits;
        totals.uniques += zone.totals.uniques;
        totals.threats += zone.totals.threats;

        // Merge timeseries
        for (const point of zone.timeseries) {
            if (!timeseriesMap[point.timestamp]) {
                timeseriesMap[point.timestamp] = { ...point };
            } else {
                const existing = timeseriesMap[point.timestamp];
                existing.requests += point.requests;
                existing.pageViews += point.pageViews;
                existing.visits += point.visits;
                existing.bytes += point.bytes;
                existing.uniques += point.uniques;
            }
        }

        // Merge countries
        for (const c of zone.topCountries) {
            if (!countryMap[c.country]) {
                countryMap[c.country] = { requests: 0, bytes: 0 };
            }
            countryMap[c.country].requests += c.requests;
            countryMap[c.country].bytes += c.bytes;
        }

        // Merge status codes
        statusCodes["2xx"] += zone.statusCodes["2xx"];
        statusCodes["3xx"] += zone.statusCodes["3xx"];
        statusCodes["4xx"] += zone.statusCodes["4xx"];
        statusCodes["5xx"] += zone.statusCodes["5xx"];
    }

    const timeseries = Object.values(timeseriesMap).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const topCountries: CountryData[] = Object.entries(countryMap)
        .sort((a, b) => b[1].requests - a[1].requests)
        .slice(0, 10)
        .map(([country, data]) => ({ country, ...data }));

    return { totals, timeseries, topCountries, statusCodes };
}

// ─── localStorage helpers ───
const STORAGE_KEYS = {
    favoriteZones: "akronstats_favoriteZones",
    selectedZone: "akronstats_selectedZone",
    timeRange: "akronstats_timeRange",
    source: "akronstats_source",
};

export function getFavoriteZones(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.favoriteZones);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function setFavoriteZones(zoneIds: string[]): void {
    localStorage.setItem(STORAGE_KEYS.favoriteZones, JSON.stringify(zoneIds));
}

export function getStoredSelectedZone(): string | null {
    return localStorage.getItem(STORAGE_KEYS.selectedZone);
}

export function setStoredSelectedZone(zoneId: string | null): void {
    if (zoneId) {
        localStorage.setItem(STORAGE_KEYS.selectedZone, zoneId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.selectedZone);
    }
}

export function getStoredTimeRange(): TimeRange {
    const stored = localStorage.getItem(STORAGE_KEYS.timeRange);
    if (!stored) return "24h";

    try {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed.from && parsed.to) {
            return parsed as TimeRange;
        }
        return parsed as TimeRange;
    } catch {
        if (stored === "24h" || stored === "7d" || stored === "31d") return stored as TimeRange;
        return "24h";
    }
}

export function setStoredTimeRange(range: TimeRange): void {
    const value = typeof range === "string" ? range : JSON.stringify(range);
    localStorage.setItem(STORAGE_KEYS.timeRange, value);
}

export function getStoredSource(): AnalyticsSource {
    const stored = localStorage.getItem(STORAGE_KEYS.source);
    if (stored === "edge" || stored === "rum") return stored;
    return "edge";
}

export function setStoredSource(source: AnalyticsSource): void {
    localStorage.setItem(STORAGE_KEYS.source, source);
}

// ─── Formatting helpers ───
export function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
}

export function formatBytes(bytes: number): string {
    if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(2) + " GB";
    if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
    if (bytes >= 1_000) return (bytes / 1_000).toFixed(1) + " KB";
    return bytes + " B";
}
