import type { AnalyticsSource } from "../types";
import { Server, User } from "lucide-react";

interface SourceSelectorProps {
    value: AnalyticsSource;
    onChange: (source: AnalyticsSource) => void;
}

export function SourceSelector({ value, onChange }: SourceSelectorProps) {
    return (
        <div className="source-selector">
            <button
                className={`source-btn ${value === "edge" ? "source-btn--active" : ""}`}
                data-source="edge"
                onClick={() => onChange("edge")}
                title="View data from Cloudflare edge logs (includes bots)"
            >
                <Server size={14} />
                Edge
            </button>
            <button
                className={`source-btn ${value === "rum" ? "source-btn--active" : ""}`}
                data-source="rum"
                onClick={() => onChange("rum")}
                title="View data from Real User Monitoring (human only)"
            >
                <User size={14} />
                RUM
            </button>
        </div>
    );
}
