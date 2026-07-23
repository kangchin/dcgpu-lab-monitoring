"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface TemperatureReading {
  _id?: string;
  created: string;
  site: string;
  location: string;
  reading: number;
  symbol: string;
}

interface LocationTemperature {
  location: string;
  readings: TemperatureReading[];
  latest: TemperatureReading | null;
  average: number;
  max: number;
  min: number;
}

interface AislePair {
  pairName: string;
  coldAisle: LocationTemperature | null;
  hotAisle: LocationTemperature | null;
  coldLocation: string;
  hotLocation: string;
  coldTemp: number | null;
  hotTemp: number | null;
  delta: number | null;
}

export function DH3TemperatureMonitor() {
  const [temperatureData, setTemperatureData] = useState<
    LocationTemperature[]
  >([]);
  const [aislePairs, setAislePairs] = useState<AislePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [reviewDate, setReviewDate] = useState<string>("");
  const [reviewHour, setReviewHour] = useState<string>("");
  const [isDateTimePanelOpen, setIsDateTimePanelOpen] = useState(false);

  const asNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    return null;
  };

  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDisplayTemperature = (
    location: LocationTemperature | null,
    selectedDate: string,
    selectedHour: string
  ): number | null => {
    if (!location) return null;

    // When date/hour not selected, use latest reading.
    if (!selectedDate || selectedHour === "") {
      return location.latest?.reading ?? null;
    }

    const hourReadings = location.readings
      .filter((reading) => {
        const dt = new Date(reading.created);
        if (Number.isNaN(dt.getTime())) return false;
        const dateMatch = toDateKey(dt) === selectedDate;
        const hourMatch = String(dt.getHours()).padStart(2, "0") === selectedHour;
        return dateMatch && hourMatch;
      })
      .map((reading) => reading.reading)
      .filter((reading) => reading !== undefined && reading !== null);

    if (hourReadings.length === 0) {
      return null;
    }

    const avg = hourReadings.reduce((a, b) => a + b, 0) / hourReadings.length;
    return Math.round(avg * 10) / 10;
  };

  // Function to calculate aisle pairs and their temperature deltas
  const calculateAislePairs = (
    data: LocationTemperature[],
    selectedDate: string,
    selectedHour: string
  ): AislePair[] => {
    const pairs: Record<string, { cold: LocationTemperature | null; hot: LocationTemperature | null; coldLoc: string; hotLoc: string }> = {};

    // Parse location names and group by aisle pair
    // Format: "a12-1-up", "a12-2-down" where the number (1 or 2) indicates cold/hot aisle
    data.forEach((location) => {
      const parts = location.location.split("-");
      
      if (parts.length >= 2) {
        // Get the base name (everything except the last number and direction)
        // For "a12-1-up": parts = ["a12", "1", "up"]
        // For "b12-2-down": parts = ["b12", "2", "down"]
        
        const basePrefix = parts[0]; // e.g., "a12", "b12"
        const numberSuffix = parts[1]; // e.g., "1" or "2"
        
        // Create a pair key based on the prefix (e.g., "a12", "b12")
        const pairKey = basePrefix;
        
        if (!pairs[pairKey]) {
          pairs[pairKey] = {
            cold: null,
            hot: null,
            coldLoc: "",
            hotLoc: "",
          };
        }

        // Assign based on suffix: 1 = cold aisle, 2 = hot aisle
        if (numberSuffix === "1") {
          pairs[pairKey].cold = location;
          pairs[pairKey].coldLoc = location.location;
        } else if (numberSuffix === "2") {
          pairs[pairKey].hot = location;
          pairs[pairKey].hotLoc = location.location;
        }
      }
    });

    // Convert to array and calculate deltas
    return Object.entries(pairs)
      .map(([pairName, data]) => {
        const coldTemp = getDisplayTemperature(data.cold, selectedDate, selectedHour);
        const hotTemp = getDisplayTemperature(data.hot, selectedDate, selectedHour);
        const delta =
          coldTemp !== null && hotTemp !== null
            ? parseFloat((hotTemp - coldTemp).toFixed(2))
            : null;

        return {
          pairName,
          coldAisle: data.cold || null,
          hotAisle: data.hot || null,
          coldLocation: data.coldLoc,
          hotLocation: data.hotLoc,
          coldTemp,
          hotTemp,
          delta,
        };
      })
      .filter(pair => pair.coldAisle !== null && pair.hotAisle !== null) // Only show pairs with both aisles
      .sort((a, b) => a.pairName.localeCompare(b.pairName));
  };

  const getTemperatureData = async () => {
    try {
      setLoading(true);
      // Fetch both latest and historical data to sync with Overview
      const [latestResponse, historicalResponse] = await Promise.all([
        axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature/latest?site=odcdh3`
        ),
        axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature?site=odcdh3&timeline=7d`
        ),
      ]);

      if (latestResponse && latestResponse.status === 200 && historicalResponse && historicalResponse.status === 200) {
        const latestDataRaw = latestResponse.data;
        const historicalDataRaw = historicalResponse.data;
        const latestData: TemperatureReading[] = Array.isArray(latestDataRaw)
          ? latestDataRaw
          : Array.isArray(latestDataRaw?.data)
            ? latestDataRaw.data
            : [];
        const historicalData: TemperatureReading[] = Array.isArray(historicalDataRaw)
          ? historicalDataRaw
          : Array.isArray(historicalDataRaw?.data)
            ? historicalDataRaw.data
            : [];

        // Create a map of latest readings for quick lookup
        const latestMap = new Map();
        latestData.forEach((item: TemperatureReading) => {
          if (!latestMap.has(item.location) && asNumber(item.reading) !== null) {
            latestMap.set(item.location, item);
          }
        });

        // Group historical data by location
        const grouped = historicalData.reduce(
          (acc: Record<string, TemperatureReading[]>, item: TemperatureReading) => {
            const location = item.location || "Unknown";
            if (!acc[location]) {
              acc[location] = [];
            }
            acc[location].push(item);
            return acc;
          },
          {}
        );

        // Calculate statistics per location and sync with latest data
        const processed: LocationTemperature[] = Object.entries(grouped).map(
          ([location, readings]) => {
            const temps = (readings as TemperatureReading[])
              .map((r) => r.reading)
              .filter((t) => t !== undefined && t !== null);

            return {
              location,
              readings: readings as TemperatureReading[],
              latest: latestMap.get(location) || readings[0] || null,
              average:
                temps.length > 0
                  ? Math.round(
                      (temps.reduce((a, b) => a + b, 0) / temps.length) * 10
                    ) / 10
                  : 0,
              max: temps.length > 0 ? Math.max(...temps) : 0,
              min: temps.length > 0 ? Math.min(...temps) : 0,
            };
          }
        );

        setTemperatureData(processed);
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching temperature data:", err);
      setError("Failed to fetch temperature data");
    } finally {
      setLoading(false);
    }
  };

  // Recalculate aisle pairs whenever temperature data changes
  useEffect(() => {
    if (temperatureData.length > 0) {
      const pairs = calculateAislePairs(temperatureData, reviewDate, reviewHour);
      setAislePairs(pairs);
    }
  }, [temperatureData, reviewDate, reviewHour]);

  useEffect(() => {
    getTemperatureData();
    // Refresh every 60 seconds to sync with Overview section
    const interval = setInterval(getTemperatureData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return "text-red-600 dark:text-red-400"; // Critical
    if (temp >= 70) return "text-orange-600 dark:text-orange-400"; // Warning
    if (temp >= 50) return "text-yellow-600 dark:text-yellow-400"; // Caution
    return "text-green-600 dark:text-green-400"; // Normal
  };

  const getStatusBadge = (temp: number) => {
    if (temp >= 80)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          🔥 Critical
        </span>
      );
    if (temp >= 70)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
          ⚠️ Warning
        </span>
      );
    if (temp >= 50)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
          ⚡ Caution
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        ✅ Normal
      </span>
    );
  };

  const getDeltaColor = (delta: number | null) => {
    if (delta === null) return "text-gray-500 dark:text-gray-400";
    if (delta < 10) return "text-blue-700 dark:text-blue-400"; // Sub-Optimal Airflow Alignment (Below 10°C)
    if (delta <= 17) return "text-green-700 dark:text-green-400"; // Ideal Optimized State (11-17°C)
    if (delta <= 22) return "text-yellow-700 dark:text-yellow-400"; // High Density / Potential Air Starvation (18-22°C)
    return "text-red-700 dark:text-red-400"; // Critical Thermal Risk / Hot Spot (Above 22°C)
  };

  const getDeltaBadge = (delta: number | null) => {
    if (delta === null)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
          N/A
        </span>
      );
    if (delta < 10)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          🟦 Sub-Optimal Airflow Alignment
        </span>
      );
    if (delta <= 17)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          🟩 Ideal Optimized State
        </span>
      );
    if (delta <= 22)
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
          🟨 High Density / Potential Air Starvation
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
        🟥 Critical Thermal Risk / Hot Spot
      </span>
    );
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="text-left">
          <CardTitle className="text-red-600 dark:text-red-400">
            Error Loading Temperature Data
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">DH3 Temperature Monitoring</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateTimePanelOpen((prev) => !prev)}
              className="inline-flex items-center justify-center h-10 w-10 bg-background/40 dark:bg-secondary-dark/40 border border-slate-200 dark:border-[#424C5E] rounded-lg text-gray-700 dark:text-gray-200 hover:bg-background/60 dark:hover:bg-secondary-dark/60 transition-colors"
              aria-label="Open date and time selector"
              title="Select date and hour"
            >
              <Calendar size={16} />
            </button>

            {isDateTimePanelOpen && (
              <div className="absolute right-0 mt-2 z-20 w-56 p-3 bg-background dark:bg-secondary-dark border border-slate-200 dark:border-[#424C5E] rounded-lg shadow-lg space-y-2">
                <div className="space-y-1">
                  <label htmlFor="review-date" className="text-xs text-gray-600 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    id="review-date"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 text-gray-700 dark:text-gray-200 outline-none"
                    aria-label="Select review date"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="review-hour" className="text-xs text-gray-600 dark:text-gray-300">
                    Hour (24h)
                  </label>
                  <select
                    id="review-hour"
                    value={reviewHour}
                    onChange={(e) => setReviewHour(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 text-gray-700 dark:text-gray-200 outline-none appearance-none"
                    aria-label="Select review hour in 24-hour format"
                  >
                    <option value="" className="bg-background dark:bg-secondary-dark text-gray-700 dark:text-gray-200">HH</option>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const hour24 = String(hour).padStart(2, "0");
                      return (
                        <option
                          key={hour24}
                          value={hour24}
                          className="bg-background dark:bg-secondary-dark text-gray-700 dark:text-gray-200"
                        >
                          {hour24}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewDate("");
                      setReviewHour("");
                      setIsDateTimePanelOpen(false);
                    }}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 text-gray-700 dark:text-gray-200 hover:bg-background/60 dark:hover:bg-secondary-dark/60 transition-colors"
                    aria-label="Clear selected date and hour"
                  >
                    Clear date and hour
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={getTemperatureData}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && !temperatureData.length ? (
        <Card className="w-full">
          <CardHeader className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Loading temperature data...
            </p>
          </CardHeader>
        </Card>
      ) : temperatureData.length === 0 ? (
        <Card className="w-full">
          <CardHeader className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No temperature data available for Data Hall 3
            </p>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Aisle Delta Table Section */}
          {aislePairs.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Cold & Hot Aisle Temperature Delta</CardTitle>
                <CardDescription>
                  {reviewDate && reviewHour !== ""
                    ? `Average temperature for ${reviewDate} at ${reviewHour}:00 (°C)`
                    : "Temperature difference between hot and cold aisle containment (°C)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Aisle
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Cold Aisle
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          Cold Temp
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Hot Aisle
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          Hot Temp
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          Temp Delta
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aislePairs
                        .filter(
                          (pair) =>
                            pair.pairName !== "a09" && pair.pairName !== "b09"
                        )
                        .map((pair, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                            {pair.pairName}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {pair.coldLocation || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {typeof pair.coldTemp === "number" ? pair.coldTemp.toFixed(1) : "N/A"} °C
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {pair.hotLocation || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              {typeof pair.hotTemp === "number" ? pair.hotTemp.toFixed(1) : "N/A"} °C
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-bold text-lg ${getDeltaColor(
                                pair.delta
                              )}`}
                            >
                              {pair.delta !== null ? pair.delta.toFixed(2) : "N/A"} °C
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {getDeltaBadge(pair.delta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    Temperature Delta (ΔT) Status Legend
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Sub-Optimal Airflow Alignment */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🟦</span>
                        <span className="font-medium text-blue-800 dark:text-blue-300">Sub-Optimal Airflow Alignment</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold text-center">Below 10°C</p>
                    </div>

                    {/* Ideal Optimized State */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🟩</span>
                        <span className="font-medium text-green-800 dark:text-green-300">Ideal Optimized State</span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-400 font-semibold text-center">11°C to 17°C</p>
                    </div>

                    {/* High Density / Potential Air Starvation */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🟨</span>
                        <span className="font-medium text-yellow-800 dark:text-yellow-300">High Density / Potential Air Starvation</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold text-center">18°C to 22°C</p>
                    </div>

                    {/* Critical Thermal Risk / Hot Spot */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🟥</span>
                        <span className="font-medium text-red-800 dark:text-red-300">Critical Thermal Risk / Hot Spot</span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-400 font-semibold text-center">Above 22°C</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
