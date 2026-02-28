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
                <Link href="/" className="muted" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
                    <span style={{ fontSize: '1.2rem' }}>‹</span> 事業一覧へ戻る
                </Link>
                <div className="card" style={{
                    padding: '2.5rem',
                    background: 'linear-gradient(135deg, rgba(157, 92, 252, 0.1), rgba(0, 0, 0, 0))',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="flex-responsive">
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'block' }}>Business Library</span>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>{business.name}</h1>
                        </div>
                        <button onClick={() => setIsAdding(!isAdding)} style={{ padding: '0.6rem 1.5rem', borderRadius: '30px' }}>
                            {isAdding ? 'キャンセル' : '＋ 新規シナリオ'}
                        </button>
                    </div>
                </div>
            </header>

            <section style={{ marginBottom: '3rem' }}>
                <div style={{ position: 'relative', marginBottom: '3rem' }}>
                    <input
                        type="text"
                        placeholder="キーワードで検索 (タイトル・本文)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1.2rem 1.5rem 1.2rem 3.5rem',
                            borderRadius: '40px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: '1rem'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {filteredScenarios.map((s) => {
                        return (
                            <Link href={`/business/scenario?id=${id}&scenarioId=${s.id}`} key={s.id} className="card" style={{
                                display: 'block',
                                textDecoration: 'none',
                                opacity: s.confirmed ? 0.7 : 1,
                                padding: '1.8rem',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem' }}>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                            onMouseDown={(e) => { e.stopPropagation(); }}
                                            style={{ display: 'flex', alignItems: 'center', marginTop: '0.2rem' }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!s.confirmed}
                                                onChange={(e) => handleToggleConfirmation(e, s.id, !!s.confirmed)}
                                                style={{ width: '1.3rem', height: '1.3rem', cursor: 'pointer', borderRadius: '4px' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
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
                                                            fontSize: '0.7rem',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            backgroundColor: getStatusColor(s.status || 'writing').bg,
                                                            color: getStatusColor(s.status || 'writing').color,
                                                            border: 'none',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            appearance: 'none',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >
                                                        <option value="writing">執筆中</option>
                                                        <option value="fixing">修正待ち</option>
                                                        <option value="filmed">撮影可能</option>
                                                        <option value="published">投稿済み</option>
                                                    </select>
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, textDecoration: s.confirmed ? 'line-through' : 'none', color: s.confirmed ? 'var(--text-muted)' : 'var(--foreground)' }}>{s.title}</h3>
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>{formatDate(s.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="no-mobile" style={{ textAlign: 'right' }}>
                                        {s.url && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.9, display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>🔗 {new URL(s.url).hostname}</span>
                                        )}
                                        {allComments.filter((c: Comment) => c.scenarioId === s.id).length > 0 && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                                                💬 {allComments.filter((c: Comment) => c.scenarioId === s.id).length}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-clamp" style={{
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--text-muted)',
                                    textDecoration: s.confirmed ? 'line-through' : 'none',
                                    fontSize: '1rem',
                                    lineHeight: '1.7',
                                    margin: '0.8rem 0 0 0',
                                    paddingLeft: '2.5rem'
                                }}>
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
