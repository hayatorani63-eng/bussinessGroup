"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getBusinesses, getScenarios, addScenario, toggleScenarioConfirmation, updateScenario, getComments, subscribeToScenarios } from "@/lib/storage";
import { Business, Scenario, Comment } from "@/types";
import { formatDate } from "@/lib/utils";

function BusinessContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const [business, setBusiness] = useState<Business | null>(null);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [allComments, setAllComments] = useState<Comment[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchInit = async () => {
            const businesses = await getBusinesses();
            const b = businesses.find((bus) => bus.id === id);
            setBusiness(b || null);

            const comments = await getComments();
            setAllComments(comments);
        };
        fetchInit();

        // Real-time scenarios listener
        const unsubscribe = subscribeToScenarios(id, (updatedScenarios) => {
            setScenarios(updatedScenarios);
        });

        return () => unsubscribe();
    }, [id]);

    const handleAddScenario = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim() || !id) return;
        await addScenario(id, newTitle, newContent, newUrl);
        // Scenarios will be updated via onSnapshot
        setNewTitle("");
        setNewContent("");
        setNewUrl("");
        setIsAdding(false);
    };

    const handleToggleConfirmation = async (e: React.MouseEvent | React.ChangeEvent, scenarioId: string, currentStatus: boolean) => {
        e.stopPropagation();
        const newStatus = await toggleScenarioConfirmation(scenarioId, currentStatus);
        setScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, confirmed: newStatus } : s));
    };

    const filteredScenarios = scenarios.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'writing': return { bg: '#444', color: '#ccc' };
            case 'fixing': return { bg: 'rgba(33, 150, 243, 0.2)', color: '#2196f3' };
            case 'filmed': return { bg: 'rgba(255, 171, 0, 0.2)', color: '#ffab00' };
            case 'published': return { bg: 'rgba(0, 200, 83, 0.2)', color: '#00c853' };
            default: return { bg: '#444', color: '#ccc' };
        }
    };

    if (!id || !business) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
                <p className="muted">事業データを読み込んでいます...</p>
                <Link href="/" className="muted" style={{ textDecoration: 'underline' }}>トップへ戻る</Link>
            </div>
        );
    }

    return (
        <main className="container fade-in">
            <header style={{ marginBottom: '3rem' }}>
                <Link href="/" className="muted" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    ‹ 事業一覧へ戻る
                </Link>
                <div style={{
                    padding: '2rem 0',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                }} className="flex-responsive">
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{business.name}</h1>
                    <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Library</span>
                </div>
            </header>

            <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="flex-responsive">
                    <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>シナリオ一覧</h2>
                    <button onClick={() => setIsAdding(!isAdding)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        {isAdding ? 'キャンセル' : '新規作成'}
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                    <input
                        type="text"
                        placeholder="キーワードで検索 (タイトル・本文)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3rem',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            fontSize: '1rem'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                </div>

                {isAdding && (
                    <div className="card fade-in" style={{ marginBottom: '2rem' }}>
                        <form onSubmit={handleAddScenario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="シナリオのタイトル"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="本文を入力..."
                                rows={5}
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                style={{ resize: 'vertical' }}
                            />
                            <input
                                type="url"
                                placeholder="参考リンク (URL) - 任意"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                style={{ fontSize: '0.9rem' }}
                            />
                            <button type="submit">保存する</button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {filteredScenarios.map((s) => {
                        return (
                            <Link href={`/business/scenario?id=${id}&scenarioId=${s.id}`} key={s.id} className="card" style={{ display: 'block', textDecoration: 'none', opacity: s.confirmed ? 0.6 : 1, padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                            onMouseDown={(e) => { e.stopPropagation(); }}
                                            style={{ display: 'flex', alignItems: 'center', marginTop: '0.3rem' }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!s.confirmed}
                                                onChange={(e) => handleToggleConfirmation(e, s.id, !!s.confirmed)}
                                                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                                    onMouseDown={(e) => { e.stopPropagation(); }}
                                                    style={{ position: 'relative', zIndex: 10 }}
                                                >
                                                    <select
                                                        value={s.status || 'writing'}
                                                        onChange={async (e) => {
                                                            e.stopPropagation();
                                                            const newStatus = e.target.value as any;
                                                            const updated = await updateScenario(s.id, { status: newStatus });
                                                            if (updated) {
                                                                setScenarios(prev => prev.map(item => item.id === s.id ? { ...item, status: newStatus } : item));
                                                            }
                                                        }}
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            backgroundColor: getStatusColor(s.status || 'writing').bg,
                                                            color: getStatusColor(s.status || 'writing').color,
                                                            border: '1px solid currentColor',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            appearance: 'auto',
                                                        }}
                                                    >
                                                        <option value="writing">執筆中</option>
                                                        <option value="fixing">修正待ち</option>
                                                        <option value="filmed">撮影可能</option>
                                                        <option value="published">投稿済み</option>
                                                    </select>
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, textDecoration: s.confirmed ? 'line-through' : 'none' }}>{s.title}</h3>
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(s.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="no-mobile" style={{ textAlign: 'right' }}>
                                        {s.url && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', opacity: 0.8, display: 'block', marginBottom: '0.2rem' }}>🔗 {new URL(s.url).hostname}</span>
                                        )}
                                        {allComments.filter((c: Comment) => c.scenarioId === s.id).length > 0 && (
                                            <span style={{ fontSize: '0.7rem', color: '#888' }}>💬 {allComments.filter((c: Comment) => c.scenarioId === s.id).length} comments</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-clamp" style={{ whiteSpace: 'pre-wrap', color: '#aaa', textDecoration: s.confirmed ? 'line-through' : 'none', fontSize: '0.95rem', lineHeight: '1.6', margin: '0.5rem 0 0 0' }}>
                                    {s.content}
                                </p>
                            </Link>
                        );
                    })}
                    {filteredScenarios.length === 0 && !isAdding && (
                        <div className="muted" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            {searchQuery ? 'キーワードに一致するシナリオがありません' : 'シナリオがありません'}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default function BusinessPage() {
    return (
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}><p className="muted">読み込み中...</p></div>}>
            <BusinessContent />
        </Suspense>
    );
}
