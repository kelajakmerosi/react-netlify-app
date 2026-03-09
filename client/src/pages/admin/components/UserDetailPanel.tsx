import { useEffect, useState } from 'react'
import { Ban, Calendar, Save, Settings2, ShieldAlert, X, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui'
import { useLang } from '../../../hooks'
import { useToast } from '../../../app/providers/ToastProvider'
import { adminService, type AdminUserSummary, type UserAuditProfile, type UserTransaction, type UserExamAttempt, type UserCompletedSubject } from '../../../services/admin.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import styles from '../AdminWorkspace.module.css'

interface UserDetailPanelProps {
    user: AdminUserSummary | null
    onClose: () => void
    onUserUpdated?: (updatedUser: AdminUserSummary) => void
}

const formatDateTime = (value: string | number | null, locale: string): string => {
    if (!value) return '—'
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val)
}

export default function UserDetailPanel({ user, onClose, onUserUpdated }: UserDetailPanelProps): JSX.Element | null {
    const { t, lang } = useLang()
    const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US'
    const toast = useToast()

    const [activeTab, setActiveTab] = useState<'profile' | 'transactions' | 'exams' | 'subjects'>('profile')
    const [editMode, setEditMode] = useState(false)

    // Edit Form State
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    const [audit, setAudit] = useState<UserAuditProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [savingProfile, setSavingProfile] = useState(false)
    const [savingSuspension, setSavingSuspension] = useState(false)

    const fetchAudit = async () => {
        if (!user?.id) return
        setIsLoading(true)
        setError(null)
        try {
            const data = await adminService.getUserAudit(user.id)
            setAudit(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAudit()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    // Sync edit mode fields when audit data loads
    useEffect(() => {
        if (audit?.profile && !editMode) {
            setFirstName(audit.profile.firstName || '')
            setLastName(audit.profile.lastName || '')
            setEmail(audit.profile.email || '')
            setPhone(audit.profile.phone || '')
        }
    }, [audit?.profile, editMode])

    if (!user) return null

    const handleSaveProfile = async () => {
        if (!user) return
        setSavingProfile(true)
        try {
            const updated = await adminService.updateUserProfile(user.id, { firstName, lastName, email, phone })
            toast.success('Muvaffaqiyatli saqlandi')
            setEditMode(false)
            fetchAudit()
            if (onUserUpdated) onUserUpdated(updated)
        } catch (err: unknown) {
            toast.error(resolveUiErrorMessage(err, t))
        } finally {
            setSavingProfile(false)
        }
    }

    const handleSuspensionToggle = async () => {
        const isCurrentlySuspended = audit?.profile?.isSuspended ?? user.isSuspended ?? false
        const shouldSuspend = !isCurrentlySuspended
        if (shouldSuspend && !window.confirm("Bu foydalanuvchini platformadan to'liq muzlatib qo'ymoqchimisiz?")) {
            return
        }

        setSavingSuspension(true)
        try {
            const updated = await adminService.toggleUserSuspension(user.id, shouldSuspend)
            const msg = updated.isSuspended ? 'Foydalanuvchi muzlatildi' : 'Foydalanuvchi faollashtirildi'
            toast.success(msg)
            fetchAudit()
            if (onUserUpdated) onUserUpdated(updated)
        } catch (err: unknown) {
            toast.error(resolveUiErrorMessage(err, t))
        } finally {
            setSavingSuspension(false)
        }
    }

    const currentProfile = audit?.profile || user
    const isSuspended = Boolean(currentProfile.isSuspended)

    return (
        <div className={styles.sidePanelOverlay} onClick={onClose}>
            <div className={styles.sidePanel} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-3)', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 600 }}>
                                {currentProfile.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {currentProfile.name}
                                    {isSuspended && <Ban size={16} color="var(--danger)" />}
                                    {currentProfile.role === 'admin' && <ShieldAlert size={16} color="var(--accent)" />}
                                </h2>
                                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>ID: {currentProfile.id}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: 0, color: 'var(--text-2)', cursor: 'pointer', padding: 4 }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={styles.adminTag} style={{ background: isSuspended ? 'color-mix(in srgb, var(--danger) 15%, transparent)' : 'color-mix(in srgb, var(--success) 15%, transparent)', color: isSuspended ? 'var(--danger)' : 'var(--success)', borderColor: 'transparent' }}>
                            {isSuspended ? 'Muzlatilgan' : 'Faol'}
                        </span>
                        <span className={styles.adminTag}>
                            {currentProfile.role === 'admin' || currentProfile.role === 'superadmin' ? 'Administrator' : "O'quvchi"}
                        </span>
                        <Button
                            variant={isSuspended ? "ghost" : "danger"}
                            size="sm"
                            onClick={() => void handleSuspensionToggle()}
                            disabled={savingSuspension}
                        >
                            {savingSuspension ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                            <span style={{ marginLeft: 6 }}>{isSuspended ? 'Faollashtirish' : 'Muzlatish'}</span>
                        </Button>
                    </div>

                    {/* Local Tab Rail */}
                    <div className={styles.tabRailSegmented} style={{ marginTop: 8 }}>
                        <button role="tab" aria-selected={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
                            Profil
                        </button>
                        <button role="tab" aria-selected={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')}>
                            To'lovlar
                        </button>
                        <button role="tab" aria-selected={activeTab === 'exams'} onClick={() => setActiveTab('exams')}>
                            Imtihonlar
                        </button>
                        <button role="tab" aria-selected={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')}>
                            Fanlar
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                    ) : error ? (
                        <Alert variant="error">
                            {error.message}
                        </Alert>
                    ) : (
                        <>
                            {activeTab === 'profile' && (
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: 18 }}>Shaxsiy ma'lumotlar</h3>
                                        {!editMode ? (
                                            <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                                                <Settings2 size={16} style={{ marginRight: 6 }} /> Tahrirlash
                                            </Button>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Bekor qilish</Button>
                                                <Button variant="primary" size="sm" onClick={() => void handleSaveProfile()} disabled={savingProfile}>
                                                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} style={{ marginRight: 6 }} />}
                                                    Saqlash
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.formGrid}>
                                        <label className={styles.field}>
                                            <span>Ism (First Name)</span>
                                            {editMode ? (
                                                <input className={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
                                            ) : (
                                                <div className={styles.toggleWrap} style={{ background: 'var(--bg-3)' }}>{currentProfile.firstName || '—'}</div>
                                            )}
                                        </label>
                                        <label className={styles.field}>
                                            <span>Familiya (Last Name)</span>
                                            {editMode ? (
                                                <input className={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} />
                                            ) : (
                                                <div className={styles.toggleWrap} style={{ background: 'var(--bg-3)' }}>{currentProfile.lastName || '—'}</div>
                                            )}
                                        </label>
                                        <label className={styles.field}>
                                            <span>Email</span>
                                            {editMode ? (
                                                <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
                                            ) : (
                                                <div className={styles.toggleWrap} style={{ background: 'var(--bg-3)' }}>{currentProfile.email || '—'}</div>
                                            )}
                                        </label>
                                        <label className={styles.field}>
                                            <span>Telefon</span>
                                            {editMode ? (
                                                <input className={styles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                                            ) : (
                                                <div className={styles.toggleWrap} style={{ background: 'var(--bg-3)' }}>{currentProfile.phone || '—'}</div>
                                            )}
                                        </label>
                                        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                            <span>Ro'yxatdan o'tgan sana</span>
                                            <div className={styles.toggleWrap} style={{ background: 'var(--bg-3)' }}><Calendar size={16} /> {formatDateTime(currentProfile.createdAt || null, locale)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'transactions' && (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>Tranzaksiyalar tarixi</h3>
                                    {audit?.transactions.length === 0 ? (
                                        <div className={styles.emptyState}>Tranzaksiyalar topilmadi</div>
                                    ) : (
                                        <div className={styles.tableWrap} style={{ border: '1px solid var(--surface-border)', borderRadius: 8 }}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Sana</th>
                                                        <th>Summa</th>
                                                        <th>Provayder</th>
                                                        <th>Holat</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {audit?.transactions.map((t: UserTransaction) => (
                                                        <tr key={t.id}>
                                                            <td>{formatDateTime(t.createdAt, locale)}</td>
                                                            <td style={{ fontWeight: 600 }}>{formatCurrency(t.amountUzs)}</td>
                                                            <td><span className={styles.adminTag} style={{ background: 'transparent', color: 'var(--text)' }}>{t.provider}</span></td>
                                                            <td>
                                                                <span style={{ color: t.status === 'paid' ? 'var(--success)' : t.status === 'failed' || t.status === 'canceled' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, fontSize: 13 }}>
                                                                    {t.status.toUpperCase()}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'exams' && (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>Imtihon urinishlari</h3>
                                    {audit?.exams.length === 0 ? (
                                        <div className={styles.emptyState}>Imtihon urinishlari topilmadi</div>
                                    ) : (
                                        <div className={styles.tableWrap} style={{ border: '1px solid var(--surface-border)', borderRadius: 8 }}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Imtihon</th>
                                                        <th>Sana</th>
                                                        <th>Natija</th>
                                                        <th>Holat</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {audit?.exams.map((e: UserExamAttempt) => (
                                                        <tr key={e.id}>
                                                            <td>{e.examTitle || 'Noma\'lum imtihon'}</td>
                                                            <td>{formatDateTime(e.startedAt, locale)}</td>
                                                            <td style={{ fontWeight: 600 }}>{e.scorePercent != null ? `${e.scorePercent}%` : '—'}</td>
                                                            <td>
                                                                <span style={{ color: e.status === 'submitted' ? (e.passed ? 'var(--success)' : 'var(--danger)') : 'var(--warning)', fontWeight: 600, fontSize: 13 }}>
                                                                    {e.status === 'submitted' ? (e.passed ? "O'TDI" : "YIQILDI") : e.status.toUpperCase()}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'subjects' && (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>Tugatilgan Fanlar</h3>
                                    {audit?.completedSubjects.length === 0 ? (
                                        <div className={styles.emptyState}>Tugatilgan fanlar topilmadi</div>
                                    ) : (
                                        <div className={styles.subjectList}>
                                            {audit?.completedSubjects.map((s: UserCompletedSubject) => (
                                                <div key={s.id} className={styles.subjectItem}>
                                                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                                                    <div style={{ color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Calendar size={14} /> {formatDateTime(s.lastCompletedAt, locale)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
