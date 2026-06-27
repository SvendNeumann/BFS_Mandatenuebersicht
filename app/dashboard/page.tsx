import MonitorApp from "@/components/monitor-app";

export default function DashboardPage() {
  return <MonitorApp lockedRole="super_admin" initialView="dashboard" />;
}
