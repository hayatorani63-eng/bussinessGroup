"use client";

import { getBusinesses, addBusiness, updateBusiness, deleteBusiness, migrateLocalStorageToFirestore } from "@/lib/storage";
import { Business } from "@/types";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    const init = async () => {
      await migrateLocalStorageToFirestore();
      const data = await getBusinesses();
      setBusinesses(data);
    };
    init();
  }, []);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) return;

    const newBiz = await addBusiness(newBusinessName);
    setBusinesses(prev => [...prev, newBiz]);
    setNewBusinessName("");
  };

  const handleStartEdit = (e: React.MouseEvent, biz: Business) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(biz.id);
    setEditingName(biz.name);
  };

  const handleSaveEdit = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingName.trim()) return;
    const updated = await updateBusiness(id, editingName);
    if (updated) {
      setBusinesses(prev => prev.map(b => b.id === id ? updated : b));
      setEditingId(null);
    }
  };

  const handleDeleteBusiness = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("事業を削除してもよろしいですか？この操作は取り消せません。")) {
      const success = await deleteBusiness(id);
      if (success) {
        setBusinesses(prev => prev.filter(b => b.id !== id));
      }
    }
  };

  return (
    <main className="container fade-in">
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem' }}>事業別シナリオ管理</h1>
        <p className="muted">選択または新規作成して開始します</p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>事業一覧</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {businesses.map((biz) => (
            <Link href={`/business?id=${biz.id}`} key={biz.id} className="card" style={{ display: 'block', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
              {editingId === biz.id ? (
                <div onClick={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={(e) => handleSaveEdit(e, biz.id)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>保存</button>
                    <button onClick={() => setEditingId(null)} className="muted" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)' }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--foreground)' }}>{biz.name || "(無題)"}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={(e) => handleStartEdit(e, biz)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', padding: '4px', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
                        title="編集"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleDeleteBusiness(e, biz.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4b2b', padding: '4px', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6 }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>ID: {biz.id}</div>
                </>
              )}
            </Link>
          ))}
          {businesses.length === 0 && (
            <div className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', border: '1px dashed var(--border)', borderRadius: '12px' }}>
              事業が登録されていません。下のフォームから追加してください。
            </div>
          )}
        </div>
      </section>

      <section className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>事業を新規作成</h2>
        <form onSubmit={handleAddBusiness} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newBusinessName}
            onChange={(e) => setNewBusinessName(e.target.value)}
            placeholder="事業名を入力 (例: プロジェクトX)"
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ padding: '0 2rem' }}>追加</button>
        </form>
      </section>
    </main>
  );
}
