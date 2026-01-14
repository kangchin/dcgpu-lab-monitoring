// frontend/app/nmap-scan/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  RefreshCw, 
  Server, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Network,
  Activity
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Device {
  ip: string;
  hostname: string | null;
}

interface ScannedDevices {
  systems: Device[];
  pdus: Device[];
  non_standard: Device[];
  no_hostname: Device[];
}

interface Analysis {
  new_systems: Device[];
  new_pdus: Device[];
  changed_system_ips: Array<{
    hostname: string;
    old_ip: string;
    new_ip: string;
    system_data: any;
  }>;
  changed_pdu_ips: Array<any>;
  possible_system_resets: Array<{
    current_hostname: string | null;
    ip: string;
    expected_hostname: string;
    system_data: any;
  }>;
  possible_pdu_resets: Array<any>;
}

interface ScanResult {
  scanned_devices: ScannedDevices;
  analysis: Analysis;
  summary: {
    total_devices: number;
    systems: number;
    pdus: number;
    non_standard: number;
    no_hostname: number;
    new_systems: number;
    new_pdus: number;
    changed_ips: number;
    possible_resets: number;
  };
}

export default function NmapScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>();
  const [nmapAvailable, setNmapAvailable] = useState<boolean | null>(null);

  // Check if nmap is available on mount
  useEffect(() => {
    checkNmapAvailability();
  }, []);

  const checkNmapAvailability = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/scan/status`
      );
      setNmapAvailable(response.data.status === "available");
    } catch (err) {
      setNmapAvailable(false);
      console.error("Nmap not available:", err);
    }
  };

  const runScan = async () => {
    setScanning(true);
    setError(undefined);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/scan`
      );
      
      if (response.data.status === "success") {
        setScanResult(response.data);
      } else {
        setError(response.data.message || "Scan failed");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(
        err.response?.data?.message || 
        "Failed to run network scan. Check server logs."
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <div className="w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Network className="h-8 w-8 text-blue-600" />
            Network Device Scanner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Scan network ranges and compare with tracked devices
          </p>
        </div>

        {/* Nmap Status Alert */}
        {nmapAvailable === false && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    Nmap Not Available
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    The nmap tool is not installed on the server. Please install it to use this feature.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Control</CardTitle>
            <CardDescription>
              Scans: 10.145.71.0/24, 10.145.70.0/24, 10.145.69.0/24, 10.145.132.0/24, 10.145.133.0/24, 10.145.135.0/24
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runScan}
              disabled={scanning || nmapAvailable === false}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning Network..." : "Start Network Scan"}
            </Button>
            {scanning && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This may take several minutes...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scanResult && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                <CardContent className="p-4 text-center">
                  <Activity className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {scanResult.summary?.total_devices ?? 0}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Total Devices</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                <CardContent className="p-4 text-center">
                  <Server className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {scanResult.summary?.systems ?? 0}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Systems (BMC)</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                <CardContent className="p-4 text-center">
                  <Zap className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {scanResult.summary?.pdus ?? 0}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">PDUs</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    {((scanResult.summary?.new_systems ?? 0) + 
                      (scanResult.summary?.new_pdus ?? 0) + 
                      (scanResult.summary?.changed_ips ?? 0) + 
                      (scanResult.summary?.possible_resets ?? 0))}
                  </div>
                  <div className="text-sm text-amber-600 dark:text-amber-400">Issues Found</div>
                </CardContent>
              </Card>
            </div>

            {/* New Devices */}
            {((scanResult.analysis?.new_systems?.length ?? 0) > 0 || 
              (scanResult.analysis?.new_pdus?.length ?? 0) > 0) && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    New Devices Discovered
                  </CardTitle>
                  <CardDescription>Devices not found in the database</CardDescription>
                </CardHeader>
                <CardContent>
                  {(scanResult.analysis?.new_systems?.length ?? 0) > 0 && (
                    <>
                      <h3 className="font-semibold mb-2">
                        New Systems ({scanResult.analysis.new_systems.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hostname</TableHead>
                            <TableHead>IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scanResult.analysis.new_systems.map((device, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{device.hostname}</TableCell>
                              <TableCell className="font-mono">{device.ip}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                  {(scanResult.analysis?.new_pdus?.length ?? 0) > 0 && (
                    <>
                      <h3 className="font-semibold mb-2 mt-4">
                        New PDUs ({scanResult.analysis.new_pdus.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hostname</TableHead>
                            <TableHead>IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scanResult.analysis.new_pdus.map((device, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{device.hostname}</TableCell>
                              <TableCell className="font-mono">{device.ip}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Changed IPs */}
            {(scanResult.analysis?.changed_system_ips?.length ?? 0) > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    IP Address Changes
                  </CardTitle>
                  <CardDescription>Tracked devices with different IP addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>Old IP</TableHead>
                        <TableHead>New IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanResult.analysis.changed_system_ips.map((device, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{device.hostname}</TableCell>
                          <TableCell className="font-mono text-red-600">{device.old_ip}</TableCell>
                          <TableCell className="font-mono text-green-600">{device.new_ip}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Possible Resets */}
            {(scanResult.analysis?.possible_system_resets?.length ?? 0) > 0 && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Possible Device Resets
                  </CardTitle>
                  <CardDescription>Tracked IPs with non-standard or missing hostnames</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Current Hostname</TableHead>
                        <TableHead>Expected Hostname</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanResult.analysis.possible_system_resets.map((device, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{device.ip}</TableCell>
                          <TableCell className="font-mono text-red-600">
                            {device.current_hostname || "(No hostname)"}
                          </TableCell>
                          <TableCell className="font-mono text-green-600">{device.expected_hostname}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* All Scanned Devices */}
            <Card>
              <CardHeader>
                <CardTitle>All Scanned Devices</CardTitle>
                <CardDescription>Complete list of discovered network devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Systems */}
                {(scanResult.scanned_devices?.systems?.length ?? 0) > 0 && (
                  <>
                    <h3 className="font-semibold">
                      Systems ({scanResult.scanned_devices.systems.length})
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostname</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.scanned_devices.systems.map((device, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{device.hostname}</TableCell>
                            <TableCell className="font-mono">{device.ip}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* PDUs */}
                {(scanResult.scanned_devices?.pdus?.length ?? 0) > 0 && (
                  <>
                    <h3 className="font-semibold">
                      PDUs ({scanResult.scanned_devices.pdus.length})
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostname</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.scanned_devices.pdus.map((device, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{device.hostname}</TableCell>
                            <TableCell className="font-mono">{device.ip}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* Non-standard */}
                {(scanResult.scanned_devices?.non_standard?.length ?? 0) > 0 && (
                  <>
                    <h3 className="font-semibold">
                      Non-Standard Hostnames ({scanResult.scanned_devices.non_standard.length})
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostname</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.scanned_devices.non_standard.map((device, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{device.hostname}</TableCell>
                            <TableCell className="font-mono">{device.ip}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* No hostname */}
                {(scanResult.scanned_devices?.no_hostname?.length ?? 0) > 0 && (
                  <>
                    <h3 className="font-semibold">
                      No Hostname ({scanResult.scanned_devices.no_hostname.length})
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.scanned_devices.no_hostname.map((device, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{device.ip}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}