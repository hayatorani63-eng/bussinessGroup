"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getScenarios, updateScenario, getComments, addComment, updateComment, deleteComment, subscribeToSingleScenario, subscribeToComments, subscribeToQuickLabels, addQuickLabel, updateQuickLabel, deleteQuickLabel, getQuickLabels } from "@/lib/storage";
import { Scenario, Comment, QuickLabel } from "@/types";
import { formatDate } from "@/lib/utils";

function ScenarioContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const scenarioId = searchParams.get("scenarioId");

    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editStatus, setEditStatus] = useState<Scenario['status']>('writing');
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [authorName, setAuthorName] = useState("");

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [quickLabels, setQuickLabels] = useState<QuickLabel[]>([]);
    const [isManagingLabels, setIsManagingLabels] = useState(false);
    const [newLinkLabel, setNewLinkLabel] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isSeedingRef = useRef(false);

    const SUGGESTED_NAMES = ["元田", "武田"];

    useEffect(() => {
        if (!id || !scenarioId) return;

        // Real-time scenario listener
        const unsubscribeScenario = subscribeToSingleScenario(scenarioId, (current) => {
            if (current) {
                setScenario(current);
                // Only update edit states if not currently editing to avoid jumping cursor
                if (!isEditing) {
                    setEditTitle(current.title);
                    setEditContent(current.content);
                    setEditUrl(current.url || "");
                    setEditStatus(current.status || 'writing');
                }
            }
        });

        // Real-time comments listener
        const unsubscribeComments = subscribeToComments(scenarioId, (allComments) => {
            setComments(allComments);
        });

        // Real-time quick labels listener
        const unsubscribeLabels = subscribeToQuickLabels((labels) => {
            if (labels.length === 0) {
                if (!isSeedingRef.current) {
                    isSeedingRef.current = true;
                    const seed = async () => {
                        try {
                            const initial = ["ザキ", "男", "女"];
                            for (let i = 0; i < initial.length; i++) {
                                await addQuickLabel(initial[i], i);
                            }
                        } catch (e) {
                            console.error("Seeding failed:", e);
                            isSeedingRef.current = false;
                        }
                    };
                    seed();
                }
            } else {
                setQuickLabels(labels);
            }
        });

        return () => {
            unsubscribeScenario();
            unsubscribeComments();
            unsubscribeLabels();
        };
    }, [id, scenarioId, isEditing]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !authorName.trim() || !scenarioId) return;
        await addComment(scenarioId, authorName, newComment);
        setNewComment("");
    };

    const handleUpdateComment = async (commentId: string) => {
        if (!editCommentText.trim()) return;
        await updateComment(commentId, editCommentText);
        setEditingCommentId(null);
        setEditCommentText("");
    };

    const handleDeleteComment = async (commentId: string) => {
        if (confirm("コメントを削除してもよろしいですか？")) {
            await deleteComment(commentId);
        }
    };

    const handleSave = async () => {
        if (!scenarioId) return;

        // Validation
        if (!editTitle.trim()) {
            alert("タイトルを入力してください。");
            return;
        }
        if (!editContent.trim()) {
            alert("本文を入力してください。");
            return;
        }

        setIsSaving(true);
        try {
            await updateScenario(scenarioId, {
                title: editTitle,
                content: editContent,
                url: editUrl,
                status: editStatus
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save scenario:", error);
            alert("保存に失敗しました。ネットワーク状況を確認して再度お試しください。");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (scenario) {
            setEditTitle(scenario.title);
            setEditContent(scenario.content);
            setEditUrl(scenario.url || "");
            setEditStatus(scenario.status || 'writing');
        }
        setIsEditing(false);
    };

    const insertQuickLabel = (e: React.MouseEvent, label: string) => {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop; // Save scroll position
        const textToInsert = label;

        const newContent = editContent.substring(0, start) + textToInsert + editContent.substring(end);
        setEditContent(newContent);

        // Reset cursor position and focus back to textarea
        setTimeout(() => {
            textarea.focus({ preventScroll: true });
            textarea.scrollTop = scrollTop; // Restore scroll position
            const newCursorPos = start + textToInsert.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleAddLabel = async () => {
        if (!newLinkLabel.trim()) return;
        await addQuickLabel(newLinkLabel.trim(), quickLabels.length);
        setNewLinkLabel("");
    };

    const handleUpdateLabel = async (id: string, newText: string) => {
        if (!newText.trim()) return;
        await updateQuickLabel(id, newText.trim());
    };

    const handleDeleteLabel = async (id: string) => {
        if (confirm("削除してもよろしいですか？")) {
            await deleteQuickLabel(id);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'writing': return '執筆中';
            case 'fixing': return '修正待ち';
            case 'filmed': return '撮影可能';
            case 'published': return '投稿済み';
            default: return '執筆中';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'writing': return { bg: '#444', color: '#ccc' };
            case 'fixing': return { bg: 'rgba(33, 150, 243, 0.2)', color: '#2196f3' };
            case 'filmed': return { bg: 'rgba(255, 171, 0, 0.2)', color: '#ffab00' };
            case 'published': return { bg: 'rgba(0, 200, 83, 0.2)', color: '#00c853' };
            default: return { bg: '#444', color: '#ccc' };
        }
    };

    if (!scenario) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
                <p className="muted">シナリオを読み込み中...</p>
                <Link href={id ? `/business?id=${id}` : "/"} className="muted" style={{ textDecoration: 'underline' }}>一覧へ戻る</Link>
            </div>
        );
    }

    return (
        <main className="container fade-in" style={{ maxWidth: '1100px' }}>
            <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} className="no-print">
                    <Link href={`/business?id=${id}`} className="muted">← シナリオ一覧へ戻る</Link>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px' }}>
                                    編集する
                                </button>
                                <button onClick={() => window.print()} style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px' }}>
                                    PDFとして保存
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        background: isSaving ? 'var(--border)' : 'var(--accent)',
                                        color: '#000',
                                        padding: '0.5rem 1.5rem',
                                        fontSize: '0.9rem',
                                        borderRadius: '20px',
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.7 : 1
                                    }}
                                >
                                    {isSaving ? "保存中..." : "保存"}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border)',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.9rem',
                                        borderRadius: '20px',
                                        opacity: isSaving ? 0.5 : 1
                                    }}
                                >
                                    キャンセル
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {!isEditing ? (
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="no-print">
                            <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '4px', backgroundColor: getStatusColor(scenario.status || 'writing').bg, color: getStatusColor(scenario.status || 'writing').color, fontWeight: 600 }}>
                                {getStatusLabel(scenario.status || 'writing')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }} className="flex-responsive">
                            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{scenario.title}</h1>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatDate(scenario.createdAt)}</span>
                        </div>
                        {scenario.url && (
                            <div style={{ marginTop: '0.5rem' }} className="no-print">
                                <a href={scenario.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'underline' }}>
                                    {scenario.url}
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ borderBottom: '1px solid var(--accent)', paddingBottom: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                <option value="writing">執筆中</option>
                                <option value="fixing">修正待ち</option>
                                <option value="filmed">撮影可能</option>
                                <option value="published">投稿済み</option>
                            </select>
                        </div>
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ fontSize: '2.5rem', background: 'transparent', border: 'none', width: '100%', padding: 0, fontWeight: 300, color: 'var(--foreground)', outline: 'none' }} placeholder="タイトルを編集..." autoFocus />
                    </div>
                )}
                {isEditing && (
                    <div style={{ marginTop: '1rem' }}>
                        <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} style={{ width: '100%', background: 'transparent', borderBottom: '1px solid var(--border)', color: 'var(--accent)', fontSize: '0.9rem', padding: '0.5rem 0' }} placeholder="参考リンク (URL) を入力..." />
                    </div>
                )}
            </header>

            <div className="readable-container" style={{ maxWidth: isEditing ? '1000px' : '720px' }}>
                {!isEditing ? (
                    <>
                        <article style={{ background: 'transparent', padding: 0, lineHeight: '2.2', letterSpacing: '0.01em' }}>
                            <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.15rem', color: 'var(--foreground)', wordBreak: 'break-word' }}>{scenario.content}</p>
                        </article>

                        <section style={{ marginTop: '6rem', borderTop: '1px solid var(--border)', paddingTop: '3rem' }} className="no-print">
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 500 }}>フィードバック・コメント</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                                {comments.map((c: Comment) => (
                                    <div key={c.id} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.9rem' }}>{c.author}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.8rem' }} className="no-print">
                                                {editingCommentId === c.id ? (
                                                    <>
                                                        <button onClick={() => handleUpdateComment(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>保存</button>
                                                        <button onClick={() => setEditingCommentId(null)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>止める</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>編集</button>
                                                        <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'transparent', border: 'none', color: '#ff4b2b', fontSize: '0.75rem', cursor: 'pointer', padding: 0, opacity: 0.6 }}>削除</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {editingCommentId === c.id ? (
                                            <textarea value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} style={{ width: '100%', minHeight: '60px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '0.5rem', fontSize: '0.9rem', outline: 'none' }} autoFocus />
                                        ) : (
                                            <p style={{ fontSize: '0.95rem', margin: 0, color: '#aaa', whiteSpace: 'pre-wrap' }}>{c.text}</p>
                                        )}
                                    </div>
                                ))}
                                {comments.length === 0 && <p className="muted" style={{ fontSize: '0.9rem', textAlign: 'center', paddingTop: '1rem', paddingBottom: '1rem' }}>まだコメントはありません。</p>}
                            </div>

                            <div className="card" style={{ padding: '1.5rem', background: 'var(--surface)' }}>
                                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem' }} className="muted">発言者:</span>
                                        {SUGGESTED_NAMES.map(name => (
                                            <button key={name} type="button" onClick={() => setAuthorName(name)} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', background: authorName === name ? 'var(--accent)' : 'transparent', color: authorName === name ? '#000' : 'var(--accent)', border: '1px solid var(--accent)' }}>{name}</button>
                                        ))}
                                        <input type="text" placeholder="自由入力..." value={authorName} onChange={(e) => setAuthorName(e.target.value)} style={{ flex: 1, minWidth: '100px', padding: '4px 8px', fontSize: '0.85rem' }} />
                                    </div>
                                    <textarea placeholder="フィードバックを入力..." rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ resize: 'none' }} />
                                    <button type="submit" disabled={!newComment.trim() || !authorName.trim()} style={{ alignSelf: 'flex-end', padding: '0.5rem 2rem' }}>送信</button>
                                </form>
                            </div>
                        </section>
                    </>
                ) : (
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }} className="flex-responsive">
                        <div className="no-print" style={{
                            position: 'sticky',
                            top: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            minWidth: '120px',
                            background: 'var(--surface)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>クイック入力</span>
                                <button type="button" onClick={() => setIsManagingLabels(!isManagingLabels)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', padding: 0, opacity: 0.7 }}>
                                    {isManagingLabels ? '終了' : '編集'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {quickLabels.map(ql => (
                                    <div key={ql.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {isManagingLabels ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={ql.label}
                                                    onChange={(e) => handleUpdateLabel(ql.id, e.target.value)}
                                                    style={{ padding: '2px 4px', fontSize: '0.8rem', flex: 1, minWidth: '0' }}
                                                />
                                                <button type="button" onClick={() => handleDeleteLabel(ql.id)} style={{ color: '#ff4b2b', background: 'transparent', border: 'none', fontSize: '1rem', padding: '0 4px' }}>×</button>
                                            </>
                                        ) : (
                                            <button type="button" onClick={(e) => insertQuickLabel(e, ql.label)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', textAlign: 'left' }}>
                                                {ql.label}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {isManagingLabels && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="新規追加..."
                                        value={newLinkLabel}
                                        onChange={(e) => setNewLinkLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.8rem', marginBottom: '0.4rem' }}
                                    />
                                    <button type="button" onClick={handleAddLabel} style={{ width: '100%', padding: '4px', fontSize: '0.75rem', background: 'var(--accent)', color: '#000' }}>追加</button>
                                </div>
                            )}
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={{
                                flex: 1,
                                minHeight: '70vh',
                                fontSize: '1.15rem',
                                lineHeight: '2.2',
                                background: 'var(--surface)',
                                padding: '2rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                resize: 'none',
                                color: 'var(--foreground)',
                                outline: 'none'
                            }}
                            placeholder="本文を入力..."
                        />
                    </div>
                )}
            </div>

            <footer style={{ marginTop: '5rem', textAlign: 'center' }} className="no-print">
                <p className="muted">End of Scenario</p>
            </footer>
        </main>
    );
}

export default function ScenarioDetailPage() {
    return (
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}><p className="muted">読み込み中...</p></div>}>
            <ScenarioContent />
        </Suspense>
    );
}
