import { useState, useEffect, useCallback } from "react";
import type { Zone, AggregatedAnalytics, TimeRange, AnalyticsSource } from "../types";
import {
    fetchZones,
    fetchAnalytics,
    getFavoriteZones,
    setFavoriteZones,
    getStoredSelectedZone,
    setStoredSelectedZone,
    getStoredTimeRange,
    setStoredTimeRange,
    getStoredSource,
    setStoredSource,
} from "../lib/api";

export function useAnalytics() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(getStoredSelectedZone());
    const [favoriteZoneIds, setFavoriteZoneIds] = useState<string[]>(getFavoriteZones());
    const [timeRange, setTimeRange] = useState<TimeRange>(getStoredTimeRange());
    const [source, setSource] = useState<AnalyticsSource>(getStoredSource());
    const [analytics, setAnalytics] = useState<AggregatedAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load zones on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setZonesLoading(true);
                const z = await fetchZones();
                if (!cancelled) {
                    setZones(z);
                    // No default auto-selection as per new requirements
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load zones");
            } finally {
                if (!cancelled) setZonesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Fetch analytics when selection or time range changes
    useEffect(() => {
        if (!selectedZoneId) {
            setAnalytics(null);
            return;
        }

        // Clear stale data immediately so the UI shows loading state
        setAnalytics(null);

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchAnalytics([selectedZoneId], timeRange, source);
                if (!cancelled) setAnalytics(data);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedZoneId, timeRange, source]);

    const selectZone = useCallback((zoneId: string | null) => {
        setSelectedZoneId(zoneId);
        setStoredSelectedZone(zoneId);
    }, []);

    const toggleFavorite = useCallback((zoneId: string) => {
        setFavoriteZoneIds((prev) => {
            const next = prev.includes(zoneId)
                ? prev.filter((id) => id !== zoneId)
                : [...prev, zoneId];
            setFavoriteZones(next);
            return next;
        });
    }, []);

    const changeTimeRange = useCallback((range: TimeRange) => {
        setTimeRange(range);
        setStoredTimeRange(range);
    }, []);

    const toggleSource = useCallback((src: AnalyticsSource) => {
        setSource(src);
        setStoredSource(src);
    }, []);

    return {
        zones,
        selectedZoneId,
        favoriteZoneIds,
        timeRange,
        source,
        analytics,
        loading,
        zonesLoading,
        error,
        selectZone,
        toggleFavorite,
        changeTimeRange,
        toggleSource,
    };
}
