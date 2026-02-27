"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBusinesses, addBusiness } from "@/lib/storage";
import { Business } from "@/types";

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [newBusinessName, setNewBusinessName] = useState("");

  useEffect(() => {
    setBusinesses(getBusinesses());
  }, []);

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) return;

    const newBiz = addBusiness(newBusinessName);
    setBusinesses([...businesses, newBiz]);
    setNewBusinessName("");
  };

  return (
    <main className="container fade-in">
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem' }}>事業別シナリオ管理</h1>
        <p className="muted">選択または新規作成して開始します</p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>事業一覧</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {businesses.map((biz) => (
            <Link href={`/business?id=${biz.id}`} key={biz.id} className="card" style={{ display: 'block', transition: 'border-color 0.2s' }}>
              <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{biz.name}</div>
              <div className="muted">ビジネス ID: {biz.id.slice(0, 8)}...</div>
            </Link>
          ))}
          {businesses.length === 0 && (
            <div className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              事業が登録されていません
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>事業を追加</h2>
        <form onSubmit={handleAddBusiness} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newBusinessName}
            onChange={(e) => setNewBusinessName(e.target.value)}
            placeholder="事業名を入力 (例: 事業A)"
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ padding: '0 2rem' }}>追加</button>
        </form>
      </section>
    </main>
  );
}
