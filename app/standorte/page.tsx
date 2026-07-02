import { MonitorAppLoader } from "@/components/monitor-app-loader";

export default function LocationsPage() {
  return <MonitorAppLoader lockedRole="super_admin" initialView="locations" />;
}
