"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

interface SyncResult {
  status: string;
  message: string;
  sync_result: {
    status: string;
    message: string;
    pdu_count: number;
    successful_updates: number;
    failed_updates: number;
  };
  timestamp: string;
}

export default function TestApiPage() {
  const backendUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "")
  ).replace(/\/$/, "");
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState<"sync-all" | "pdu" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testSyncAllApi = async () => {
    if (loading) return;
    setLoading(true);
    setActiveRequest("sync-all");
    setError(null);
    setResult(null);

    try {
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL must be configured in production.");
      }

      const response = await fetch(`${backendUrl}/api/pdu/sync-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || `API request failed with status ${response.status}`;
        const statusLabel = response.status === 401 ? "Unauthorized" : response.statusText || "Request failed";
        throw new Error(`${response.status} ${statusLabel}: ${message}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const testPduApi = async (hostname: string) => {
    if (loading) return;
    setLoading(true);
    setActiveRequest("pdu");
    setError(null);
    setResult(null);

    try {
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL must be configured in production.");
      }
      const response = await fetch(
        `${backendUrl}/api/pdu?hostname=${encodeURIComponent(hostname)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
      setActiveRequest(null);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark text-text dark:text-text-dark p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">API Testing Console</h1>

        {loading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            Only one API test can run at a time. Please wait for the current request to finish.
          </div>
        )}

        {isProductionUsingLocalhost && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Production configuration warning: the backend URL is set to localhost. Configure
            <code className="mx-1">NEXT_PUBLIC_BACKEND_URL</code> with the production backend URL.
          </div>
        )}

        {/* Test Sync-All API */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-semibold">POST /api/pdu/sync-all</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manually trigger full PDU synchronization and metadata extraction
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Function:</strong> Scans network for PDUs, extracts SNMP
                info, parses metadata from hostnames, updates database
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                <strong>Request Body:</strong> Empty POST request (no parameters)
              </p>
            </div>

            <button
              type="button"
              onClick={testSyncAllApi}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              {loading ? (
                <>
                  <Loader className="inline mr-2 animate-spin" size={16} />
                  Testing...
                </>
              ) : (
                "Test Sync-All API"
              )}
            </button>
          </div>
        </div>

        {/* Test PDU API */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-semibold">GET /api/pdu</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Retrieve PDU information from database by hostname
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Function:</strong> Get complete PDU info from database
                including all 12 fields
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                <strong>Query Parameter:</strong> hostname (required)
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  testPduApi("pdu-odcdh3-b12-2.amd.com")
                }
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition text-sm"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={14} />
                    Testing...
                  </>
                ) : (
                  "Test: pdu-odcdh3-b12-2.amd.com"
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  testPduApi("pdu-odcdh1-a12.amd.com")
                }
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition text-sm"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={14} />
                    Testing...
                  </>
                ) : (
                  "Test: pdu-odcdh1-a12.amd.com"
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  testPduApi("pdu-odcdh4-wbd1.amd.com")
                }
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition text-sm"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={14} />
                    Testing...
                  </>
                ) : (
                  "Test: pdu-odcdh4-wbd1.amd.com"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                  Error
                </h3>
                <p className="text-red-700 dark:text-red-400 font-mono text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-4 mb-6">
              {result.status === "success" ? (
                <>
                  <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0 mt-1" size={28} />
                  <div>
                    <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                      Success
                    </h3>
                    <p className="text-green-700 dark:text-green-400 mt-1">
                      {result.message}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" size={28} />
                  <div>
                    <h3 className="text-2xl font-bold text-red-800 dark:text-red-300">
                      Failed
                    </h3>
                    <p className="text-red-700 dark:text-red-400 mt-1">
                      {result.message}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* API Response Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Full Response:
              </h4>
              <pre className="text-xs overflow-auto bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {/* Sync Results Summary (if sync-all response) */}
            {result.sync_result && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.sync_result.pdu_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total PDUs
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.sync_result.successful_updates}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Successful Updates
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.sync_result.failed_updates}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Failed Updates
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {result.sync_result.pdu_count > 0
                      ? (
                          (result.sync_result.successful_updates /
                            result.sync_result.pdu_count) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Success Rate
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
