"use client";
import React, { useState } from 'react';
import {
  Play, Loader2, Calendar, TrendingUp, AlertCircle,
  ThermometerSun, ThermometerSnowflake, Activity,
  Zap, CheckCircle2, RefreshCw, Save, Database,
  ShieldCheck, BarChart2, AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface MissingMonthRecord {
  month: string;
  dh1: number;
  dh2: number;
  dh3: number;
  dh4: number;
  dh5: number;
  total: number;
  openDcFacilityPower: number;
  pue: number;
  auto_saved: boolean;
  saved_date: string;
  _reading_counts?: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────
// MacrosPage
// ─────────────────────────────────────────────────────────────
const MacrosPage = () => {
  const { theme } = useTheme();

  // ── DH3 Temperature Comparison state ──
  const [selectedMonths, setSelectedMonths] = useState<string>("3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [highlightedKey, setHighlightedKey] = useState<string>();

  // ── Recalculate Missing Months state ──
  const [recalcLookback, setRecalcLookback] = useState<string>("24");
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcSaving, setRecalcSaving] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [recalcResult, setRecalcResult] = useState<{
    missing_count: number;
    existing_count: number;
    missing_months: MissingMonthRecord[];
    message?: string;
  } | null>(null);
  const [savedMonths, setSavedMonths] = useState<string[]>([]);

  // ── Data Completeness state ──
  // Default: last 3 complete months
  const defaultEnd   = (() => { const d = new Date(); d.setDate(0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })();
  const defaultStart = (() => { const d = new Date(); d.setDate(0); d.setMonth(d.getMonth()-2); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })();
  const [compStart, setCompStart] = useState<string>(defaultStart);
  const [compEnd,   setCompEnd]   = useState<string>(defaultEnd);
  const [compLoading, setCompLoading] = useState(false);
  const [compSaving,  setCompSaving]  = useState(false);
  const [compError,   setCompError]   = useState<string | null>(null);
  const [compSaveMsg, setCompSaveMsg] = useState<string | null>(null);
  const [compResult, setCompResult] = useState<Array<{
    month: string;
    dh1: number; dh2: number; dh3: number; dh4: number; dh5: number;
    overall: number;
    daily?: Record<string, Array<{ date: string; pct: number; total_readings: number; expected_readings: number }>>;
  }> | null>(null);

  // ─────────────────────────────────────────────────────────────
  // DH3 Temperature helpers
  // ─────────────────────────────────────────────────────────────
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const runDH3TempComparison = async () => {
    setLoading(true);
    setError(null);
    setMonthlyData([]);

    try {
      const months = parseInt(selectedMonths);
      const now = new Date();
      const results: any[] = [];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature?site=odcdh3`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allData = await response.json();

      for (let i = 0; i < months; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthData = allData.filter((d: any) => {
          const date = new Date(d.created);
          return date >= monthDate && date <= monthEnd;
        });

        const hotSensors = [...new Set(
          monthData.filter((d: any) => d.name?.toLowerCase().includes('-up')).map((d: any) => d.name)
        )];
        const coldSensors = [...new Set(
          monthData.filter((d: any) => d.name?.toLowerCase().includes('-down')).map((d: any) => d.name)
        )];

        const hotSensorData = monthData.filter((d: any) => d.name?.toLowerCase().includes('-up'));
        const coldSensorData = monthData.filter((d: any) => d.name?.toLowerCase().includes('-down'));

        const hotAvgValues = hotSensorData.map((d: any) => d.reading).filter((v: number) => v > 0);
        const coldAvgValues = coldSensorData.map((d: any) => d.reading).filter((v: number) => v > 0);

        const overallHotAvg = hotAvgValues.length > 0 ? hotAvgValues.reduce((a: number, b: number) => a + b, 0) / hotAvgValues.length : 0;
        const overallColdAvg = coldAvgValues.length > 0 ? coldAvgValues.reduce((a: number, b: number) => a + b, 0) / coldAvgValues.length : 0;

        const allHotReadings = hotSensorData.map((d: any) => d.reading);
        const allColdReadings = coldSensorData.map((d: any) => d.reading);

        const hotPeak = allHotReadings.length > 0 ? Math.max(...allHotReadings) : 0;
        const hotBottom = allHotReadings.length > 0 ? Math.min(...allHotReadings) : 0;
        const coldPeak = allColdReadings.length > 0 ? Math.max(...allColdReadings) : 0;
        const coldBottom = allColdReadings.length > 0 ? Math.min(...allColdReadings) : 0;

        const hotMedian = calculateMedian(allHotReadings);
        const coldMedian = calculateMedian(allColdReadings);

        results.push({
          month: monthName,
          hotData: hotSensorData,
          coldData: coldSensorData,
          hotSensors,
          coldSensors,
          overallHotAvg,
          overallColdAvg,
          hotPeak,
          hotBottom,
          coldPeak,
          coldBottom,
          hotMedian,
          coldMedian,
          totalReadings: monthData.length
        });
      }

      setMonthlyData(results.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute macro');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (hotData: any[], coldData: any[]) => {
    const timeGroups: any = {};

    hotData.forEach((entry) => {
      const timestamp = new Date(entry.created);
      const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).toISOString();
      if (!timeGroups[hourKey]) timeGroups[hourKey] = { created: hourKey, hotSum: 0, hotCount: 0, coldSum: 0, coldCount: 0 };
      timeGroups[hourKey].hotSum += entry.reading;
      timeGroups[hourKey].hotCount += 1;
    });

    coldData.forEach((entry) => {
      const timestamp = new Date(entry.created);
      const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).toISOString();
      if (!timeGroups[hourKey]) timeGroups[hourKey] = { created: hourKey, hotSum: 0, hotCount: 0, coldSum: 0, coldCount: 0 };
      timeGroups[hourKey].coldSum += entry.reading;
      timeGroups[hourKey].coldCount += 1;
    });

    const averaged = Object.values(timeGroups).map((group: any) => ({
      created: group.created,
      hotAvg: group.hotCount > 0 ? group.hotSum / group.hotCount : null,
      coldAvg: group.coldCount > 0 ? group.coldSum / group.coldCount : null,
    }));

    averaged.sort((a: any, b: any) => new Date(a.created).getTime() - new Date(b.created).getTime());
    return averaged;
  };

  // ─────────────────────────────────────────────────────────────
  // Recalculate Missing Months handlers
  // ─────────────────────────────────────────────────────────────
  const runRecalculateMissing = async () => {
    setRecalcLoading(true);
    setRecalcError(null);
    setRecalcResult(null);
    setSavedMonths([]);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/monthly-power-data/recalculate-missing?months=${recalcLookback}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Unknown error");
      setRecalcResult(json);
    } catch (err) {
      setRecalcError(err instanceof Error ? err.message : "Failed to run macro");
    } finally {
      setRecalcLoading(false);
    }
  };

  const saveRecalculated = async () => {
    if (!recalcResult || recalcResult.missing_months.length === 0) return;
    setRecalcSaving(true);
    setRecalcError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/monthly-power-data/recalculate-missing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ months: recalcResult.missing_months }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Save failed");
      setSavedMonths(json.added_months || []);
      // Clear the result so the user sees the success banner
      setRecalcResult(prev => prev ? { ...prev, missing_months: [] } : null);
    } catch (err) {
      setRecalcError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setRecalcSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Data Completeness handlers
  // ─────────────────────────────────────────────────────────────
  const runCompleteness = async () => {
    setCompLoading(true);
    setCompError(null);
    setCompResult(null);
    setCompSaveMsg(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/monthly-power-data/data-completeness` +
        `?start_date=${compStart}&end_date=${compEnd}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Unknown error");
      setCompResult(json.monthly_completeness);
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "Failed to run completeness check");
    } finally {
      setCompLoading(false);
    }
  };

  const saveCompleteness = async () => {
    if (!compResult || compResult.length === 0) return;
    setCompSaving(true);
    setCompError(null);
    setCompSaveMsg(null);

    try {
      // Build map: { "Month YYYY": { dh1, dh2, dh3, dh4, dh5, overall } }
      const completenessMap: Record<string, object> = {};
      compResult.forEach(row => {
        completenessMap[row.month] = {
          dh1: row.dh1, dh2: row.dh2, dh3: row.dh3,
          dh4: row.dh4, dh5: row.dh5, overall: row.overall,
        };
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/monthly-power-data/data-completeness/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completeness: completenessMap }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Save failed");
      const total = (json.updated?.length ?? 0) + (json.created?.length ?? 0);
      setCompSaveMsg(`Saved completeness for ${total} month${total !== 1 ? 's' : ''}.`);
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setCompSaving(false);
    }
  };

  /** Map 0-100 pct → Tailwind bg colour class */
  const pctBg = (pct: number) => {
    if (pct >= 95) return "bg-green-500";
    if (pct >= 85) return "bg-yellow-400";
    if (pct >= 60) return "bg-orange-400";
    return "bg-red-500";
  };

  const pctText = (pct: number) => {
    if (pct >= 95) return "text-green-700 dark:text-green-300";
    if (pct >= 85) return "text-yellow-700 dark:text-yellow-300";
    if (pct >= 60) return "text-orange-700 dark:text-orange-300";
    return "text-red-700 dark:text-red-300";
  };

  const PctCell = ({ val }: { val: number }) => (
    <td className="px-3 py-2.5 text-center">
      <span className={`inline-flex items-center justify-center w-16 h-7 rounded-full text-xs font-bold text-white ${pctBg(val)}`}>
        {val > 0 ? `${val}%` : '—'}
      </span>
    </td>
  );

  const formatKwh = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <div className="w-full max-w-7xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">Macros</h1>
          <p className="text-gray-600 dark:text-gray-400">
            One-time execution tasks for data analysis and reporting
          </p>
        </div>

        {/* ── Macro 1: DH3 Temperature Comparison ── */}
        <Card className="w-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <TrendingUp className="h-5 w-5" />
              DH3 Temperature Comparison
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400">
              Compare hot (up) and cold (down) sensor temperatures across multiple months for Data Hall 3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select value={selectedMonths} onValueChange={setSelectedMonths}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Number of Months</SelectLabel>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="2">2 Months</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runDH3TempComparison} disabled={loading} className="flex items-center gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Running...</> : <><Play className="h-4 w-4" />Run Macro</>}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {monthlyData.length > 0 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthlyData.map((monthData, idx) => (
                    <Card key={idx} className="bg-white/50 dark:bg-gray-800/50">
                      <CardContent className="pt-6">
                        <h3 className="font-semibold text-lg mb-4">{monthData.month}</h3>
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <ThermometerSun className="h-4 w-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Hot Sensors (-up)</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Sensors:</span><span className="font-semibold">{monthData.hotSensors.length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Avg:</span><span className="font-semibold">{monthData.overallHotAvg.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Median:</span><span className="font-semibold">{monthData.hotMedian.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Peak:</span><span className="font-semibold">{monthData.hotPeak.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Bottom:</span><span className="font-semibold">{monthData.hotBottom.toFixed(1)}°C</span></div>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <ThermometerSnowflake className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Cold Sensors (-down)</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Sensors:</span><span className="font-semibold">{monthData.coldSensors.length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Avg:</span><span className="font-semibold">{monthData.overallColdAvg.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Median:</span><span className="font-semibold">{monthData.coldMedian.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Peak:</span><span className="font-semibold">{monthData.coldPeak.toFixed(1)}°C</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Bottom:</span><span className="font-semibold">{monthData.coldBottom.toFixed(1)}°C</span></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts per month */}
                <div className="space-y-6">
                  {monthlyData.map((monthData, idx) => {
                    const chartData = processChartData(monthData.hotData, monthData.coldData);
                    const chartConfig = {
                      hotAvg: { label: "Hot Avg (°C)", color: "#FF6961" },
                      coldAvg: { label: "Cold Avg (°C)", color: "#00A6F4" },
                    };
                    return (
                      <Card key={idx} className="bg-white/50 dark:bg-gray-800/50">
                        <CardHeader>
                          <CardTitle className="text-base">{monthData.month} — Hourly Averages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {chartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-64 w-full">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#424C5E" : "#D9DEE3"} />
                                <XAxis
                                  dataKey="created"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  minTickGap={32}
                                  tick={{ fill: theme === "dark" ? "#CBD5E1" : "#334155" }}
                                  tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                  }}
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
                                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" })
                                      }
                                      indicator="dot"
                                    />
                                  }
                                />
                                <Line dataKey="hotAvg" type="monotone" stroke="#FF6961" strokeWidth={highlightedKey === "hotAvg" ? 4 : 2} dot={false} opacity={!highlightedKey || highlightedKey === "hotAvg" ? 1 : 0.3} style={{ transition: "opacity 0.2s, stroke-width 0.2s" }} />
                                <Line dataKey="coldAvg" type="monotone" stroke="#00A6F4" strokeWidth={highlightedKey === "coldAvg" ? 4 : 2} dot={false} opacity={!highlightedKey || highlightedKey === "coldAvg" ? 1 : 0.3} style={{ transition: "opacity 0.2s, stroke-width 0.2s" }} />
                                <ChartLegend content={<ChartLegendContent onLegendHover={setHighlightedKey} highlightedKey={highlightedKey} />} />
                              </LineChart>
                            </ChartContainer>
                          ) : (
                            <p className="text-center text-gray-500 py-8">No data available for this month</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {monthlyData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Select the number of months to analyze and click "Run Macro" to start</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Macro 2: Recalculate Missing Monthly Power History ── */}
        <Card className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Database className="h-5 w-5" />
              Recalculate Missing Monthly Power History
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-400">
              Detects months absent from the saved history and recalculates their power totals from raw sensor
              readings. Previews results before writing anything.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select value={recalcLookback} onValueChange={setRecalcLookback}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Lookback window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>How far back to scan</SelectLabel>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                      <SelectItem value="24">24 Months</SelectItem>
                      <SelectItem value="36">36 Months</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={runRecalculateMissing}
                disabled={recalcLoading || recalcSaving}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {recalcLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                  : <><RefreshCw className="h-4 w-4" />Scan & Preview</>}
              </Button>

              {recalcResult && recalcResult.missing_months.length > 0 && (
                <Button
                  onClick={saveRecalculated}
                  disabled={recalcSaving || recalcLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {recalcSaving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                    : <><Save className="h-4 w-4" />Save {recalcResult.missing_months.length} Month{recalcResult.missing_months.length !== 1 ? 's' : ''}</>}
                </Button>
              )}
            </div>

            {/* Error */}
            {recalcError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{recalcError}</p>
              </div>
            )}

            {/* Success banner */}
            {savedMonths.length > 0 && (
              <div className="flex items-start gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Successfully saved {savedMonths.length} month{savedMonths.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {savedMonths.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* All-good banner */}
            {recalcResult && recalcResult.missing_count === 0 && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  {recalcResult.message || "History is complete — no missing months found."}
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    ({recalcResult.existing_count} months on record)
                  </span>
                </p>
              </div>
            )}

            {/* Preview table */}
            {recalcResult && recalcResult.missing_months.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Found {recalcResult.missing_count} missing month{recalcResult.missing_count !== 1 ? 's' : ''} —
                    preview below. Click <span className="font-bold">Save</span> to persist.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-100/60 dark:bg-amber-900/30">
                      <tr>
                        {['Month', 'DH1 (kWh)', 'DH2 (kWh)', 'DH3 (kWh)', 'DH4 (kWh)', 'DH5 (kWh)', 'Total (kWh)'].map(h => (
                          <th key={h} className="px-4 py-2 text-left font-semibold text-amber-800 dark:text-amber-200 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recalcResult.missing_months.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-amber-100 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.month}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatKwh(row.dh1)}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatKwh(row.dh2)}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatKwh(row.dh3)}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatKwh(row.dh4)}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatKwh(row.dh5)}</td>
                          <td className="px-4 py-2 font-semibold text-amber-700 dark:text-amber-300">{formatKwh(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Note: <span className="font-medium">Facility Power</span> and <span className="font-medium">PUE</span> will be 0 until filled in manually on the dashboard.
                </p>
              </div>
            )}

            {/* Help text */}
            {!recalcResult && !recalcLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">
                  Choose how many months back to scan, then click "Scan &amp; Preview" to find gaps in the history.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Macro 3: Data Completeness Check ── */}
        <Card className="w-full bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <ShieldCheck className="h-5 w-5" />
              Data Completeness Check
            </CardTitle>
            <CardDescription className="text-violet-600 dark:text-violet-400">
              Verifies that power readings exist for every expected 10-minute interval per site,
              aggregated per calendar month. Results can be saved into the Monthly Power History.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Start month */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                  From
                </label>
                <input
                  type="month"
                  value={compStart}
                  max={compEnd}
                  onChange={e => setCompStart(e.target.value)}
                  className="h-9 rounded-md border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* End month */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                  To
                </label>
                <input
                  type="month"
                  value={compEnd}
                  min={compStart}
                  max={new Date().toISOString().slice(0,7)}
                  onChange={e => setCompEnd(e.target.value)}
                  className="h-9 rounded-md border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <Button
                onClick={runCompleteness}
                disabled={compLoading || !compStart || !compEnd}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {compLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Analysing...</>
                  : <><BarChart2 className="h-4 w-4" />Run Check</>}
              </Button>

              {compResult && compResult.length > 0 && (
                <Button
                  onClick={saveCompleteness}
                  disabled={compSaving || compLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {compSaving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                    : <><Save className="h-4 w-4" />Save to Monthly Data</>}
                </Button>
              )}
            </div>

            {/* Error */}
            {compError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{compError}</p>
              </div>
            )}

            {/* Save success */}
            {compSaveMsg && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">{compSaveMsg}</p>
              </div>
            )}

            {/* Results table: rows = months, cols = DH1-5 + Overall */}
            {compResult && compResult.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  Completeness by month — {compResult.length} month{compResult.length !== 1 ? 's' : ''}
                </p>

                <div className="overflow-x-auto rounded-lg border border-violet-200 dark:border-violet-800">
                  <table className="w-full text-sm">
                    <thead className="bg-violet-100/60 dark:bg-violet-900/30">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-violet-800 dark:text-violet-200">Month</th>
                        {["DH1","DH2","DH3","DH4","DH5","Overall"].map(h => (
                          <th key={h} className="px-3 py-3 text-center font-semibold text-violet-800 dark:text-violet-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compResult.map((row, i) => (
                        <tr key={i} className="border-t border-violet-100 dark:border-violet-900 hover:bg-violet-50/40 dark:hover:bg-violet-900/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.month}</td>
                          <PctCell val={row.dh1} />
                          <PctCell val={row.dh2} />
                          <PctCell val={row.dh3} />
                          <PctCell val={row.dh4} />
                          <PctCell val={row.dh5} />
                          {/* Overall with wider pill */}
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center justify-center w-20 h-7 rounded-full text-xs font-bold text-white ${pctBg(row.overall)}`}>
                              {row.overall > 0 ? `${row.overall}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                  {[
                    { label: "≥95% healthy",      cls: "bg-green-500" },
                    { label: "85–94% minor gaps", cls: "bg-yellow-400" },
                    { label: "60–84% degraded",   cls: "bg-orange-400" },
                    { label: "<60% critical",      cls: "bg-red-500"   },
                  ].map(l => (
                    <span key={l.label} className="flex items-center gap-1">
                      <span className={`inline-block w-3 h-3 rounded-full ${l.cls}`} />
                      {l.label}
                    </span>
                  ))}
                </div>

                {/* ── Day-by-day heatmap (one grid per DH per month) ── */}
                {compResult.some(row => row.daily) && (
                  <div className="space-y-6 pt-2 border-t border-violet-100 dark:border-violet-900">
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                      Day-by-day breakdown
                    </p>

                    {(["dh1","dh2","dh3","dh4","dh5"] as const).map(col => {
                      // Collect all daily records for this DH across all months
                      const allDays = compResult.flatMap(row =>
                        (row.daily?.[col] ?? []).map(d => ({ ...d, month: row.month }))
                      );
                      if (allDays.length === 0) return null;

                      // Group by month label
                      const byMonth: Record<string, typeof allDays> = {};
                      allDays.forEach(d => {
                        if (!byMonth[d.month]) byMonth[d.month] = [];
                        byMonth[d.month].push(d);
                      });

                      return (
                        <div key={col}>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 mb-3">
                            {col.replace("dh", "Data Hall ")}
                          </h4>
                          {Object.entries(byMonth).map(([month, days]) => (
                            <div key={month} className="mb-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{month}</p>
                              <div className="flex flex-wrap gap-1">
                                {days.map(d => {
                                  const dayNum = new Date(d.date + "T00:00:00").getDate();
                                  return (
                                    <div
                                      key={d.date}
                                      title={`${d.date}\n${d.pct}% complete\n${d.total_readings.toLocaleString()} / ${d.expected_readings.toLocaleString()} readings`}
                                      className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white cursor-default select-none ${pctBg(d.pct)}`}
                                      style={{ opacity: d.pct === 0 ? 0.4 : 1 }}
                                    >
                                      {dayNum}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Help text */}
            {!compResult && !compLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">
                  Pick a date range and click "Run Check" to analyse reading completeness by month.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </main>
  );
};

export default MacrosPage;