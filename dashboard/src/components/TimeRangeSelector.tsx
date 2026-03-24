import { useState, useRef, useEffect } from "react";
import type { TimeRange, CustomTimeRange } from "../types";
import { Clock, Calendar, Check } from "lucide-react";

interface TimeRangeSelectorProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
}

const PRESET_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "31d", label: "31D" },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
    const isCustom = typeof value === "object";
    const [showCustom, setShowCustom] = useState(isCustom);
    const [customRange, setCustomRange] = useState<CustomTimeRange>(
        isCustom ? value : { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
    );
    const containerRef = useRef<HTMLDivElement>(null);

    // Close custom picker if clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (!isCustom) {
                    setShowCustom(false);
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isCustom]);

    const handleCustomChange = (field: keyof CustomTimeRange, val: string) => {
        const next = { ...customRange, [field]: val };
        setCustomRange(next);
    };

    const applyCustom = () => {
        onChange(customRange);
    };

    return (
        <div className="time-range-selector" ref={containerRef}>
            <Clock size={16} className="time-range-selector__icon" />
            <div className="time-range-selector__buttons">
                {PRESET_OPTIONS.map((opt) => (
                    <button
                        key={opt.value as string}
                        className={`time-range-btn ${value === opt.value ? "time-range-btn--active" : ""}`}
                        onClick={() => {
                            setShowCustom(false);
                            onChange(opt.value);
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
                <button
                    className={`time-range-btn ${isCustom ? "time-range-btn--active" : ""}`}
                    onClick={() => setShowCustom(!showCustom)}
                >
                    <Calendar size={14} style={{ marginRight: 4 }} />
                    {isCustom ? `${new Date(value.from).toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${new Date(value.to).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : "Custom"}
                </button>
            </div>

            {showCustom && (
                <div className="glass-card custom-range-picker">
                    <div className="custom-range-picker__fields">
                        <div className="custom-range-picker__field">
                            <label>From</label>
                            <input
                                type="date"
                                value={customRange.from}
                                onChange={(e) => handleCustomChange("from", e.target.value)}
                                className="custom-range-input"
                            />
                        </div>
                        <div className="custom-range-picker__field">
                            <label>To</label>
                            <input
                                type="date"
                                value={customRange.to}
                                onChange={(e) => handleCustomChange("to", e.target.value)}
                                className="custom-range-input"
                            />
                        </div>
                    </div>
                    <button className="apply-custom-btn" onClick={applyCustom}>
                        <Check size={14} /> Apply Range
                    </button>
                </div>
            )}
        </div>
    );
}
