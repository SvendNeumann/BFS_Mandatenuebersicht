import { MonitorAppLoader } from "@/components/monitor-app-loader";

export default function ReportsPage() {
  return <MonitorAppLoader lockedRole="super_admin" initialView="reports" />;
}
