import type { CountryData, StatusCodes, AnalyticsSource } from "../types";
import { formatNumber } from "../lib/api";
import { MapPin, ShieldCheck, UserCheck } from "lucide-react";

interface TopCountriesProps {
    countries: CountryData[];
    source: AnalyticsSource;
}

export function TopCountries({ countries, source }: TopCountriesProps) {
    if (!countries.length) return null;

    const maxRequests = Math.max(...countries.map((c) => c.requests));

    return (
        <div className="glass-card panel-card">
            <h3 className="panel-card__title">
                <MapPin size={16} />
                Top Countries {source === "rum" ? "(by Page Views)" : ""}
            </h3>
            <div className="country-list">
                {countries.map((c, i) => (
                    <div key={c.country} className="country-item">
                        <span className="country-item__rank">{i + 1}</span>
                        <span className="country-item__name">{c.country}</span>
                        <div className="country-item__bar-wrapper">
                            <div
                                className="country-item__bar"
                                style={{ width: `${(c.requests / maxRequests) * 100}%` }}
                            />
                        </div>
                        <span className="country-item__value">{formatNumber(c.requests)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StatusOverviewProps {
    statusCodes: StatusCodes;
    source: AnalyticsSource;
}

export function StatusOverview({ statusCodes, source }: StatusOverviewProps) {
    const total =
        statusCodes["2xx"] + statusCodes["3xx"] + statusCodes["4xx"] + statusCodes["5xx"];

    if (source === "rum") {
        return (
            <div className="glass-card panel-card">
                <h3 className="panel-card__title">
                    <UserCheck size={16} />
                    RUM Insights
                </h3>
                <div style={{ padding: "var(--gap-md)", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    <p>RUM data is collected via the Cloudflare Web Analytics JS beacon and only tracks <strong style={{ color: "var(--text-primary)" }}>real human browser visits</strong>.</p>
                    <p style={{ marginTop: "var(--gap-sm)", opacity: 0.7 }}>Status codes, bandwidth, and threat data are only available in Edge mode.</p>
                </div>
            </div>
        );
    }

    if (total === 0) return null;

    const items = [
        { label: "2xx Success", value: statusCodes["2xx"], color: "var(--accent-green)" },
        { label: "3xx Redirect", value: statusCodes["3xx"], color: "var(--accent-blue)" },
        { label: "4xx Client Error", value: statusCodes["4xx"], color: "var(--accent-amber)" },
        { label: "5xx Server Error", value: statusCodes["5xx"], color: "var(--accent-red)" },
    ];

    return (
        <div className="glass-card panel-card">
            <h3 className="panel-card__title">
                <ShieldCheck size={16} />
                Response Status
            </h3>
            <div className="status-bar">
                {items
                    .filter((item) => item.value > 0)
                    .map((item) => (
                        <div
                            key={item.label}
                            className="status-bar__segment"
                            style={{
                                width: `${(item.value / total) * 100}%`,
                                backgroundColor: item.color,
                            }}
                            title={`${item.label}: ${formatNumber(item.value)}`}
                        />
                    ))}
            </div>
            <div className="status-list">
                {items.map((item) => (
                    <div key={item.label} className="status-item">
                        <div className="status-item__dot" style={{ backgroundColor: item.color }} />
                        <span className="status-item__label">{item.label}</span>
                        <span className="status-item__value">{formatNumber(item.value)}</span>
                        <span className="status-item__percent">
                            {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
