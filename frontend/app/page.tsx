"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";
import { Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { MonthlyPowerTable } from "@/components/monthly-power-table";
import { MonthlyPowerProvider, useMonthlyPower } from "@/contexts/MonthlyPowerContext";
import PowerCapacityCard from "@/components/power-capacity-card";

const chartColors = [
  "#a78bfa",
  "#f472b6",
  "#00A6F4",
  "#9AE600",
  "#FFB347",
  "#FF6961",
  "#77DD77",
  "#AEC6CF",
  "#CFCFC4",
  "#B39EB5",
];

const getTemperatureColor = (location: string) => {
  if (location.includes("-up")) return "#FF6961";
  if (location.includes("-down")) return "#00A6F4";
  return chartColors[0];
};

// Optimized Monthly Power Usage Card Component - now uses context
// Optimized Monthly Power Usage Card Component - now uses context
const MonthlyPowerCard = () => {
  const { data: monthlyData } = useMonthlyPower();

  const formatPowerValue = (wattHours: number) => {
    // Convert Watt-hours to more readable units
    if (wattHours >= 1000000000) {
      return `${(wattHours / 1000000000).toFixed(2)} GWh`;
    } else if (wattHours >= 1000000) {
      return `${(wattHours / 1000000).toFixed(2)} MWh`;
    } else if (wattHours >= 1000) {
      return `${(wattHours / 1000).toFixed(2)} kWh`;
    }
    return `${wattHours.toFixed(2)} Wh`;
  };

  const getSiteDisplayName = (site: string) => {
    const siteMap: Record<string, string> = {
      odcdh1: "Data Hall 1",
      odcdh2: "Data Hall 2", 
      odcdh3: "Data Hall 3",
      odcdh5: "Data Hall 5",
    };
    return siteMap[site] || site.toUpperCase();
  };

  if (monthlyData.loading) {
    return (
      <Card className="w-full mb-8 relative overflow-hidden">
        <div className="absolute inset-0 h-full w-full -translate-x-full animate-[shimmer_2s_infinite] overflow-hidden bg-gradient-to-r from-transparent via-slate-200/30 to-transparent dark:via-slate-200/10" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Monthly Power Usage
          </CardTitle>
          <CardDescription>Loading monthly summary (shared data)...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Zap className="h-5 w-5" />
          Monthly Power Usage - {monthlyData.monthInfo?.current_month || "Current Month"}
        </CardTitle>
        <CardDescription className="text-blue-600 dark:text-blue-400">
          Pre-calculated energy totals (shared data source)
          {monthlyData.error && (
            <div className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{monthlyData.error}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Overall Summary - Removed comparison section */}
        <div className="flex items-center justify-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="space-y-1 text-center">
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
              {formatPowerValue(monthlyData.totalPower)}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Total energy consumed this month
            </p>
          </div>
        </div>

        {/* Individual Data Halls Breakdown */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            Individual Data Hall Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["odcdh1", "odcdh2", "odcdh3", "odcdh5"].map((site) => {
              const data = monthlyData.siteBreakdown[site];
              if (!data) return null;
              
              return (
                <div
                  key={site}
                  className="p-4 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-blue-100 dark:border-blue-800/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      {getSiteDisplayName(site)}
                    </h4>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      {formatPowerValue(data.current)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Current month total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance indicator */}
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded">
          ⚡ Using shared context - single API call for all components (~1KB vs ~100MB)
        </div>
      </CardContent>
    </Card>
  );
};

// --------------- PowerChart (single site) with improved error handling -----------------
const PowerChart = ({ site }: { site: string }) => {
  const { theme } = useTheme();

  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [highlightedKey, setHighlightedKey] = useState<string>();
  const [error, setError] = useState<string>();

  const [selectedRange, setSelectedRange] = useState<"24h" | "7d" | "1mnth">(
    "24h"
  );

  const fetchPower = async () => {
    try {
      setError(undefined);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/power?site=${site}&timeline=${selectedRange}`
      );
      setData(response.data || []);
    } catch (e) {
      console.error(e);
      setError(`Failed to load power data for ${site.toUpperCase()}`);
    }
  };

  // group data
  useEffect(() => {
    const grouped: any[] = [];
    const cfg: any = {};

    data.forEach((entry) => {
      let gp = grouped.find((g) => g.created === entry.created);
      if (!gp) {
        gp = { created: entry.created };
        grouped.push(gp);
      }
      gp[entry.location] = entry.reading;
      if (!cfg[entry.location]) {
        cfg[entry.location] = { label: entry.location };
      }
    });
    setFiltered(grouped);
    setConfig(cfg);
  }, [data]);

  useEffect(() => {
    fetchPower();
    const interval = setInterval(fetchPower, 60000);
    return () => clearInterval(interval);
  }, [selectedRange]);

  return (
    <Card className="w-full relative overflow-hidden min-h-64 mb-6">
      <CardHeader className="text-left">
        <CardTitle>Combined Power Overview ({site.toUpperCase()})</CardTitle>
        <CardDescription>
          Power data for {site.toUpperCase()} 
          {selectedRange === "1mnth" && " (using batched queries for large date range)"}
          {error && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{error}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        {error ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto" />
              <p>Unable to load power data</p>
              <button 
                onClick={fetchPower}
                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
            <LineChart data={filtered}>
              <CartesianGrid
                vertical={false}
                stroke={theme === "dark" ? "#424C5E" : "#D9DEE3"}
              />
              <XAxis
                dataKey="created"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{
                  fill: theme === "dark" ? "#CBD5E1" : "#334155",
                }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "2-digit",
                    day: "numeric",
                    hour12: false,
                    timeZone: "UTC",
                  })
                }
              />
              <YAxis
                width={35}
                axisLine={{ stroke: theme === "dark" ? "#424C5E" : "#D9DEE3" }}
                tickLine={{ stroke: theme === "dark" ? "#424C5E" : "#D9DEE3" }}
                tick={{ fill: theme === "dark" ? "#CBD5E1" : "#334155" }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                        hour12: false,
                        timeZone: "UTC",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              {Object.keys(config).map((location, index) => {
                const isHighlighted =
                  !highlightedKey || highlightedKey === location;
                return (
                  <Line
                    key={location}
                    dataKey={location}
                    type="monotone"
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={highlightedKey === location ? 4 : 2}
                    dot={false}
                    opacity={isHighlighted ? 1 : 0.3}
                    style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                  />
                );
              })}
              <ChartLegend
                content={
                  <ChartLegendContent
                    onLegendHover={setHighlightedKey}
                    highlightedKey={highlightedKey}
                  />
                }
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

// --------------- TemperatureChart (single site) with improved error handling -----------------
const TemperatureChart = ({ site }: { site: string }) => {
  const { theme } = useTheme();

  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [highlightedKey, setHighlightedKey] = useState<string>();
  const [error, setError] = useState<string>();

  const [selectedRange, setSelectedRange] = useState<"24h" | "7d" | "1mnth">(
    "24h"
  );

  const fetchTemp = async () => {
    try {
      setError(undefined);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature?site=${site}&timeline=${selectedRange}`
      );
      setData(response.data || []);
    } catch (e) {
      console.error(e);
      setError(`Failed to load temperature data for ${site.toUpperCase()}`);
    }
  };

  useEffect(() => {
    const grouped: any[] = [];
    const cfg: any = {};
  
    const normalizeTime = (date: string) => {
      const d = new Date(date);
      d.setSeconds(0, 0);
      return d.toISOString();
    };
  
    data.forEach((entry) => {
      const created = normalizeTime(entry.created);
  
      let gp = grouped.find((g) => g.created === created);
      if (!gp) {
        gp = { created };
        grouped.push(gp);
      }
  
      gp[entry.location] = entry.reading;
      if (!cfg[entry.location]) {
        cfg[entry.location] = { label: entry.location };
      }
    });
  
    grouped.sort(
      (a, b) =>
        new Date(a.created).getTime() - new Date(b.created).getTime()
    );
  
    const averaged = grouped.map((point) => {
      const windowStart =
        new Date(point.created).getTime() - 30 * 60 * 1000;
  
      const windowPoints = grouped.filter(
        (p) =>
          new Date(p.created).getTime() >= windowStart &&
          new Date(p.created).getTime() <= new Date(point.created).getTime()
      );
  
      const averagedPoint: any = { created: point.created };
  
      Object.keys(cfg).forEach((location) => {
        const vals = windowPoints
          .map((p) => p[location])
          .filter((v) => v !== undefined);
  
        if (vals.length) {
          averagedPoint[location] =
            vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      });
  
      return averagedPoint;
    });
  
    setFiltered(averaged);
    setConfig(cfg);
  }, [data]);  
  

  useEffect(() => {
    fetchTemp();
    const interval = setInterval(fetchTemp, 60000);
    return () => clearInterval(interval);
  }, [selectedRange]);

  return (
    <Card className="w-full relative overflow-hidden min-h-64">
      <CardHeader className="text-left">
        <CardTitle>
          Combined Temperature Overview ({site.toUpperCase()})
        </CardTitle>
        <CardDescription>
          Temperature data for {site.toUpperCase()} (30-min moving average)
          {error && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{error}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        {error ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto" />
              <p>Unable to load temperature data</p>
              <button 
                onClick={fetchTemp}
                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
            <LineChart data={filtered}>
              <CartesianGrid
                vertical={false}
                stroke={theme === "dark" ? "#424C5E" : "#D9DEE3"}
              />
              <XAxis
                dataKey="created"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{
                  fill: theme === "dark" ? "#CBD5E1" : "#334155",
                }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "2-digit",
                    day: "numeric",
                    hour12: false,
                    timeZone: "UTC",
                  })
                }
              />
              <YAxis
                width={35}
                axisLine={{ stroke: theme === "dark" ? "#424C5E" : "#D9DEE3" }}
                tickLine={{ stroke: theme === "dark" ? "#424C5E" : "#D9DEE3" }}
                tick={{ fill: theme === "dark" ? "#CBD5E1" : "#334155" }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                        hour12: false,
                        timeZone: "UTC",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              {Object.keys(config).map((location, index) => {
                const isHighlighted =
                  !highlightedKey || highlightedKey === location;
                return (
                  <Line
                    key={location}
                    dataKey={location}
                    type="monotone"
                    stroke={getTemperatureColor(location)}
                    strokeWidth={highlightedKey === location ? 4 : 2}
                    dot={false}
                    opacity={isHighlighted ? 1 : 0.3}
                    style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                  />
                );
              })}
              <ChartLegend
                content={
                  <ChartLegendContent
                    onLegendHover={setHighlightedKey}
                    highlightedKey={highlightedKey}
                  />
                }
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

// Content component that uses the context
const PageContent = () => {
  const sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh5"];

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <h1 className="text-4xl font-bold mb-4">Overall View</h1>

      <div className="w-full max-w-5xl space-y-16">
        {/* Monthly Power Usage Card - uses shared context */}
        <MonthlyPowerCard />
        
        {/* Monthly Power Data Table - uses shared context */} 
        <MonthlyPowerTable />
        
        <PowerCapacityCard />
        
        {sites.map((site) => (
          <div key={site}>
            <PowerChart site={site} />
            <TemperatureChart site={site} />
          </div>
        ))}
      </div>
    </main>
  );
};

// Main Page: wrap content in MonthlyPowerProvider
export default function Home() {
  return (
    <MonthlyPowerProvider>
      <PageContent />
    </MonthlyPowerProvider>
  );
}