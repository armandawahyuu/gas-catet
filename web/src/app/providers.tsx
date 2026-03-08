"use client";

import { AuthProvider } from "@/lib/auth";
import PageTracker from "@/components/PageTracker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PageTracker />
      {children}
    </AuthProvider>
  );
}
