export interface Zone {
    id: string;
    name: string;
    status: string;
}

export interface ZoneTotals {
    requests: number;
    pageViews: number;
    bytes: number;
    visits: number;
    uniques: number;
    threats: number;
}

export interface TimeseriesPoint {
    timestamp: string;
    requests: number;
    pageViews: number;
    visits: number;
    bytes: number;
    uniques: number;
}

export interface CountryData {
    country: string;
    requests: number;
    bytes: number;
}

export interface StatusCodes {
    "2xx": number;
    "3xx": number;
    "4xx": number;
    "5xx": number;
}

export interface ZoneAnalytics {
    totals: ZoneTotals;
    timeseries: TimeseriesPoint[];
    topCountries: CountryData[];
    statusCodes: StatusCodes;
}

export interface CustomTimeRange {
    from: string;
    to: string;
}

export type TimeRange = "24h" | "7d" | "31d" | CustomTimeRange;

export type AnalyticsSource = "edge" | "rum";

export interface AggregatedAnalytics {
    totals: ZoneTotals;
    timeseries: TimeseriesPoint[];
    topCountries: CountryData[];
    statusCodes: StatusCodes;
    source: AnalyticsSource;
}
