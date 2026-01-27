"use client";
import React, { useState } from 'react';
import { Play, Loader2, Calendar, TrendingUp, AlertCircle, ThermometerSun, ThermometerSnowflake, Activity } from 'lucide-react';
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

const MacrosPage = () => {
  const { theme } = useTheme();
  const [selectedMonths, setSelectedMonths] = useState<string>("3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [highlightedKey, setHighlightedKey] = useState<string>();

  // Calculate median
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

      // Fetch all available data first
      console.log('Fetching all temperature data for DH3...');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature?site=odcdh3`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allData = await response.json() || [];
      console.log(`Fetched ${allData.length} total readings`);

      // Group data by month
      for (let i = 0; i < months; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

        const monthName = monthStart.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });

        console.log(`Processing ${monthName}...`);

        // Filter data for this month
        const monthData = allData.filter((entry: any) => {
          const entryDate = new Date(entry.created);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });

        console.log(`  Found ${monthData.length} readings for ${monthName}`);

        // Separate hot and cold sensors
        const hotSensorData: any[] = [];
        const coldSensorData: any[] = [];

        monthData.forEach((entry: any) => {
          if (entry.location?.endsWith('-up')) {
            hotSensorData.push(entry);
          } else if (entry.location?.endsWith('-down')) {
            coldSensorData.push(entry);
          }
        });

        // Get unique sensor lists
        const hotSensors = [...new Set(hotSensorData.map(d => d.location))];
        const coldSensors = [...new Set(coldSensorData.map(d => d.location))];

        // Calculate averages per sensor
        const calculateSensorAverages = (data: any[]) => {
          const grouped: any = {};
          data.forEach((entry: any) => {
            const location = entry.location;
            if (!grouped[location]) {
              grouped[location] = { sum: 0, count: 0, readings: [] };
            }
            grouped[location].sum += entry.reading;
            grouped[location].count += 1;
            grouped[location].readings.push(entry.reading);
          });

          const averages: any = {};
          Object.keys(grouped).forEach(location => {
            averages[location] = grouped[location].sum / grouped[location].count;
          });
          return { grouped, averages };
        };

        const { averages: hotAverages } = calculateSensorAverages(hotSensorData);
        const { averages: coldAverages } = calculateSensorAverages(coldSensorData);

        // Calculate overall averages
        const hotAvgValues = Object.values(hotAverages) as number[];
        const coldAvgValues = Object.values(coldAverages) as number[];

        const overallHotAvg = hotAvgValues.length > 0 
          ? hotAvgValues.reduce((a, b) => a + b, 0) / hotAvgValues.length 
          : 0;
        const overallColdAvg = coldAvgValues.length > 0 
          ? coldAvgValues.reduce((a, b) => a + b, 0) / coldAvgValues.length 
          : 0;

        // Calculate peaks and bottoms from all readings
        const allHotReadings = hotSensorData.map(d => d.reading);
        const allColdReadings = coldSensorData.map(d => d.reading);

        const hotPeak = allHotReadings.length > 0 ? Math.max(...allHotReadings) : 0;
        const hotBottom = allHotReadings.length > 0 ? Math.min(...allHotReadings) : 0;
        const coldPeak = allColdReadings.length > 0 ? Math.max(...allColdReadings) : 0;
        const coldBottom = allColdReadings.length > 0 ? Math.min(...allColdReadings) : 0;

        // Calculate medians
        const hotMedian = calculateMedian(allHotReadings);
        const coldMedian = calculateMedian(allColdReadings);

        console.log(`  Hot sensors: ${hotSensors.length}, Cold sensors: ${coldSensors.length}`);

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

      setMonthlyData(results.reverse()); // Show oldest to newest
      console.log('Processed monthly data:', results);

    } catch (err) {
      console.error('Error in macro execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute macro');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (hotData: any[], coldData: any[]) => {
    // Group by timestamp and calculate average temperature at each point for both hot and cold
    const timeGroups: any = {};
    
    // Process hot sensor data
    hotData.forEach((entry) => {
      const timestamp = new Date(entry.created);
      const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).toISOString();
      
      if (!timeGroups[hourKey]) {
        timeGroups[hourKey] = { 
          created: hourKey, 
          hotSum: 0, 
          hotCount: 0,
          coldSum: 0,
          coldCount: 0
        };
      }
      timeGroups[hourKey].hotSum += entry.reading;
      timeGroups[hourKey].hotCount += 1;
    });

    // Process cold sensor data
    coldData.forEach((entry) => {
      const timestamp = new Date(entry.created);
      const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).toISOString();
      
      if (!timeGroups[hourKey]) {
        timeGroups[hourKey] = { 
          created: hourKey, 
          hotSum: 0, 
          hotCount: 0,
          coldSum: 0,
          coldCount: 0
        };
      }
      timeGroups[hourKey].coldSum += entry.reading;
      timeGroups[hourKey].coldCount += 1;
    });

    // Calculate averages
    const averaged = Object.values(timeGroups).map((group: any) => ({
      created: group.created,
      hotAvg: group.hotCount > 0 ? group.hotSum / group.hotCount : null,
      coldAvg: group.coldCount > 0 ? group.coldSum / group.coldCount : null
    }));

    // Sort by timestamp
    averaged.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

    return averaged;
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <div className="w-full max-w-7xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">Macros</h1>
          <p className="text-gray-600 dark:text-gray-400">
            One-time execution tasks for data analysis and reporting
          </p>
        </div>

        {/* DH3 Temperature Comparison Macro */}
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
            {/* Controls */}
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

              <Button 
                onClick={runDH3TempComparison}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Macro
                  </>
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Results */}
            {monthlyData.length > 0 && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthlyData.map((monthData, idx) => (
                    <Card key={idx} className="bg-white/50 dark:bg-gray-800/50">
                      <CardContent className="pt-6">
                        <h3 className="font-semibold text-lg mb-4">{monthData.month}</h3>
                        
                        {/* Hot Sensors */}
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <ThermometerSun className="h-4 w-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Hot Sensors (-up)</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Sensors:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.hotSensors.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.overallHotAvg.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Median:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.hotMedian.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Peak:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.hotPeak.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Bottom:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.hotBottom.toFixed(1)}°C</span>
                            </div>
                          </div>
                        </div>

                        {/* Cold Sensors */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <ThermometerSnowflake className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Cold Sensors (-down)</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Sensors:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.coldSensors.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.overallColdAvg.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Median:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.coldMedian.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Peak:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.coldPeak.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Bottom:</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{monthData.coldBottom.toFixed(1)}°C</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Combined Charts */}
                <div className="space-y-8">
                  {monthlyData.map((monthData, idx) => {
                    const chartData = processChartData(monthData.hotData, monthData.coldData);
                    
                    return (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-purple-600" />
                            {monthData.month} - Temperature Comparison
                          </CardTitle>
                          <CardDescription>
                            Hot sensors: {monthData.hotSensors.length} ({monthData.hotData.length} readings) | 
                            Cold sensors: {monthData.coldSensors.length} ({monthData.coldData.length} readings)
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {chartData.length > 0 ? (
                            <ChartContainer 
                              config={{
                                hotAvg: { label: "Hot Sensors (Up)" },
                                coldAvg: { label: "Cold Sensors (Down)" }
                              }} 
                              className="aspect-auto h-[400px] w-full"
                            >
                              <LineChart data={chartData}>
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
                                  tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    });
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
                                        new Date(value).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                        })
                                      }
                                      indicator="dot"
                                    />
                                  }
                                />
                                <Line
                                  dataKey="hotAvg"
                                  type="monotone"
                                  stroke="#FF6961"
                                  strokeWidth={highlightedKey === "hotAvg" ? 4 : 2}
                                  dot={false}
                                  opacity={!highlightedKey || highlightedKey === "hotAvg" ? 1 : 0.3}
                                  style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                                />
                                <Line
                                  dataKey="coldAvg"
                                  type="monotone"
                                  stroke="#00A6F4"
                                  strokeWidth={highlightedKey === "coldAvg" ? 4 : 2}
                                  dot={false}
                                  opacity={!highlightedKey || highlightedKey === "coldAvg" ? 1 : 0.3}
                                  style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                                />
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

            {/* Help Text */}
            {monthlyData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">
                  Select the number of months to analyze and click "Run Macro" to start
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