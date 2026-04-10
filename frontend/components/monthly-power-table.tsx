// Monthly Power Table Component - Uses Shared Context
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Edit3, Check, X, AlertTriangle, RefreshCw, History, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMonthlyPower } from "@/contexts/MonthlyPowerContext";

interface CompletenessData {
  dh1: number;
  dh2: number;
  dh3: number;
  dh4: number;
  dh5: number;
  overall: number;
}

interface MonthlyData {
  month: string;
  dh1: number;
  dh2: number;
  dh3: number;
  dh4: number;
  dh5: number;
  total: number;
  openDcFacilityPower: number;
  pue: number;
  completeness?: CompletenessData;
  auto_saved?: boolean;
  saved_date?: string;
  last_updated?: string;
}

// ── Completeness badge helper ──────────────────────────────────────────────
const pctBg = (pct: number) => {
  if (pct >= 95) return "bg-green-500";
  if (pct >= 85) return "bg-yellow-400";
  if (pct >= 60) return "bg-orange-400";
  return "bg-red-500";
};

const CompletenessBadge = ({ data }: { data?: CompletenessData }) => {
  if (!data || data.overall === undefined) {
    return <span className="text-xs text-gray-400 dark:text-gray-600 italic">—</span>;
  }

  const pct = data.overall;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Overall pill */}
      <span
        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${pctBg(pct)}`}
        title={
          `DH1: ${data.dh1}%\nDH2: ${data.dh2}%\nDH3: ${data.dh3}%\nDH4: ${data.dh4}%\nDH5: ${data.dh5}%`
        }
      >
        {pct}%
      </span>
      {/* Mini per-site bars */}
      <div className="flex gap-0.5" title="DH1 · DH2 · DH3 · DH4 · DH5">
        {[data.dh1, data.dh2, data.dh3, data.dh4, data.dh5].map((v, i) => (
          <div
            key={i}
            className={`w-2 rounded-sm ${pctBg(v)}`}
            style={{ height: `${Math.max(4, Math.round(v / 100 * 14))}px` }}
            title={`DH${i + 1}: ${v}%`}
          />
        ))}
      </div>
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────

const MonthlyPowerTable = () => {
  const { data: contextData, refreshData } = useMonthlyPower();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [historyData, setHistoryData] = useState<MonthlyData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Format month for display
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get current month and previous months
  const getMonthsToDisplay = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(formatMonth(date));
    }
    return months;
  };

  // Fetch historical data from JSON file
  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/monthly-power-data`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  };

  // Get current month totals from shared context data
  const getCurrentMonthTotals = () => {
    if (!contextData || contextData.loading || !contextData.siteBreakdown) return {};
    const monthlyTotals: Record<string, number> = {};
    const columnMap: Record<string, string> = {
      odcdh1: 'dh1', odcdh2: 'dh2', odcdh3: 'dh3', odcdh4: 'dh4', odcdh5: 'dh5'
    };
    Object.entries(contextData.siteBreakdown).forEach(([site, siteData]) => {
      if (columnMap[site]) monthlyTotals[columnMap[site]] = (siteData.current / 1000) || 0;
    });
    return monthlyTotals;
  };

  // Load all data using shared context for current month
  const loadData = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const currentMonth    = formatMonth(new Date());
      const monthsToDisplay = getMonthsToDisplay();
      const historicalData  = await fetchHistoricalData();
      const tableData: MonthlyData[] = [];

      for (const month of monthsToDisplay) {
        const savedData = historicalData.find((item: MonthlyData) => item.month === month);

        if (month === currentMonth) {
          // Current month: ALWAYS use live context data for power figures.
          // A saved record may exist (e.g. a skeleton created by the completeness save),
          // but its power totals will be zero — so we ignore them and only carry over
          // non-power fields (facility power, PUE, completeness) if they were set.
          const currentMonthTotals = getCurrentMonthTotals();
          const total = Object.values(currentMonthTotals).reduce((sum: number, val) => sum + (val as number), 0);
          tableData.push({
            month,
            dh1: currentMonthTotals.dh1 || 0,
            dh2: currentMonthTotals.dh2 || 0,
            dh3: currentMonthTotals.dh3 || 0,
            dh4: currentMonthTotals.dh4 || 0,
            dh5: currentMonthTotals.dh5 || 0,
            total,
            // Preserve any manually-entered facility power / PUE from the saved record
            openDcFacilityPower: savedData?.openDcFacilityPower ?? 0,
            pue: savedData?.openDcFacilityPower && total > 0
              ? savedData.openDcFacilityPower / total
              : 0,
            completeness: savedData?.completeness,
            auto_saved: savedData?.auto_saved,
            saved_date: savedData?.saved_date,
            last_updated: savedData?.last_updated,
          });
        } else if (savedData) {
          tableData.push(savedData);
        } else {
          tableData.push({
            month, dh1: 0, dh2: 0, dh3: 0, dh4: 0, dh5: 0,
            total: 0, openDcFacilityPower: 0, pue: 0,
          });
        }
      }
      setData(tableData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load monthly power data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Load full history for the modal — excludes the current (incomplete) month
  const loadHistoryData = async () => {
    setHistoryLoading(true);
    try {
      const historicalData = await fetchHistoricalData();
      const currentMonth = formatMonth(new Date());
      setHistoryData(historicalData.filter((item: MonthlyData) => item.month !== currentMonth));
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Download history as CSV
  const downloadHistoryCSV = () => {
    if (historyData.length === 0) return;
    const headers = [
      'Month', 'DH1 (kWh)', 'DH2 (kWh)', 'DH3 (kWh)', 'DH4 (kWh)', 'DH5 (kWh)',
      'Total (kWh)', 'Facility Power (kWh)', 'PUE',
      'Completeness Overall (%)', 'DH1 (%)', 'DH2 (%)', 'DH3 (%)', 'DH4 (%)', 'DH5 (%)',
      'Auto Saved', 'Saved Date'
    ];
    const rows = historyData.map(row => [
      row.month,
      row.dh1.toFixed(2), row.dh2.toFixed(2), row.dh3.toFixed(2),
      row.dh4.toFixed(2), row.dh5.toFixed(2), row.total.toFixed(2),
      row.openDcFacilityPower.toFixed(2), row.pue.toFixed(2),
      row.completeness?.overall?.toFixed(1) ?? '',
      row.completeness?.dh1?.toFixed(1) ?? '',
      row.completeness?.dh2?.toFixed(1) ?? '',
      row.completeness?.dh3?.toFixed(1) ?? '',
      row.completeness?.dh4?.toFixed(1) ?? '',
      row.completeness?.dh5?.toFixed(1) ?? '',
      row.auto_saved ? 'Yes' : 'No',
      row.saved_date || row.last_updated || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `monthly_power_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = async () => {
    await refreshData();
    await loadData();
  };

  const saveData = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/monthly-power-data`, { data });
      alert("Monthly power data saved successfully");
    } catch (error) {
      console.error('Error saving data:', error);
      alert("Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (month: string, currentValue: number) => {
    setEditingMonth(month);
    setEditValue(currentValue.toString());
  };

  const saveEdit = () => {
    if (!editingMonth) return;
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) { alert("Please enter a valid positive number"); return; }
    setData(prevData =>
      prevData.map(row => {
        if (row.month === editingMonth) {
          const updatedRow = { ...row, openDcFacilityPower: numValue };
          updatedRow.pue = updatedRow.total > 0 ? updatedRow.openDcFacilityPower / updatedRow.total : 0;
          return updatedRow;
        }
        return row;
      })
    );
    setEditingMonth(null);
    setEditValue('');
  };

  const cancelEdit = () => { setEditingMonth(null); setEditValue(''); };

  const formatNumber = (num: number) =>
    num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Re-run whenever contextData changes (not just loading flag) so siteBreakdown
  // is guaranteed to be populated when loadData reads it.
  useEffect(() => {
    if (!contextData.loading) loadData();
  }, [contextData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!contextData.loading) loadData();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isHistoryOpen && historyData.length === 0) loadHistoryData();
  }, [isHistoryOpen]);

  if (loading || contextData.loading) {
    return (
      <Card className="w-full mb-8 relative overflow-hidden">
        <div className="absolute inset-0 h-full w-full -translate-x-full animate-[shimmer_2s_infinite] overflow-hidden bg-gradient-to-r from-transparent via-slate-200/30 to-transparent dark:via-slate-200/10" />
        <CardHeader><CardTitle>Monthly Power Consumption History</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading shared monthly summaries...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-green-700 dark:text-green-300">
            Monthly Power Consumption History
          </CardTitle>
          {(error || contextData.error) && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{error || contextData.error}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                View All History
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Complete Monthly Power History</SheetTitle>
                <SheetDescription>All historical monthly power consumption data</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-end">
                  <Button
                    onClick={downloadHistoryCSV}
                    disabled={historyLoading || historyData.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />Download CSV
                  </Button>
                </div>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                  </div>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No historical data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">DH1</TableHead>
                          <TableHead className="text-right">DH2</TableHead>
                          <TableHead className="text-right">DH3</TableHead>
                          <TableHead className="text-right">DH4</TableHead>
                          <TableHead className="text-right">DH5</TableHead>
                          <TableHead className="text-right">Total (kWh)</TableHead>
                          <TableHead className="text-right">Facility (kWh)</TableHead>
                          <TableHead className="text-right">PUE</TableHead>
                          <TableHead className="text-center">Completeness</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium whitespace-nowrap">{row.month}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.dh1)}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.dh2)}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.dh3)}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.dh4)}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.dh5)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatNumber(row.total)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.openDcFacilityPower)}</TableCell>
                            <TableCell className="text-right">
                              <span className={row.pue > 2 ? 'text-red-600' : row.pue > 1.5 ? 'text-yellow-600' : 'text-green-600'}>
                                {row.pue > 0 ? formatNumber(row.pue) : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <CompletenessBadge data={row.completeness} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          <Button size="sm" onClick={saveData} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">DH1 (kWh)</TableHead>
                <TableHead className="text-right">DH2 (kWh)</TableHead>
                <TableHead className="text-right">DH3 (kWh)</TableHead>
                <TableHead className="text-right">DH4 (kWh)</TableHead>
                <TableHead className="text-right">DH5 (kWh)</TableHead>
                <TableHead className="text-right">Total (kWh)</TableHead>
                <TableHead className="text-right">Facility Power (kWh)</TableHead>
                <TableHead className="text-right">PUE</TableHead>
                <TableHead className="text-center">Completeness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.dh1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.dh2)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.dh3)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.dh4)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.dh5)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(row.total)}</TableCell>
                  <TableCell className="text-right">
                    {editingMonth === row.month ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="number" value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 h-8" min="0" step="0.01"
                        />
                        <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <span>{formatNumber(row.openDcFacilityPower)}</span>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(row.month, row.openDcFacilityPower)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={row.pue > 2 ? 'text-red-600' : row.pue > 1.5 ? 'text-yellow-600' : 'text-green-600'}>
                      {row.pue > 0 ? formatNumber(row.pue) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <CompletenessBadge data={row.completeness} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <p>• Facility Power must be entered manually for each month</p>
          <p>• PUE = Facility Power ÷ Total IT Power — colour: Green (&lt;1.5), Yellow (1.5–2.0), Red (&gt;2.0)</p>
          <p>• Completeness: run the "Data Completeness Check" macro and save results to populate this column</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { MonthlyPowerTable };