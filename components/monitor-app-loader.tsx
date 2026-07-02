"use client";

import dynamic from "next/dynamic";
import { AppLoadingScreen } from "@/components/monitor-loading";
import type { AppRole } from "@/lib/types";

type MonitorAppLoaderProps = {
  lockedRole?: AppRole;
  initialView?: string;
  requireAuth?: boolean;
};

const MonitorApp = dynamic(() => import("@/components/monitor-app"), {
  loading: () => <AppLoadingScreen title="Dashboard wird geladen" message="App-Modul und Datenstand werden vorbereitet." />
});

export function MonitorAppLoader(props: MonitorAppLoaderProps) {
  return <MonitorApp {...props} />;
}
