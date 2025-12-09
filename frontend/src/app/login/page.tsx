"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [initialCash, setInitialCash] = useState<string>("1000000");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/?initialCash=" + initialCash);
    }
  }, [user, loading, router, initialCash]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          <p className="text-sm text-gray-600 mt-2">Google でログインし、初期残高を設定してください。</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">初期残高（円）</label>
          <input
            type="number"
            value={initialCash}
            onChange={(e) => setInitialCash(e.target.value)}
            className="w-full border rounded px-3 py-2"
            min={0}
          />
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700"
        >
          Googleでログイン
        </button>
      </div>
    </main>
  );
}
