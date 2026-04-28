"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // TinaCMS admin is served as static HTML by tinacms build
    window.location.href = "/admin/index.html";
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm opacity-50">Loading admin...</p>
    </div>
  );
}
