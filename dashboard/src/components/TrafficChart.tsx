import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { TimeseriesPoint, TimeRange, AnalyticsSource } from "../types";
import { formatNumber } from "../lib/api";

interface TrafficChartProps {
    data: TimeseriesPoint[];
    timeRange: TimeRange;
    theme: "light" | "dark";
    source: AnalyticsSource;
}

function shouldShowHourly(timeRange: TimeRange): boolean {
    if (timeRange === "24h") return true;
    if (typeof timeRange === "object") {
        const start = new Date(timeRange.from);
        const end = new Date(timeRange.to);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 3;
    }
    return false;
}

function formatLabel(ts: string, hourly: boolean): string {
    const d = new Date(ts);
    if (hourly) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Compute the start and end Date for a given timeRange */
function getTimeRangeBounds(timeRange: TimeRange): { start: Date; end: Date } {
    const now = new Date();
    if (typeof timeRange === "object") {
        return { start: new Date(timeRange.from), end: new Date(timeRange.to) };
    }
    switch (timeRange) {
        case "7d":
            return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        case "31d":
            return { start: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000), end: now };
        case "24h":
        default:
            return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
    }
}

/** Aggregate hourly timeseries into daily buckets, filling the full time range with zeros */
function aggregateToDaily(data: TimeseriesPoint[], timeRange: TimeRange): TimeseriesPoint[] {
    // 1. Bucket existing data by day
    const dayMap: Record<string, TimeseriesPoint> = {};
    for (const point of data) {
        const dayKey = new Date(point.timestamp).toISOString().split("T")[0];
        if (!dayMap[dayKey]) {
            dayMap[dayKey] = {
                timestamp: dayKey + "T12:00:00Z",
                requests: 0,
                pageViews: 0,
                visits: 0,
                bytes: 0,
                uniques: 0,
            };
        }
        dayMap[dayKey].requests += point.requests;
        dayMap[dayKey].pageViews += point.pageViews;
        dayMap[dayKey].visits += point.visits;
        dayMap[dayKey].bytes += point.bytes;
        dayMap[dayKey].uniques += point.uniques;
    }

    // 2. Walk the full time range day by day, filling gaps with zeros
    const { start, end } = getTimeRangeBounds(timeRange);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    const result: TimeseriesPoint[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        const dayKey = cursor.toISOString().split("T")[0];
        result.push(
            dayMap[dayKey] || {
                timestamp: dayKey + "T12:00:00Z",
                requests: 0,
                pageViews: 0,
                visits: 0,
                bytes: 0,
                uniques: 0,
            }
        );
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
}

interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip__label">{label}</p>
            {payload.map((entry: TooltipPayloadItem) => (
                <p key={entry.name} className="chart-tooltip__item" style={{ color: entry.color }}>
                    {entry.name}: {formatNumber(entry.value)}
                </p>
            ))}
        </div>
    );
}

/** Fill missing hourly gaps with zeros for the full time range */
function fillHourlyGaps(data: TimeseriesPoint[], timeRange: TimeRange): TimeseriesPoint[] {
    const tsMap: Record<string, TimeseriesPoint> = {};
    for (const point of data) {
        tsMap[point.timestamp] = point;
    }

    const { start, end } = getTimeRangeBounds(timeRange);

    const result: TimeseriesPoint[] = [];
    const cursor = new Date(start);
    cursor.setUTCMinutes(0, 0, 0);

    while (cursor <= end) {
        const key = cursor.toISOString().replace(".000Z", "Z");
        const match = tsMap[key] || tsMap[cursor.toISOString()];
        result.push(
            match || {
                timestamp: key,
                requests: 0,
                pageViews: 0,
                visits: 0,
                bytes: 0,
                uniques: 0,
            }
        );
        cursor.setUTCHours(cursor.getUTCHours() + 1);
    }

    return result;
}

export function TrafficChart({ data, timeRange, theme, source }: TrafficChartProps) {
    const hourly = shouldShowHourly(timeRange);
    const isRum = source === "rum";

    // For RUM data, fill gaps across the full time range
    let seriesData: TimeseriesPoint[];
    if (isRum && !hourly) {
        seriesData = aggregateToDaily(data, timeRange);
    } else if (isRum && hourly) {
        seriesData = fillHourlyGaps(data, timeRange);
    } else {
        seriesData = data;
    }

    const chartData = seriesData.map((point, idx) => ({
        ...point,
        _idx: idx,
        label: formatLabel(point.timestamp, hourly),
    }));

    const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const textColor = theme === "dark" ? "#64748b" : "#475569";

    return (
        <div className="glass-card traffic-chart">
            <h3 className="traffic-chart__title">
                {isRum ? "Human Traffic (Web Analytics)" : "Traffic Overview"}
            </h3>
            <div className="traffic-chart__container">
                <ResponsiveContainer key={source} width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradientVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientPageViews" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientUniques" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke={textColor}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            allowDuplicatedCategory={false}
                        />
                        <YAxis
                            stroke={textColor}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatNumber}
                            width={50}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {isRum ? (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="pageViews"
                                    name="Page Views"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#gradientPageViews)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="visits"
                                    name="Visits"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#gradientVisits)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </>
                        ) : (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="requests"
                                    name="Requests"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fill="url(#gradientRequests)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="pageViews"
                                    name="Page Views"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#gradientPageViews)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="uniques"
                                    name="Uniques"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    fill="url(#gradientUniques)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
