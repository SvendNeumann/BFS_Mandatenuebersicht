import MonitorApp from "@/components/monitor-app";

export default function UsersPage() {
  return <MonitorApp lockedRole="super_admin" initialView="users" />;
}
