import { createFileRoute } from "@tanstack/react-router";
import { Activity, User, Settings, Shield } from "lucide-react";

export const Route = createFileRoute("/dash/activity")({
  component: ActivityView,
});

function ActivityView() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Activity Log
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View recent activity and events in your organization
          </p>
        </div>
      </div>

      <div className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-medium text-white">Recent Events</h3>
        </div>

        <div className="divide-y divide-white/5">
          {/* Mock Activity Data */}
          {[
            {
              icon: <User className="w-4 h-4 text-blue-400" />,
              bg: "bg-blue-500/10",
              title: "User Login",
              desc: "akinloluwami logged in from Chrome on macOS",
              time: "2 minutes ago",
            },
            {
              icon: <Settings className="w-4 h-4 text-purple-400" />,
              bg: "bg-purple-500/10",
              title: "Settings Updated",
              desc: "Organization settings were updated by akinloluwami",
              time: "1 hour ago",
            },
            {
              icon: <Shield className="w-4 h-4 text-green-400" />,
              bg: "bg-green-500/10",
              title: "Security Alert",
              desc: "New API key generated for development environment",
              time: "3 hours ago",
            },
            {
              icon: <Activity className="w-4 h-4 text-orange-400" />,
              bg: "bg-orange-500/10",
              title: "Tunnel Created",
              desc: "New tunnel 'api-prod' was created",
              time: "5 hours ago",
            },
          ].map((event, i) => (
            <div
              key={i}
              className="p-4 flex items-start gap-4 hover:bg-white/2 transition-colors"
            >
              <div className={`p-2 rounded-lg ${event.bg} shrink-0`}>
                {event.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-medium text-sm">
                    {event.title}
                  </h4>
                  <span className="text-xs text-gray-500">{event.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{event.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
