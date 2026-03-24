import type { Zone } from "../types";
import { Globe, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ZoneSelectorProps {
    zones: Zone[];
    selectedZoneId: string | null;
    favoriteZoneIds: string[];
    onSelect: (zoneId: string) => void;
    onToggleFavorite: (zoneId: string) => void;
    loading?: boolean;
}

export function ZoneSelector({
    zones,
    selectedZoneId,
    favoriteZoneIds,
    onSelect,
    onToggleFavorite,
    loading,
}: ZoneSelectorProps) {
    const [collapsed, setCollapsed] = useState(false);

    if (loading) {
        return (
            <div className="glass-card zone-selector">
                <div className="zone-selector__header">
                    <Globe size={18} />
                    <span>Domains</span>
                </div>
                <div className="zone-selector__loading">
                    <div className="shimmer" />
                    <div className="shimmer" />
                    <div className="shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card zone-selector">
            <div className="zone-selector__header" onClick={() => setCollapsed(!collapsed)}>
                <div className="zone-selector__title">
                    <Globe size={18} />
                    <span>Domains</span>
                    <span className="zone-selector__count">{zones.length}</span>
                </div>
                {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>

            {!collapsed && (
                <>

                    <div className="zone-selector__list">
                        {zones.map((zone) => {
                            const isSelected = selectedZoneId === zone.id;
                            const isFavorite = favoriteZoneIds.includes(zone.id);
                            return (
                                <div
                                    key={zone.id}
                                    className={`zone-item ${isSelected ? "zone-item--selected" : ""}`}
                                >
                                    <button
                                        className={`zone-item__favorite ${isFavorite ? "zone-item__favorite--active" : ""}`}
                                        onClick={() => onToggleFavorite(zone.id)}
                                    >
                                        <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                                    </button>
                                    <button className="zone-item__content" onClick={() => onSelect(zone.id)}>
                                        <span className="zone-item__name">{zone.name}</span>
                                        <span className={`zone-item__status zone-item__status--${zone.status}`}>
                                            {zone.status}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
