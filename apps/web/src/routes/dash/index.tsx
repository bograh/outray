import { createFileRoute } from "@tanstack/react-router";
import { Activity, Network, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { appClient } from "../../lib/app-client";
import { authClient } from "../../lib/auth-client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/dash/")({
  component: OverviewView,
});

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  } else if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  } else if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function OverviewView() {
  const { data: activeOrganization, isLoading: orgLoading } = useQuery({
    queryKey: ["activeOrganization"],
    queryFn: async () => {
      const session = await authClient.getSession();
      return session.data?.session.activeOrganizationId || null;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", "overview", activeOrganization],
    queryFn: async () => {
      if (!activeOrganization) return null;
      const result = await appClient.stats.overview(activeOrganization);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    enabled: !!activeOrganization,
  });

  if (orgLoading || statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white/2 border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-white/5" />
                <div className="w-12 h-5 rounded-full bg-white/5" />
              </div>
              <div className="h-8 w-24 bg-white/5 rounded mb-2" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
          <div className="h-6 w-48 bg-white/5 rounded mb-6" />
          <div className="h-75 w-full bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverviewCard
          title="Total Requests"
          value={formatNumber(stats?.totalRequests || 0)}
          change={
            stats?.requestsChange
              ? `${stats.requestsChange > 0 ? "+" : ""}${stats.requestsChange}%`
              : "—"
          }
          isPositive={stats?.requestsChange ? stats.requestsChange >= 0 : true}
          icon={<Activity size={20} />}
        />
        <OverviewCard
          title="Active Tunnels"
          value={(stats?.activeTunnels ?? 0).toString()}

         
          icon={<Network size={20} />}
        />
        <OverviewCard
          title="Data Transfer"
          value={formatBytes(stats?.totalDataTransfer || 0)}
          change={
            stats?.dataTransferChange
              ? `${stats.dataTransferChange > 0 ? "+" : ""}${stats.dataTransferChange}%`
              : "—"
          }
          isPositive={
            stats?.dataTransferChange ? stats.dataTransferChange >= 0 : true
          }
          icon={<Globe size={20} />}
        />
      </div>

      <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-6">
          Request Activity (Last 24 Hours)
        </h3>
        {!stats?.chartData || stats.chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={stats.chartData.map((d) => ({
                time: new Date(d.hour).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  hour12: false,
                }),
                requests: d.requests,
              }))}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFA62B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFA62B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ fill: "#6b7280" }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#FFA62B" }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#FFA62B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRequests)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  change,
  icon,
  isPositive = true,
}: {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  isPositive?: boolean;
}) {
  const changeColor = isPositive
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="group bg-white/2 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
          {icon}
        </div>
          {change && <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${changeColor}`}
          >
            {change}
          </span>}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {title}
      </div>
    </div>
  );
}
