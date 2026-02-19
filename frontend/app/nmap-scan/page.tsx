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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Lock,
  Unlock,
  PowerOff,
  RotateCcw,
} from "lucide-react";

// ── Plain Modal ───────────────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Plain Tabs ────────────────────────────────────────────────────────────────
function Tabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: (active: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]);
  return (
    <div className="w-full space-y-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              active === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div>{children(active)}</div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className={`text-sm font-medium ${required ? "text-red-600" : ""}`}>
        {label} {required && "*"}
      </label>
      {children}
    </div>
  );
}

// ── ModalFooter ───────────────────────────────────────────────────────────────
function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm} disabled={disabled}>{confirmLabel}</Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NmapScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<any>(null);
  const [error, setError] = useState<string>();
  const [scannerStatus, setScannerStatus] = useState<any>(null);

  // ── Admin lock state ────────────────────────────────────────────────────────
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [lockPasswordInput, setLockPasswordInput] = useState("");
  const [lockError, setLockError] = useState("");
  const [showLockModal, setShowLockModal] = useState(false);

  // ── Dialog states ───────────────────────────────────────────────────────────
  const [updateDialog, setUpdateDialog] = useState<any>(null);
  const [createDialog, setCreateDialog] = useState<any>(null);
  const [ignoreDialog, setIgnoreDialog] = useState<any>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [ignoredDevices, setIgnoredDevices] = useState<any[]>([]);
  const [disabledDevices, setDisabledDevices] = useState<any[]>([]);

  React.useEffect(() => {
    checkScannerStatus();
    fetchChangeLogs();
    fetchIgnoredDevices();
    fetchDisabledDevices();
  }, []);

  // ── Lock / Unlock ───────────────────────────────────────────────────────────
  const handleUnlock = async () => {
    setLockError("");
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/validate-password`,
        { admin_password: lockPasswordInput }
      );
      setAdminPassword(lockPasswordInput);
      setLockPasswordInput("");
      setIsUnlocked(true);
      setShowLockModal(false);
    } catch (e: any) {
      setLockError(e.response?.data?.message || "Invalid password");
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setAdminPassword("");
    setLockPasswordInput("");
    setLockError("");
    closeDialogs();
  };

  // ── Scan ────────────────────────────────────────────────────────────────────
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
      if (response.data.status === "success") setChangeLogs(response.data.change_logs);
    } catch (e) {
      console.error("Failed to fetch change logs:", e);
    }
  };

  const fetchIgnoredDevices = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/ignored-devices`
      );
      if (response.data.status === "success") setIgnoredDevices(response.data.ignored_devices);
    } catch (e) {
      console.error("Failed to fetch ignored devices:", e);
    }
  };

  const fetchDisabledDevices = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/disabled-devices`
      );
      if (response.data.status === "success") setDisabledDevices(response.data.disabled_devices);
    } catch (e) {
      console.error("Failed to fetch disabled devices:", e);
    }
  };

  const closeDialogs = () => {
    setUpdateDialog(null);
    setCreateDialog(null);
    setIgnoreDialog(null);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleUpdateSystem = async () => {
    if (!updateDialog) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/update-system`,
        {
          system_id: updateDialog._id,
          system_name: updateDialog.hostname,
          old_ip: updateDialog.old_ip,
          new_ip: updateDialog.new_ip,
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );
      if (response.data.status === "success") {
        alert("System updated successfully!");
        closeDialogs();
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to update system");
    }
  };

  const handleMoveToDisabled = async (entityId: string, entityType: "system" | "pdu") => {
    if (!confirm(`Move this ${entityType} to disabled?`)) return;
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/move-to-disabled`,
        { entity_id: entityId, entity_type: entityType, admin_password: adminPassword, admin_user: "admin" }
      );
      alert("Moved to disabled successfully");
      fetchDisabledDevices();
      runScan();
      fetchChangeLogs();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to move to disabled");
    }
  };

  const handleRestoreFromDisabled = async (disabledId: string) => {
    if (!confirm("Restore this device back to active?")) return;
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/restore-from-disabled`,
        { disabled_id: disabledId, admin_password: adminPassword, admin_user: "admin" }
      );
      alert("Restored successfully");
      fetchDisabledDevices();
      runScan();
      fetchChangeLogs();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to restore");
    }
  };

  const handleUpdateHostname = async (item: any, entityType: "system" | "pdu") => {
    if (!item) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/update-hostname`,
        {
          entity_id: item._id,
          entity_type: entityType,
          old_hostname: item.old_hostname,
          new_hostname: item.new_hostname,
          ip: item.ip,
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );
      if (response.data.status === "success") {
        alert(`${entityType === "system" ? "System" : "PDU"} hostname updated successfully!`);
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to update hostname");
    }
  };

  const handleCreateSystem = async () => {
    if (!createDialog) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/create-system`,
        {
          hostname: createDialog.hostname,
          ip: createDialog.ip,
          site: createDialog.site || "",
          location: createDialog.location || "",
          username: createDialog.username,
          password: createDialog.password,
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );
      if (response.data.status === "success") {
        alert("System created successfully!");
        closeDialogs();
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create system");
    }
  };

  const handleCreatePDU = async () => {
    if (!createDialog) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/create-pdu`,
        {
          hostname: createDialog.hostname,
          ip: createDialog.ip,
          site: createDialog.site || "",
          location: createDialog.location || "",
          output_power_total_oid: createDialog.output_power_total_oid || "",
          v2c: "amd123",
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );
      if (response.data.status === "success") {
        alert("PDU created successfully!");
        closeDialogs();
        fetchChangeLogs();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create PDU");
    }
  };

  const handleIgnoreDevice = async () => {
    if (!ignoreDialog) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/ignore-device`,
        {
          hostname: ignoreDialog.hostname,
          device_type: ignoreDialog.device_type,
          admin_password: adminPassword,
          admin_user: "admin",
        }
      );
      if (response.data.status === "success") {
        alert("Device ignored successfully!");
        closeDialogs();
        fetchIgnoredDevices();
        runScan();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to ignore device");
    }
  };

  const handleUnignoreDevice = async (deviceId: string) => {
    if (!confirm("Remove this device from the ignored list?")) return;
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nmap-scan/unignore-device/${deviceId}`,
        { data: { admin_password: adminPassword } }
      );
      if (response.data.status === "success") {
        alert("Device removed from ignored list!");
        fetchIgnoredDevices();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to unignore device");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <div className="w-full max-w-7xl space-y-6">

        {/* Header row with title + lock toggle */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Network className="h-10 w-10" />
            Network Scanner
          </h1>

          {isUnlocked ? (
            <button
              onClick={handleLock}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors font-medium text-sm"
            >
              <Unlock className="h-4 w-4" />
              Unlocked — Click to Lock
            </button>
          ) : (
            <button
              onClick={() => { setShowLockModal(true); setLockError(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              <Lock className="h-4 w-4" />
              Locked
            </button>
          )}
        </div>

        {/* Scanner Status */}
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
                  <span className={`font-bold ${scannerStatus.status === "available" ? "text-green-600" : "text-red-600"}`}>
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
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Scanning Networks...</>
          ) : (
            <><Network className="mr-2 h-4 w-4" />Run Network Scan</>
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

        {/* Results Tabs */}
        {scanData && (
          <Tabs tabs={["Analysis", "All Devices", "Change Logs", "Ignored Devices", "Disabled Devices"]}>
            {(active) => (
              <>
                {/* ── Analysis ──────────────────────────────────────────────── */}
                {active === "Analysis" && (
                  <div className="space-y-4">
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
                                      disabled={!isUnlocked}
                                      onClick={() => setCreateDialog({ hostname: device.hostname, ip: device.ip, type: "system" })}
                                    >
                                      <Edit className="mr-1 h-3 w-3" /> Create
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: device.hostname, device_type: "system" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Changed IPs */}
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
                                      disabled={!isUnlocked}
                                      onClick={() => setUpdateDialog(change)}
                                    >
                                      <Edit className="mr-1 h-3 w-3" /> Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: change.hostname, device_type: "system" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Changed System Hostnames */}
                    {scanData.analysis.changed_system_hostnames?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Changed System Hostnames ({scanData.analysis.changed_system_hostnames.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>IP</TableHead>
                                <TableHead>Old Hostname</TableHead>
                                <TableHead>New Hostname</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scanData.analysis.changed_system_hostnames.map((change: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{change.ip}</TableCell>
                                  <TableCell className="text-gray-500">{change.old_hostname}</TableCell>
                                  <TableCell className="font-medium">{change.new_hostname}</TableCell>
                                  <TableCell className="space-x-2">
                                    <Button
                                      size="sm"
                                      disabled={!isUnlocked}
                                      onClick={() => handleUpdateHostname(change, "system")}
                                    >
                                      <Edit className="mr-1 h-3 w-3" /> Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: change.new_hostname, device_type: "system" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Changed PDU Hostnames */}
                    {scanData.analysis.changed_pdu_hostnames?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Changed PDU Hostnames ({scanData.analysis.changed_pdu_hostnames.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>IP</TableHead>
                                <TableHead>Old Hostname</TableHead>
                                <TableHead>New Hostname</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scanData.analysis.changed_pdu_hostnames.map((change: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{change.ip}</TableCell>
                                  <TableCell className="text-gray-500">{change.old_hostname}</TableCell>
                                  <TableCell className="font-medium">{change.new_hostname}</TableCell>
                                  <TableCell className="space-x-2">
                                    <Button
                                      size="sm"
                                      disabled={!isUnlocked}
                                      onClick={() => handleUpdateHostname(change, "pdu")}
                                    >
                                      <Edit className="mr-1 h-3 w-3" /> Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: change.new_hostname, device_type: "pdu" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
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
                                      disabled={!isUnlocked}
                                      onClick={() => setCreateDialog({ hostname: device.hostname, ip: device.ip, type: "pdu" })}
                                    >
                                      <Edit className="mr-1 h-3 w-3" /> Create
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: device.hostname, device_type: "pdu" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* No changes */}
                    {/* Not Detected Systems */}
                    {scanData.analysis.not_detected_systems?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PowerOff className="h-5 w-5 text-red-600" />
                            Not Detected Systems ({scanData.analysis.not_detected_systems.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>System</TableHead>
                                <TableHead>BMC IP</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scanData.analysis.not_detected_systems.map((s: any, idx: number) => (
                                <TableRow key={idx} className={s.overdue ? "bg-red-50 dark:bg-red-950/20" : ""}>
                                  <TableCell>{s.hostname}</TableCell>
                                  <TableCell>{s.bmc_ip || "—"}</TableCell>
                                  <TableCell className={s.overdue ? "text-red-600 font-medium" : ""}>
                                    {s.last_seen ? new Date(s.last_seen).toLocaleDateString() : "Never"}
                                    {s.overdue && " ⚠ >2 weeks"}
                                  </TableCell>
                                  <TableCell className="space-x-2">
                                    {s.overdue && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={!isUnlocked}
                                        onClick={() => handleMoveToDisabled(s._id, "system")}
                                      >
                                        <PowerOff className="mr-1 h-3 w-3" /> Disable
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: s.hostname, device_type: "system" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Not Detected PDUs */}
                    {scanData.analysis.not_detected_pdus?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PowerOff className="h-5 w-5 text-red-600" />
                            Not Detected PDUs ({scanData.analysis.not_detected_pdus.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hostname</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scanData.analysis.not_detected_pdus.map((p: any, idx: number) => (
                                <TableRow key={idx} className={p.overdue ? "bg-red-50 dark:bg-red-950/20" : ""}>
                                  <TableCell>{p.hostname}</TableCell>
                                  <TableCell className={p.overdue ? "text-red-600 font-medium" : ""}>
                                    {p.last_seen ? new Date(p.last_seen).toLocaleDateString() : "Never"}
                                    {p.overdue && " ⚠ >2 weeks"}
                                  </TableCell>
                                  <TableCell className="space-x-2">
                                    {p.overdue && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={!isUnlocked}
                                        onClick={() => handleMoveToDisabled(p._id, "pdu")}
                                      >
                                        <PowerOff className="mr-1 h-3 w-3" /> Disable
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isUnlocked}
                                      onClick={() => setIgnoreDialog({ hostname: p.hostname, device_type: "pdu" })}
                                    >
                                      <Ban className="mr-1 h-3 w-3" /> Ignore
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {scanData.analysis.new_systems.length === 0 &&
                      scanData.analysis.changed_system_ips.length === 0 &&
                      scanData.analysis.new_pdus.length === 0 &&
                      (scanData.analysis.changed_system_hostnames?.length ?? 0) === 0 &&
                      (scanData.analysis.changed_pdu_hostnames?.length ?? 0) === 0 &&
                      (scanData.analysis.not_detected_systems?.length ?? 0) === 0 &&
                      (scanData.analysis.not_detected_pdus?.length ?? 0) === 0 && (
                        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-5 w-5" />
                              <span>No changes detected. All systems and PDUs are up to date.</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                )}

                {/* ── All Devices ────────────────────────────────────────────── */}
                {active === "All Devices" && (
                  <Card>
                    <CardHeader><CardTitle>All Scanned Devices</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(scanData.scanned_devices).map(
                          ([category, devices]: [string, any]) =>
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
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Change Logs ────────────────────────────────────────────── */}
                {active === "Change Logs" && (
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
                )}

                {/* ── Ignored Devices ────────────────────────────────────────── */}
                {active === "Ignored Devices" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5" />
                        Ignored Devices
                      </CardTitle>
                      <CardDescription>Devices excluded from scan analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hostname</TableHead>
                            <TableHead>Type</TableHead>
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
                              <TableCell>{device.ignored_by}</TableCell>
                              <TableCell>{new Date(device.created).toLocaleString()}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!isUnlocked}
                                  onClick={() => handleUnignoreDevice(device._id)}
                                >
                                  <XCircle className="mr-1 h-3 w-3" /> Unignore
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* ── Disabled Devices ──────────────────────────────────────────── */}
                {active === "Disabled Devices" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PowerOff className="h-5 w-5 text-red-600" />
                        Disabled Devices
                      </CardTitle>
                      <CardDescription>Systems and PDUs that have not been detected for over 2 weeks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {disabledDevices.length === 0 ? (
                        <p className="text-gray-500 text-sm">No disabled devices.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Last Seen</TableHead>
                              <TableHead>Disabled At</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {disabledDevices.map((d: any) => (
                              <TableRow key={d._id}>
                                <TableCell className="capitalize">{d.entity_type}</TableCell>
                                <TableCell>{d.entity_name}</TableCell>
                                <TableCell>
                                  {d.last_seen ? new Date(d.last_seen).toLocaleDateString() : "Never"}
                                </TableCell>
                                <TableCell>
                                  {d.disabled_at ? new Date(d.disabled_at).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell className="space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!isUnlocked}
                                    onClick={() => handleRestoreFromDisabled(d._id)}
                                  >
                                    <RotateCcw className="mr-1 h-3 w-3" /> Restore
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!isUnlocked}
                                    onClick={() => setIgnoreDialog({ hostname: d.entity_name, device_type: d.entity_type })}
                                  >
                                    <Ban className="mr-1 h-3 w-3" /> Ignore
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </Tabs>
        )}

        {/* ── Unlock Modal ──────────────────────────────────────────────────── */}
        <Modal
          open={showLockModal}
          onClose={() => { setShowLockModal(false); setLockError(""); setLockPasswordInput(""); }}
          title="Admin Unlock"
          description="Enter the admin password to enable changes"
        >
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Admin password"
              value={lockPasswordInput}
              onChange={(e) => setLockPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
            />
            {lockError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {lockError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowLockModal(false); setLockError(""); setLockPasswordInput(""); }}
            >
              Cancel
            </Button>
            <Button onClick={handleUnlock} disabled={!lockPasswordInput}>
              <Unlock className="mr-2 h-4 w-4" /> Unlock
            </Button>
          </div>
        </Modal>

        {/* ── Update System Modal ───────────────────────────────────────────── */}
        <Modal
          open={!!updateDialog}
          onClose={closeDialogs}
          title="Update System IP"
          description="Confirm the IP address update for this system"
        >
          <div className="space-y-3">
            <Field label="System Name">
              <Input value={updateDialog?.hostname || ""} disabled />
            </Field>
            <Field label="Old IP">
              <Input value={updateDialog?.old_ip || ""} disabled />
            </Field>
            <Field label="New IP">
              <Input value={updateDialog?.new_ip || ""} disabled />
            </Field>
          </div>
          <ModalFooter
            onCancel={closeDialogs}
            onConfirm={handleUpdateSystem}
            confirmLabel="Update System"
          />
        </Modal>

        {/* ── Create System / PDU Modal ─────────────────────────────────────── */}
        <Modal
          open={!!createDialog}
          onClose={closeDialogs}
          title={`Create New ${createDialog?.type === "system" ? "System" : "PDU"}`}
          description={`Fill in the details for the new ${createDialog?.type === "system" ? "system" : "PDU"}`}
        >
          <div className="space-y-3">
            <Field label="Hostname">
              <Input
                value={createDialog?.hostname || ""}
                onChange={(e) => setCreateDialog({ ...createDialog, hostname: e.target.value })}
              />
            </Field>
            <Field label="IP Address">
              <Input
                value={createDialog?.ip || ""}
                onChange={(e) => setCreateDialog({ ...createDialog, ip: e.target.value })}
              />
            </Field>
            <Field label="Site" required>
              <Input
                placeholder="e.g., odcdh1"
                onChange={(e) => setCreateDialog({ ...createDialog, site: e.target.value })}
              />
            </Field>
            <Field label="Location" required>
              <Input
                placeholder="e.g., a01"
                onChange={(e) => setCreateDialog({ ...createDialog, location: e.target.value })}
              />
            </Field>

            {createDialog?.type === "system" && (
              <>
                <Field label="BMC Username" required>
                  <Input
                    placeholder="root"
                    onChange={(e) => setCreateDialog({ ...createDialog, username: e.target.value })}
                  />
                </Field>
                <Field label="BMC Password" required>
                  <Input
                    type="password"
                    onChange={(e) => setCreateDialog({ ...createDialog, password: e.target.value })}
                  />
                </Field>
              </>
            )}

            {createDialog?.type === "pdu" && (
              <Field label="Output Power Total OID" required>
                <Input
                  placeholder="1.3.6.1.4.1.850.1.1.3.2.2.1.1.9.1"
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, output_power_total_oid: e.target.value })
                  }
                />
              </Field>
            )}
          </div>
          <ModalFooter
            onCancel={closeDialogs}
            onConfirm={createDialog?.type === "system" ? handleCreateSystem : handleCreatePDU}
            confirmLabel={`Create ${createDialog?.type === "system" ? "System" : "PDU"}`}
            disabled={
              createDialog?.type === "system"
                ? !createDialog?.site || !createDialog?.location ||
                  !createDialog?.username || !createDialog?.password
                : !createDialog?.site || !createDialog?.location ||
                  !createDialog?.output_power_total_oid
            }
          />
        </Modal>

        {/* ── Ignore Device Modal ───────────────────────────────────────────── */}
        <Modal
          open={!!ignoreDialog}
          onClose={closeDialogs}
          title="Ignore Device"
          description="This device will be excluded from future scan analysis"
        >
          <div className="space-y-3">
            <Field label="Hostname">
              <Input value={ignoreDialog?.hostname || ""} disabled />
            </Field>
            <Field label="Device Type">
              <Input value={ignoreDialog?.device_type || ""} disabled className="capitalize" />
            </Field>
          </div>
          <ModalFooter
            onCancel={closeDialogs}
            onConfirm={handleIgnoreDevice}
            confirmLabel="Ignore Device"
          />
        </Modal>

      </div>
    </main>
  );
}