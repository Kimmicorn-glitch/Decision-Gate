"use client";

import { useEffect, useState } from "react";

import AuditLogTable from "@/components/AuditLogTable";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { fetchAuditLog } from "@/lib/api";
import { AuditRecord } from "@/lib/types";

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("adg_admin_token")) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAuditLog();
        setRecords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load audit log");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <AuthGate>
      <main className="grid-overlay min-h-screen">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
          <Header />
          <AuditLogTable records={records} isLoading={isLoading} />
          {error && <Toast message={error} onDismiss={() => setError(null)} />}
        </div>
      </main>
    </AuthGate>
  );
}
