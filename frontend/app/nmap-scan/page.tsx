"use client";
import React, { useState } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Network,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Ban,
  Plus,
  History,
} from "lucide-react";

export default function NmapScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<any>(null);
  const [error, setError] = useState<string>();
  const [scannerStatus, setScannerStatus] = useState<any>(null);

  // Dialog states
  const [updateDialog, setUpdateDialog] = useState<any>(null);
  const [createDialog, setCreateDialog] = useState<any>(null);
  const [ignoreDialog, setIgnoreDialog] = useState<any>(null);
  const [adminPassword, setAdminPassword] = useState("");

  // Change logs and ignored devices
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [ignoredDevices, setIgnoredDevices] = useState<any[]>([]);

  // Check scanner status on mount
  React.useEffect(() => {
    checkScannerStatus();
    fetchChangeLogs();
    fetchIgnoredDevices();
  }, []);

  const checkScannerStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/scan/status`
      );
      setScannerStatus(response.data);
    } catch (e) {
      console.error("Scanner status check failed:", e);
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
        setScanData(response.data);
      } else {
        setError(response.data.message || "Scan failed");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to run scan");
    } finally {
      setScanning(false);
    }
  };

  const fetchChangeLogs = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/change-logs`
      );
      if (response.data.status === "success") {
        setChangeLogs(response.data.change_logs);
      }
    } catch (e) {
      console.error("Failed to fetch change logs:", e);
    }
  };

  const fetchIgnoredDevices = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/ignored-devices`
      );
      if (response.data.status === "success") {
        setIgnoredDevices(response.data.ignored_devices);
      }
    } catch (e) {
      console.error("Failed to fetch ignored devices:", e);
    }
  };

  const handleUpdateSystem = async () => {
    if (!updateDialog || !adminPassword) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/update-system`,
        {
          system_id: updateDialog._id,
          system_name: updateDialog.hostname,
          old_ip: updateDialog.old_ip,
          new_ip: updateDialog.new_ip,
          admin_password: adminPassword,
          admin_user: "admin", // You could make this dynamic
          reason: updateDialog.reason || "",
        }
      );

      if (response.data.status === "success") {
        alert("System updated successfully!");
        setUpdateDialog(null);
        setAdminPassword("");
        fetchChangeLogs();
        runScan(); // Re-run scan
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to update system");
    }
  };

  const handleCreateSystem = async () => {
    if (!createDialog || !adminPassword) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/create-system`,
        {
          hostname: createDialog.hostname,
          ip: createDialog.ip,
          site: createDialog.site || "",
          location: createDialog.location || "",
          username: createDialog.username || "",
          password: createDialog.password || "",
          admin_password: adminPassword,
          admin_user: "admin",
          reason: createDialog.reason || "",
        }
      );

      if (response.data.status === "success") {
        alert("System created successfully!");
        setCreateDialog(null);
        setAdminPassword("");
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create system");
    }
  };

  const handleCreatePDU = async () => {
    if (!createDialog || !adminPassword) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/create-pdu`,
        {
          hostname: createDialog.hostname,
          ip: createDialog.ip,
          site: createDialog.site || "",
          location: createDialog.location || "",
          output_power_total_oid: createDialog.output_power_total_oid || "",
          v2c: createDialog.v2c || "amd123",
          admin_password: adminPassword,
          admin_user: "admin",
          reason: createDialog.reason || "",
        }
      );

      if (response.data.status === "success") {
        alert("PDU created successfully!");
        setCreateDialog(null);
        setAdminPassword("");
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create PDU");
    }
  };

  const handleIgnoreDevice = async () => {
    if (!ignoreDialog || !adminPassword) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/ignore-device`,
        {
          hostname: ignoreDialog.hostname,
          device_type: ignoreDialog.device_type,
          reason: ignoreDialog.reason || "",
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );

      if (response.data.status === "success") {
        alert("Device ignored successfully!");
        setIgnoreDialog(null);
        setAdminPassword("");
        fetchIgnoredDevices();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to ignore device");
    }
  };

  const handleUnignoreDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to remove this device from the ignored list?")) return;

    const password = prompt("Enter admin password:");
    if (!password) return;

    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/unignore-device/${deviceId}`,
        {
          data: { admin_password: password }
        }
      );

      if (response.data.status === "success") {
        alert("Device removed from ignored list!");
        fetchIgnoredDevices();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to unignore device");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <div className="w-full max-w-7xl space-y-6">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Network className="h-10 w-10" />
          Network Scanner
        </h1>

        {/* Scanner Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Scanner Status</CardTitle>
            <CardDescription>Network scanning capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            {scannerStatus ? (
              <div className="space-y-2">
                <p>
                  Status:{" "}
                  <span
                    className={`font-bold ${
                      scannerStatus.status === "available"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {scannerStatus.status}
                  </span>
                </p>
                <p>Method: {scannerStatus.method}</p>
                {scannerStatus.version && <p>Version: {scannerStatus.version}</p>}
                {scannerStatus.platform && <p>Platform: {scannerStatus.platform}</p>}
              </div>
            ) : (
              <p>Checking scanner status...</p>
            )}
          </CardContent>
        </Card>

        {/* Scan Button */}
        <Button
          onClick={runScan}
          disabled={scanning || scannerStatus?.status !== "available"}
          className="w-full"
          size="lg"
        >
          {scanning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Scanning Networks...
            </>
          ) : (
            <>
              <Network className="mr-2 h-4 w-4" />
              Run Network Scan
            </>
          )}
        </Button>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan Results */}
        {scanData && (
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="devices">All Devices</TabsTrigger>
              <TabsTrigger value="logs">Change Logs</TabsTrigger>
              <TabsTrigger value="ignored">Ignored Devices</TabsTrigger>
            </TabsList>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              {/* New Systems */}
              {scanData.analysis.new_systems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      New Systems ({scanData.analysis.new_systems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostname</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanData.analysis.new_systems.map((device: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{device.hostname}</TableCell>
                            <TableCell>{device.ip}</TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  setCreateDialog({
                                    hostname: device.hostname,
                                    ip: device.ip,
                                    type: "system",
                                  })
                                }
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Create
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setIgnoreDialog({
                                    hostname: device.hostname,
                                    device_type: "system",
                                  })
                                }
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                Ignore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Changed System IPs */}
              {scanData.analysis.changed_system_ips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Changed System IPs ({scanData.analysis.changed_system_ips.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>System</TableHead>
                          <TableHead>Old IP</TableHead>
                          <TableHead>New IP</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanData.analysis.changed_system_ips.map((change: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{change.hostname}</TableCell>
                            <TableCell>{change.old_ip}</TableCell>
                            <TableCell>{change.new_ip}</TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() => setUpdateDialog(change)}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Update
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setIgnoreDialog({
                                    hostname: change.hostname,
                                    device_type: "system",
                                  })
                                }
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                Ignore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* New PDUs */}
              {scanData.analysis.new_pdus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      New PDUs ({scanData.analysis.new_pdus.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostname</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanData.analysis.new_pdus.map((device: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{device.hostname}</TableCell>
                            <TableCell>{device.ip}</TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  setCreateDialog({
                                    hostname: device.hostname,
                                    ip: device.ip,
                                    type: "pdu",
                                  })
                                }
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Create
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setIgnoreDialog({
                                    hostname: device.hostname,
                                    device_type: "pdu",
                                  })
                                }
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                Ignore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* No Changes */}
              {scanData.analysis.new_systems.length === 0 &&
                scanData.analysis.changed_system_ips.length === 0 &&
                scanData.analysis.new_pdus.length === 0 && (
                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        <span>No changes detected. All systems and PDUs are up to date.</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </TabsContent>

            {/* All Devices Tab */}
            <TabsContent value="devices">
              <Card>
                <CardHeader>
                  <CardTitle>All Scanned Devices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(scanData.scanned_devices).map(([category, devices]: [string, any]) => (
                      devices.length > 0 && (
                        <div key={category}>
                          <h3 className="font-semibold mb-2 capitalize">{category.replace("_", " ")}</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hostname</TableHead>
                                <TableHead>IP Address</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {devices.map((device: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{device.hostname || "N/A"}</TableCell>
                                  <TableCell>{device.ip}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Change Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Change Logs
                  </CardTitle>
                  <CardDescription>Recent changes made to systems and PDUs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Changed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeLogs.map((log: any) => (
                        <TableRow key={log._id}>
                          <TableCell>{new Date(log.created).toLocaleString()}</TableCell>
                          <TableCell>{log.entity_name}</TableCell>
                          <TableCell className="capitalize">{log.entity_type}</TableCell>
                          <TableCell className="capitalize">{log.change_type}</TableCell>
                          <TableCell>{log.changed_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ignored Devices Tab */}
            <TabsContent value="ignored">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5" />
                    Ignored Devices
                  </CardTitle>
                  <CardDescription>Devices that are excluded from scan analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Ignored By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ignoredDevices.map((device: any) => (
                        <TableRow key={device._id}>
                          <TableCell>{device.hostname}</TableCell>
                          <TableCell className="capitalize">{device.device_type}</TableCell>
                          <TableCell>{device.reason || "N/A"}</TableCell>
                          <TableCell>{device.ignored_by}</TableCell>
                          <TableCell>{new Date(device.created).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnignoreDevice(device._id)}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Unignore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Update System Dialog */}
        <Dialog open={!!updateDialog} onOpenChange={(open) => !open && setUpdateDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update System IP</DialogTitle>
              <DialogDescription>
                Confirm the IP address update for this system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">System Name</label>
                <Input value={updateDialog?.hostname || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Old IP</label>
                <Input value={updateDialog?.old_ip || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">New IP</label>
                <Input value={updateDialog?.new_ip || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="Why is this change being made?"
                  onChange={(e) =>
                    setUpdateDialog({ ...updateDialog, reason: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-red-600">Admin Password *</label>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSystem} disabled={!adminPassword}>
                Update System
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create System/PDU Dialog */}
        <Dialog open={!!createDialog} onOpenChange={(open) => !open && setCreateDialog(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Create New {createDialog?.type === "system" ? "System" : "PDU"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for the new {createDialog?.type === "system" ? "system" : "PDU"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Hostname</label>
                <Input
                  value={createDialog?.hostname || ""}
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, hostname: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">IP Address</label>
                <Input
                  value={createDialog?.ip || ""}
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, ip: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Site</label>
                <Input
                  placeholder="e.g., odcdh1"
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, site: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="e.g., a01"
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, location: e.target.value })
                  }
                />
              </div>

              {createDialog?.type === "system" && (
                <>
                  <div>
                    <label className="text-sm font-medium">BMC Username (optional)</label>
                    <Input
                      placeholder="root"
                      onChange={(e) =>
                        setCreateDialog({ ...createDialog, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">BMC Password (optional)</label>
                    <Input
                      type="password"
                      onChange={(e) =>
                        setCreateDialog({ ...createDialog, password: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {createDialog?.type === "pdu" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Output Power Total OID *</label>
                    <Input
                      placeholder="1.3.6.1.4.1.850.1.1.3.2.2.1.1.9.1"
                      onChange={(e) =>
                        setCreateDialog({
                          ...createDialog,
                          output_power_total_oid: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">V2C Community String</label>
                    <Input
                      placeholder="amd123"
                      defaultValue="amd123"
                      onChange={(e) =>
                        setCreateDialog({ ...createDialog, v2c: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="Why is this being created?"
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, reason: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-red-600">Admin Password *</label>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={
                  createDialog?.type === "system" ? handleCreateSystem : handleCreatePDU
                }
                disabled={!adminPassword}
              >
                Create {createDialog?.type === "system" ? "System" : "PDU"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ignore Device Dialog */}
        <Dialog open={!!ignoreDialog} onOpenChange={(open) => !open && setIgnoreDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ignore Device</DialogTitle>
              <DialogDescription>
                This device will be excluded from future scan analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Hostname</label>
                <Input value={ignoreDialog?.hostname || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Device Type</label>
                <Input
                  value={ignoreDialog?.device_type || ""}
                  disabled
                  className="capitalize"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="Why is this device being ignored?"
                  onChange={(e) =>
                    setIgnoreDialog({ ...ignoreDialog, reason: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-red-600">Admin Password *</label>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIgnoreDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleIgnoreDevice} disabled={!adminPassword}>
                Ignore Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}