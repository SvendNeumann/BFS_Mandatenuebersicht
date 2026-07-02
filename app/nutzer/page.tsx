import { MonitorAppLoader } from "@/components/monitor-app-loader";

export default function UsersPage() {
  return <MonitorAppLoader lockedRole="super_admin" initialView="users" />;
}
