import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Radio,
  X,
  Copy,
  Play,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { appClient } from "@/lib/app-client";
import { authClient } from "@/lib/auth-client";
import { AnimatePresence, motion } from "motion/react";

export const Route = createFileRoute("/$orgSlug/requests")({
  component: RequestsView,
});

interface TunnelEvent {
  timestamp: number;
  tunnel_id: string;
  organization_id: string;
  host: string;
  method: string;
  path: string;
  status_code: number;
  request_duration_ms: number;
  bytes_in: number;
  bytes_out: number;
  client_ip: string;
  user_agent: string;
}

type TimeRange = "live" | "1h" | "24h" | "7d" | "30d";
type InspectorTab = "request" | "response";

const TIME_RANGES = [
  { value: "live" as TimeRange, label: "Live", icon: Radio },
  { value: "1h" as TimeRange, label: "1h" },
  { value: "24h" as TimeRange, label: "24h" },
  { value: "7d" as TimeRange, label: "7d" },
  { value: "30d" as TimeRange, label: "30d" },
];

// Mock data generator for request details
function getMockRequestDetails(req: TunnelEvent) {
  return {
    headers: {
      Host: req.host,
      "User-Agent": req.user_agent,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "X-Forwarded-For": req.client_ip,
      "X-Request-ID": `req_${req.tunnel_id.slice(0, 8)}`,
    },
    queryParams:
      req.path.includes("?")
        ? Object.fromEntries(new URLSearchParams(req.path.split("?")[1]))
        : {},
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify({ example: "request body", timestamp: req.timestamp }, null, 2)
        : null,
  };
}

function getMockResponseDetails(req: TunnelEvent) {
  return {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(req.bytes_out),
      "X-Response-Time": `${req.request_duration_ms}ms`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Request-ID": `req_${req.tunnel_id.slice(0, 8)}`,
      Date: new Date(req.timestamp).toUTCString(),
    },
    body: JSON.stringify(
      {
        success: req.status_code < 400,
        data: req.status_code < 400 ? { id: 1, message: "Sample response" } : null,
        error: req.status_code >= 400 ? "An error occurred" : null,
      },
      null,
      2
    ),
  };
}

function RequestsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<TunnelEvent[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("live");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TunnelEvent | null>(null);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const { orgSlug } = Route.useParams();
  const { data: organizations = [] } = authClient.useListOrganizations();
  const activeOrgId = organizations?.find((org) => org.slug === orgSlug)?.id;
  const wsRef = useRef<WebSocket | null>(null);

  const activeIndex = TIME_RANGES.findIndex((r) => r.value === timeRange);

  const fetchHistoricalRequests = async (range: TimeRange) => {
    if (!orgSlug || range === "live") return;

    setIsLoading(true);
    try {
      const response = await appClient.requests.list(orgSlug, {
        range,
        limit: 100,
        search: searchTerm,
      });
      if ("error" in response) throw new Error(response.error);
      setRequests(response.requests || []);
    } catch (error) {
      console.error("Failed to fetch historical requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange === "live") {
      setRequests([]);
    } else {
      const timer = setTimeout(() => {
        void fetchHistoricalRequests(timeRange);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [timeRange, activeOrgId, searchTerm, orgSlug]);

  useEffect(() => {
    if (!activeOrgId || timeRange !== "live") {
      return;
    }

    const wsUrl = import.meta.env.VITE_TUNNEL_URL;
    const ws = new WebSocket(`${wsUrl}/dashboard/events?orgId=${activeOrgId}`);

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "history") {
          setRequests(message.data);
        } else if (message.type === "log") {
          setRequests((prev) => [message.data, ...prev].slice(0, 100));
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    return () => {
      ws.close();
    };
  }, [activeOrgId, timeRange]);

  const filteredRequests =
    timeRange === "live"
      ? requests.filter(
          (req) =>
            req.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.host.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : requests;

  if (!activeOrgId) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-4 opacity-50 pointer-events-none">
          <div className="relative flex-1 max-w-md">
            <div className="h-10 bg-white/5 rounded-lg w-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 bg-white/5 rounded-lg" />
            <div className="h-10 w-24 bg-white/5 rounded-lg" />
          </div>
        </div>

        <div className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
          <div className="h-10 bg-white/5 border-b border-white/5" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-white/5 flex items-center px-4 gap-4"
            >
              <div className="h-6 w-16 bg-white/5 rounded" />
              <div className="h-4 w-12 bg-white/5 rounded" />
              <div className="h-4 w-48 bg-white/5 rounded flex-1" />
              <div className="h-4 w-24 bg-white/5 rounded" />
              <div className="h-4 w-20 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search requests by path, method or host..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
          />
        </div>

        <div className="relative grid grid-cols-5 items-center bg-white/5 border border-white/10 rounded-xl p-1">
          <div
            className="absolute top-1 bottom-1 left-1 bg-accent rounded-lg transition-all duration-300 ease-out shadow-sm"
            style={{
              width: `calc((100% - 0.5rem) / ${TIME_RANGES.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />

          {TIME_RANGES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                timeRange === value
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {Icon && (
                <Icon
                  size={14}
                  className={timeRange === value ? "animate-pulse" : ""}
                />
              )}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2" />
      </div>

      <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Client IP</th>
                <th className="px-4 py-3 font-medium text-right">Duration</th>
                <th className="px-4 py-3 font-medium text-right">Size</th>
                <th className="px-4 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Loading requests...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {timeRange === "live"
                      ? "Waiting for requests..."
                      : "No requests found in this time range"}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, i) => (
                  <tr
                    key={`${req.tunnel_id}-${req.timestamp}-${i}`}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          req.status_code >= 500
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : req.status_code >= 400
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}
                      >
                        {req.status_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{req.method}</td>
                    <td
                      className="px-4 py-3 text-gray-300 max-w-xs truncate"
                      title={req.path}
                    >
                      {req.path}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{req.host}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {req.client_ip}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {req.request_duration_ms}ms
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatBytes(req.bytes_in + req.bytes_out)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RequestInspectorDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onReplay={() => setIsReplayModalOpen(true)}
        fullCaptureEnabled={false} // TODO: wire up to org settings
      />

      <ReplayModal
        isOpen={isReplayModalOpen}
        onClose={() => setIsReplayModalOpen(false)}
        request={selectedRequest}
      />
    </div>
  );
}


interface RequestInspectorDrawerProps {
  request: TunnelEvent | null;
  onClose: () => void;
  onReplay: () => void;
  fullCaptureEnabled: boolean;
}

function RequestInspectorDrawer({ request, onClose, onReplay, fullCaptureEnabled }: RequestInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("request");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateCurl = (req: TunnelEvent) => {
    const details = getMockRequestDetails(req);
    let curl = `curl -X ${req.method} 'https://${req.host}${req.path}'`;
    Object.entries(details.headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });
    if (details.body) {
      curl += ` \\\n  -d '${details.body.replace(/\n/g, "")}'`;
    }
    return curl;
  };

  if (!request) return null;

  const requestDetails = getMockRequestDetails(request);
  const responseDetails = getMockResponseDetails(request);

  const tabs = [
    { id: "request" as InspectorTab, label: "Request", icon: ArrowUpFromLine },
    { id: "response" as InspectorTab, label: "Response", icon: ArrowDownToLine },
  ];

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0A0A0A] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${
                    request.status_code >= 500
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : request.status_code >= 400
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "bg-green-500/10 text-green-400 border border-green-500/20"
                  }`}
                >
                  {request.status_code}
                </div>
                <span className="font-mono text-white font-medium">{request.method}</span>
                <span className="text-gray-400 truncate max-w-xs" title={request.path}>
                  {request.path}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Actions */}
            {fullCaptureEnabled && (
              <div className="flex items-center gap-2 p-4 border-b border-white/10">
                <button
                  onClick={onReplay}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Play size={16} />
                  Replay Request
                </button>
                <button
                  onClick={() => copyToClipboard(generateCurl(request), "curl")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
                >
                  {copiedField === "curl" ? <Check size={16} /> : <Copy size={16} />}
                  {copiedField === "curl" ? "Copied!" : "Copy as cURL"}
                </button>
              </div>
            )}

            {/* Tabs - only show when full capture is enabled */}
            {fullCaptureEnabled && (
              <div className="flex items-center gap-1 p-4 border-b border-white/10">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === id
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!fullCaptureEnabled ? (
                <FullCaptureDisabledContent request={request} />
              ) : (
                <>
                  {activeTab === "request" && (
                    <RequestTabContent
                      request={request}
                      details={requestDetails}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {activeTab === "response" && (
                    <ResponseTabContent
                      details={responseDetails}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                    />
                  )}
                </>
              )}
            </div>

            {/* Footer metadata */}
            <div className="p-4 border-t border-white/10 bg-white/2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Tunnel ID</span>
                  <p className="text-gray-300 font-mono text-xs mt-1">{request.tunnel_id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Timestamp</span>
                  <p className="text-gray-300 text-xs mt-1">
                    {new Date(request.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FullCaptureDisabledContent({ request }: { request: TunnelEvent }) {
  const { orgSlug } = Route.useParams();

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full border border-accent/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-accent text-xs">i</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white mb-1">Full capture is disabled</p>
            <p className="text-sm text-gray-400 mb-3">
              Only basic request metadata is available. Enable full capture to inspect headers, body, and replay requests.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <a
                href="#"
                className="text-sm text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
              >
                Learn more about data storage
                <span>→</span>
              </a>
              <a
                href={`/${orgSlug}/settings`}
                className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Enable full capture
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* General Info section - shows real data */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">General</span>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">URL</span>
            <span className="text-gray-300 font-mono">
              https://{request.host}{request.path}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Method</span>
            <span className="text-gray-300 font-mono">{request.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-gray-300 font-mono">{request.status_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Client IP</span>
            <span className="text-gray-300 font-mono">{request.client_ip}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="text-gray-300 font-mono">{request.request_duration_ms}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Size</span>
            <span className="text-gray-300 font-mono">{formatBytes(request.bytes_in + request.bytes_out)}</span>
          </div>
        </div>
      </div>

      {/* Skeleton for Headers section */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden opacity-50">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Headers</span>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="h-4 w-24 bg-white/10 rounded" />
              <div className="h-4 flex-1 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton for Body section */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden opacity-50">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Body</span>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${80 - i * 15}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}


interface RequestTabContentProps {
  request: TunnelEvent;
  details: ReturnType<typeof getMockRequestDetails>;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function RequestTabContent({ request, details, copiedField, onCopy }: RequestTabContentProps) {
  return (
    <>
      {/* General Info */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-medium text-white">General</span>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">URL</span>
            <span className="text-gray-300 font-mono">
              https://{request.host}{request.path}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Method</span>
            <span className="text-gray-300 font-mono">{request.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Client IP</span>
            <span className="text-gray-300 font-mono">{request.client_ip}</span>
          </div>
        </div>
      </div>

      {/* Headers */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Headers</span>
          <button
            onClick={() => onCopy(JSON.stringify(details.headers, null, 2), "req-headers")}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {copiedField === "req-headers" ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="p-4 space-y-2 text-sm font-mono">
          {Object.entries(details.headers).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-accent">{key}:</span>
              <span className="text-gray-300 break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Query Params */}
      {Object.keys(details.queryParams).length > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <span className="text-sm font-medium text-white">Query Parameters</span>
          </div>
          <div className="p-4 space-y-2 text-sm font-mono">
            {Object.entries(details.queryParams).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-accent">{key}:</span>
                <span className="text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {details.body && (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Body</span>
            <button
              onClick={() => onCopy(details.body!, "req-body")}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {copiedField === "req-body" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
            {details.body}
          </pre>
        </div>
      )}
    </>
  );
}

interface ResponseTabContentProps {
  details: ReturnType<typeof getMockResponseDetails>;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function ResponseTabContent({ details, copiedField, onCopy }: ResponseTabContentProps) {
  return (
    <>
      {/* Headers */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Headers</span>
          <button
            onClick={() => onCopy(JSON.stringify(details.headers, null, 2), "res-headers")}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {copiedField === "res-headers" ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="p-4 space-y-2 text-sm font-mono">
          {Object.entries(details.headers).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-accent">{key}:</span>
              <span className="text-gray-300 break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Body</span>
          <button
            onClick={() => onCopy(details.body, "res-body")}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {copiedField === "res-body" ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">{details.body}</pre>
      </div>
    </>
  );
}


interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TunnelEvent | null;
}

function ReplayModal({ isOpen, onClose, request }: ReplayModalProps) {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    if (request) {
      const details = getMockRequestDetails(request);
      setMethod(request.method);
      setUrl(`https://${request.host}${request.path}`);
      setHeaders(
        Object.entries(details.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      );
      setBody(details.body || "");
    }
  }, [request]);

  const generateCurl = () => {
    let curl = `curl -X ${method} '${url}'`;
    headers.split("\n").forEach((line) => {
      if (line.trim()) {
        curl += ` \\\n  -H '${line.trim()}'`;
      }
    });
    if (body && method !== "GET" && method !== "HEAD") {
      curl += ` \\\n  -d '${body.replace(/\n/g, "")}'`;
    }
    return curl;
  };

  const copyAsCurl = async () => {
    await navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  if (!request) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl max-h-[90vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Play className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Replay Request</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Method & URL */}
                <div className="flex gap-2">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50"
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => (
                      <option key={m} value={m} className="bg-[#0A0A0A]">
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                    placeholder="https://example.com/api/endpoint"
                  />
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Headers</label>
                  <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50 resize-none"
                    placeholder="Content-Type: application/json"
                  />
                </div>

                {/* Body */}
                {method !== "GET" && method !== "HEAD" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Body</label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50 resize-none"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10">
                <button
                  onClick={copyAsCurl}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
                >
                  {copiedCurl ? <Check size={16} /> : <Copy size={16} />}
                  {copiedCurl ? "Copied!" : "Copy as cURL"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // UI only - would send request here
                      alert("Replay functionality coming soon!");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Play size={16} />
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatBytes(bytes: number, decimals = 0) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
