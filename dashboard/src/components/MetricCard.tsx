import { formatNumber, formatBytes } from "../lib/api";
import {
    Eye,
    Users,
    FileText,
    HardDrive,
    Shield,
    Activity,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AnalyticsSource } from "../types";
import "./MetricSourceBadge.css";

interface MetricCardProps {
    label: string;
    value: number;
    icon: ReactNode;
    format?: "number" | "bytes";
    accentColor?: string;
    source: AnalyticsSource;
}

function MetricCard({
    label,
    value,
    icon,
    format = "number",
    accentColor = "var(--accent-purple)",
    source,
}: MetricCardProps) {
    const formattedValue = format === "bytes" ? formatBytes(value) : formatNumber(value);

    return (
        <div className="glass-card metric-card">
            <div className="metric-card__icon" style={{ color: accentColor }}>
                {icon}
            </div>
            <div className="metric-card__content">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="metric-card__label">{label}</span>
                    <span className={`metric-source-badge metric-source-badge--${source}`}>
                        {source}
                    </span>
                </div>
                <span className="metric-card__value">{formattedValue}</span>
            </div>
        </div>
    );
}

interface MetricGridProps {
    visits: number;
    uniques: number;
    pageViews: number;
    bytes: number;
    threats: number;
    requests: number;
    source: AnalyticsSource;
}

export function MetricGrid({
    visits,
    uniques,
    pageViews,
    bytes,
    threats,
    requests,
    source,
}: MetricGridProps) {
    if (source === "rum") {
        return (
            <div className="metric-grid">
                <MetricCard
                    label="Page Views"
                    value={pageViews}
                    icon={<FileText size={22} />}
                    accentColor="var(--accent-teal)"
                    source={source}
                />
                <MetricCard
                    label="Total Visits"
                    value={visits}
                    icon={<Eye size={22} />}
                    accentColor="var(--accent-purple)"
                    source={source}
                />
                <MetricCard
                    label="Unique Visitors"
                    value={uniques}
                    icon={<Users size={22} />}
                    accentColor="var(--accent-blue)"
                    source={source}
                />
            </div>
        );
    }

    return (
        <div className="metric-grid">
            <MetricCard
                label="Total Visits"
                value={visits}
                icon={<Eye size={22} />}
                accentColor="var(--accent-purple)"
                source={source}
            />
            <MetricCard
                label="Unique Visitors"
                value={uniques}
                icon={<Users size={22} />}
                accentColor="var(--accent-blue)"
                source={source}
            />
            <MetricCard
                label="Page Views"
                value={pageViews}
                icon={<FileText size={22} />}
                accentColor="var(--accent-teal)"
                source={source}
            />
            <MetricCard
                label="Bandwidth"
                value={bytes}
                format="bytes"
                icon={<HardDrive size={22} />}
                accentColor="var(--accent-pink)"
                source={source}
            />
            <MetricCard
                label="Total Requests"
                value={requests}
                icon={<Activity size={22} />}
                accentColor="var(--accent-amber)"
                source={source}
            />
            <MetricCard
                label="Threats Blocked"
                value={threats}
                icon={<Shield size={22} />}
                accentColor="var(--accent-green)"
                source={source}
            />
        </div>
    );
}
