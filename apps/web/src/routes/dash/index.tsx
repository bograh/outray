import { createFileRoute } from "@tanstack/react-router";
import { Activity, Network, Globe } from "lucide-react";

export const Route = createFileRoute("/dash/")({
  component: OverviewView,
});

function OverviewView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverviewCard
          title="Total Requests"
          value="1.2M"
          change="+12%"
          icon={<Activity size={20} />}
        />
        <OverviewCard
          title="Active Tunnels"
          value="3"
          change="+1"
          icon={<Network size={20} />}
        />
        <OverviewCard
          title="Data Transfer"
          value="45 GB"
          change="+5%"
          icon={<Globe size={20} />}
        />
      </div>

      <div className="bg-black border border-white/5 rounded-lg p-6 h-96 flex items-center justify-center text-gray-500">
        Chart Placeholder
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group bg-black border border-white/5 rounded-lg p-4 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
          {icon}
        </div>
        <span className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {title}
      </div>
    </div>
  );
}
