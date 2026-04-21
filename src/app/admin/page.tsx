'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import {
  adminRoleDescriptions,
  adminRoleLabels,
  getRolePermissions,
  isAdminRole,
  type AdminRole
} from '@/lib/authRoles';
import {
  fetchAuditLogs,
  logAuditAction,
  fetchReportAnalytics,
  fetchWeeklyStats,
  fetchCategoryStats,
  createModerationFlag,
  fetchModerationFlags,
  resolveModerationFlag,
  calculatePaginationState,
  type AuditLogEntry,
  type ReportAnalytics,
  type WeeklyStat,
  type CategoryStat,
  type ModerationFlag,
  type FlagType,
  type FlagPriority
} from '@/lib/newFeatures';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { ModerationFlagsPanel } from '@/components/ModerationFlagsPanel';
import { ImageUploadManager } from '@/components/ImageUploadManager';

type ReportItem = {
  id: string;
  created_at: string;
  category: string;
  reporter_name: string | null;
  prodi: string;
  whatsapp: string;
  privacy: string;
  description: string;
  evidence_url: string | null;
  status: string;
  additional_data: Record<string, string> | null;
};

type NewsItem = {
  id: string;
  created_at: string;
  title: string;
  summary: string | null;
  content: string;
  image_urls: string[] | null;
};

type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

type TabName = 'reports' | 'berita' | 'analytics' | 'audit';

const statusMetaMap: Record<string, StatusMeta> = {
  'Menunggu Verifikasi': {
    label: 'Menunggu Verifikasi',
    description: 'Laporan baru masuk, belum disentuh.',
    badgeClass: 'border border-amber-200 bg-amber-50 text-amber-800'
  },
  'Proses Investigasi': {
    label: 'Proses Investigasi',
    description: 'Reporter lagi cek lapangan atau wawancara saksi.',
    badgeClass: 'border border-blue-200 bg-blue-50 text-blue-800'
  },
  'Arsip Internal': {
    label: 'Arsip Internal',
    description: 'Valid, tapi cuma buat simpenan data (tidak terbit).',
    badgeClass: 'border border-slate-200 bg-slate-100 text-slate-700'
  },
  'Telah Terbit': {
    label: 'Telah Terbit',
    description: 'Sudah jadi berita di web/IG INTERAKSI.',
    badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  'Ditolak/Tidak Valid': {
    label: 'Ditolak/Tidak Valid',
    description: 'Laporan ngawur atau tanpa bukti sama sekali.',
    badgeClass: 'border border-rose-200 bg-rose-50 text-rose-800'
  }
};

const statusOptions = Object.keys(statusMetaMap);

const additionalDataLabels: Record<string, string> = {
  opini: 'Opini Pelapor',
  redaksi_note: 'Catatan Admin/Redaksi',
  gedung_lokasi: 'Gedung/Lokasi',
  jenis_kerusakan: 'Jenis Kerusakan',
  pihak_terlibat: 'Pihak Terlibat',
  kontak_saksi_cp: 'Kontak Saksi/CP',
  waktu_kejadian: 'Waktu Kejadian',
  detail_lokasi: 'Detail Lokasi'
};

const categoryLabels: Record<string, string> = {
  fasilitas: 'Fasilitas & Infrastruktur',
  akademik: 'Isu Akademik & Birokrasi',
  politik: 'Politik & Organisasi Kampus',
  keamanan: 'Keamanan & Lingkungan',
  lainnya: 'Pelaporan Lainnya'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function isNewsTableMissingError(message: string) {
  return /relation .*news_posts.* does not exist|Could not find the table 'public.news_posts' in the schema cache/i.test(message);
}

function getStatusMeta(status: string): StatusMeta {
  return statusMetaMap[status] ?? statusMetaMap['Menunggu Verifikasi'];
}

function formatAdditionalDataLines(data: Record<string, string> | null, excludedKeys: string[] = []) {
  if (!data) return [] as Array<{ key: string; label: string; value: string }>;

  return Object.entries(data)
    .filter(([key, value]) => !excludedKeys.includes(key) && key !== 'evidence_urls' && key !== 'uploaded_photo_names' && String(value ?? '').trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: additionalDataLabels[key] ?? key.replaceAll('_', ' '),
      value: String(value)
    }));
}

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [hasStatusColumn, setHasStatusColumn] = useState(true);
  const [authError, setAuthError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [statusDraft, setStatusDraft] = useState('Menunggu Verifikasi');
  const [redaksiNoteDraft, setRedaksiNoteDraft] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsPhotos, setNewsPhotos] = useState<File[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [savingNews, setSavingNews] = useState(false);
  const [deletingNewsId, setDeletingNewsId] = useState<string | null>(null);
  const [newsError, setNewsError] = useState('');
  const [newsMessage, setNewsMessage] = useState('');

  const [currentTab, setCurrentTab] = useState<TabName>('reports');

  const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [reportFlags, setReportFlags] = useState<Record<string, ModerationFlag[]>>({});
  const [flagsLoading, setFlagsLoading] = useState(false);
  const modalDepthRef = useRef(0);

  const permissions = useMemo(() => getRolePermissions(adminRole), [adminRole]);
  const roleLabel = adminRole ? adminRoleLabels[adminRole] : 'Belum Ditetapkan';
  const roleDescription = adminRole ? adminRoleDescriptions[adminRole] : 'Role belum terdeteksi dari profiles.';
  const availableTabs = useMemo(
    () => [
      { id: 'reports' as TabName, label: '📋 Laporan' },
      { id: 'berita' as TabName, label: '📰 Berita' },
      { id: 'analytics' as TabName, label: '📊 Analitik' },
      ...(permissions.canViewAuditLog ? [{ id: 'audit' as TabName, label: '📜 Audit Log' }] : [])
    ],
    [permissions.canViewAuditLog]
  );

  const loadCurrentUserRole = async () => {
    const { data, error } = await supabase.rpc('current_user_role');

    if (error) {
      throw new Error('Role akses belum aktif. Jalankan supabase_auth_roles.sql terlebih dahulu.');
    }

    return isAdminRole(data) ? data : null;
  };

  const loadAdminData = async () => {
    const results = await Promise.allSettled([
      fetchReports(),
      fetchNews(),
      loadAnalytics(),
      loadAuditLogs()
    ]);

    const firstFailure = results.find((result) => result.status === 'rejected');
    if (firstFailure && firstFailure.status === 'rejected') {
      console.error('Gagal memuat sebagian data admin:', firstFailure.reason);
    }
  };

  const handleUnauthorizedSession = async (message?: string) => {
    setIsAuthorized(false);
    setIsLoggedIn(false);
    setAdminRole(null);
    setReports([]);
    setAdminEmail('');
    setAuthError(message || 'Akun ini tidak memiliki akses ke dashboard admin.');
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!permissions.canViewAuditLog && currentTab === 'audit') {
      setCurrentTab('reports');
    }
  }, [currentTab, permissions.canViewAuditLog]);

  const fetchReports = async () => {
    const withStatusResult = await supabase
      .from('reports')
      .select('id, created_at, category, reporter_name, prodi, whatsapp, privacy, description, evidence_url, status, additional_data')
      .order('created_at', { ascending: false });

    if (!withStatusResult.error) {
      setHasStatusColumn(true);
      setReports((withStatusResult.data ?? []) as ReportItem[]);
      return;
    }

    const missingStatus = /column\s+reports\.status\s+does not exist/i.test(withStatusResult.error.message);
    if (!missingStatus) {
      setAuthError(withStatusResult.error.message);
      return;
    }

    setHasStatusColumn(false);
    const withoutStatusResult = await supabase
      .from('reports')
      .select('id, created_at, category, reporter_name, prodi, whatsapp, privacy, description, evidence_url, additional_data')
      .order('created_at', { ascending: false });

    if (withoutStatusResult.error) {
      setAuthError(withoutStatusResult.error.message);
      return;
    }

    const normalizedReports = (withoutStatusResult.data ?? []).map((row) => ({
      ...(row as Omit<ReportItem, 'status'>),
      status: 'Menunggu Verifikasi'
    }));

    setReports(normalizedReports as ReportItem[]);
    setAuthError('Kolom status belum ada. Jalankan ulang SQL setup agar admin bisa update status.');
  };

  const fetchNews = async () => {
    const result = await supabase
      .from('news_posts')
      .select('id, created_at, title, summary, content, image_urls')
      .order('created_at', { ascending: false });

    if (result.error) {
      if (isNewsTableMissingError(result.error.message)) {
        setNewsError('Tabel berita belum tersedia. Jalankan supabase_setup.sql terbaru untuk mengaktifkan Berita Terkini.');
        setNewsItems([]);
        return;
      }

      setNewsError(result.error.message);
      setNewsItems([]);
      return;
    }

    setNewsError('');
    setNewsItems((result.data ?? []) as NewsItem[]);
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const analyticsData = await fetchReportAnalytics();
      const weeklyData = await fetchWeeklyStats();
      const categoryData = await fetchCategoryStats();

      setAnalytics(analyticsData);
      setWeeklyStats(weeklyData);
      setCategoryStats(categoryData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data } = await fetchAuditLogs(100, 0);
      setAuditLogs(data as AuditLogEntry[]);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadModerationFlags = async (reports: ReportItem[]) => {
    setFlagsLoading(true);
    try {
      const flagsMap: Record<string, ModerationFlag[]> = {};
      for (const report of reports) {
        const flags = await fetchModerationFlags(report.id);
        flagsMap[report.id] = flags;
      }
      setReportFlags(flagsMap);
    } catch (error) {
      console.error('Failed to load moderation flags:', error);
    } finally {
      setFlagsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const hasSession = Boolean(data.session);
        const email = data.session?.user.email;
        const role = hasSession ? await loadCurrentUserRole() : null;
        const authorized = Boolean(role);

        setIsLoggedIn(hasSession);
        setIsAuthorized(authorized);
        setAdminRole(role);
        setAdminEmail(email || '');

        if (mounted) {
          setSessionReady(true);
        }

        if (hasSession && authorized) {
          void loadAdminData();
        } else if (hasSession && !authorized) {
          await handleUnauthorizedSession('Role profile belum tersedia atau tidak valid. Jalankan migration auth roles dan pastikan user sudah punya profil.');
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Gagal memeriksa sesi admin.');
        if (mounted) {
          setSessionReady(true);
        }
      } finally {
        // sessionReady sudah diset lebih awal agar UI tidak stuck pada loading.
      }
    };

    initialize();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const role = session ? await loadCurrentUserRole() : null;
        const authorized = Boolean(role);
        setIsLoggedIn(Boolean(session));
        setIsAuthorized(authorized);
        setAdminRole(role);
        setAdminEmail(session?.user.email || '');

        if (session && authorized) {
          void loadAdminData();
        } else if (session && !authorized) {
          await handleUnauthorizedSession('Role profile belum tersedia atau tidak valid.');
        } else {
          setReports([]);
          setNewsItems([]);
          setAdminRole(null);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Terjadi kesalahan saat sinkronisasi sesi.');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const visibleReports = useMemo(() => {
    if (categoryFilter === 'all') return reports;
    return reports.filter((report) => report.category === categoryFilter);
  }, [categoryFilter, reports]);

  const paginationState = useMemo(() => {
    return calculatePaginationState(currentPage, reportsPerPage, visibleReports.length);
  }, [currentPage, reportsPerPage, visibleReports.length]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    return visibleReports.slice(startIndex, endIndex);
  }, [visibleReports, currentPage, reportsPerPage]);

  const totalReportsCount = useMemo(() => reports.length, [reports]);
  const backlogCount = useMemo(
    () => reports.filter((report) => report.status === 'Menunggu Verifikasi' || report.status === 'Proses Investigasi').length,
    [reports]
  );
  const publishedCount = useMemo(() => reports.filter((report) => report.status === 'Telah Terbit').length, [reports]);
  const flaggedReportsCount = useMemo(
    () => Object.values(reportFlags).filter((flags) => flags.some((flag) => !flag.resolved_at)).length,
    [reportFlags]
  );

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });

      if (error) {
        setAuthError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthError('');

    const globalLogout = await supabase.auth.signOut({ scope: 'global' });

    if (globalLogout.error) {
      const localLogout = await supabase.auth.signOut({ scope: 'local' });
      if (localLogout.error) {
        setAuthError(`Gagal logout: ${localLogout.error.message}`);
      }
    }

    setIsLoggedIn(false);
    setIsAuthorized(false);
    setAdminRole(null);
    setAdminEmail('');
    setReports([]);
    setNewsItems([]);
    setSelectedReport(null);

    if (typeof window !== 'undefined') {
      window.location.replace('/admin');
    }
  };

  const openDetail = useCallback(async (report: ReportItem) => {
    setSelectedReport(report);
    setStatusDraft(report.status ?? 'Menunggu Verifikasi');
    setRedaksiNoteDraft(String(report.additional_data?.redaksi_note ?? ''));

    if (!reportFlags[report.id]) {
      try {
        const flags = await fetchModerationFlags(report.id);
        setReportFlags((prev) => ({
          ...prev,
          [report.id]: flags
        }));
      } catch (error) {
        console.error('Failed to load flags for report:', error);
      }
    }
  }, [reportFlags]);

  const saveStatus = async () => {
    if (!selectedReport) return;
    if (!permissions.canEditReports) {
      setAuthError('Role monitoring hanya bisa melihat data tanpa mengubah status.');
      return;
    }

    setSavingStatus(true);
    setAuthError('');

    try {
      const cleanedStatus = statusDraft.trim();
      const updatedAdditionalData = {
        ...(selectedReport.additional_data ?? {}),
        redaksi_note: redaksiNoteDraft.trim()
      };

      const { error } = await supabase
        .from('reports')
        .update({ status: cleanedStatus, additional_data: updatedAdditionalData })
        .eq('id', selectedReport.id);

      if (error) {
        const detailedMsg = error.message.includes('check constraint')
          ? `${error.message} (Status: "${cleanedStatus}", length: ${cleanedStatus.length})`
          : error.message;
        throw new Error(detailedMsg);
      }

      await logAuditAction({
        admin_email: adminEmail,
        action: 'update_status',
        table_name: 'reports',
        record_id: selectedReport.id,
        old_values: { status: selectedReport.status },
        new_values: { status: cleanedStatus },
        description: `Status diubah dari ${selectedReport.status} menjadi ${cleanedStatus}`
      });

      setReports((current) =>
        current.map((report) =>
          report.id === selectedReport.id
            ? {
                ...report,
                status: cleanedStatus,
                additional_data: updatedAdditionalData
              }
            : report
        )
      );
      setSelectedReport({ ...selectedReport, status: cleanedStatus, additional_data: updatedAdditionalData });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal update status laporan.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCreateNews = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.canPublishContent) {
      setNewsError('Role monitoring tidak dapat membuat atau mempublikasikan berita.');
      return;
    }

    setNewsError('');
    setNewsMessage('');

    if (!newsTitle.trim() || !newsContent.trim()) {
      setNewsError('Judul dan isi berita wajib diisi.');
      return;
    }

    setSavingNews(true);

    try {
      const uploadedUrls: string[] = [];

      for (const photo of newsPhotos) {
        const extension = photo.name.split('.').pop() ?? 'jpg';
        const fileName = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const upload = await supabase.storage.from('evidence').upload(fileName, photo, { upsert: false });

        if (upload.error) {
          throw new Error(`Gagal upload foto berita: ${upload.error.message}`);
        }

        const publicUrl = supabase.storage.from('evidence').getPublicUrl(fileName).data.publicUrl;
        uploadedUrls.push(publicUrl);
      }

      const mergedImageUrls = editingNewsId ? [...existingImageUrls, ...uploadedUrls] : uploadedUrls;

      if (editingNewsId) {
        const update = await supabase
          .from('news_posts')
          .update({
            title: newsTitle.trim(),
            summary: newsSummary.trim() || null,
            content: newsContent.trim(),
            image_urls: mergedImageUrls
          })
          .eq('id', editingNewsId);

        if (update.error) {
          throw new Error(update.error.message);
        }

        await logAuditAction({
          admin_email: adminEmail,
          action: 'update_news',
          table_name: 'news_posts',
          record_id: editingNewsId,
          description: `Berita diperbarui: ${newsTitle.trim()}`
        });
      } else {
        const insert = await supabase.from('news_posts').insert({
          title: newsTitle.trim(),
          summary: newsSummary.trim() || null,
          content: newsContent.trim(),
          image_urls: mergedImageUrls
        });

        if (insert.error) {
          throw new Error(insert.error.message);
        }

        await logAuditAction({
          admin_email: adminEmail,
          action: 'create_news',
          table_name: 'news_posts',
          description: `Berita dibuat: ${newsTitle.trim()}`
        });
      }

      setNewsTitle('');
      setNewsSummary('');
      setNewsContent('');
      setNewsPhotos([]);
      setEditingNewsId(null);
      setExistingImageUrls([]);
      setNewsMessage(editingNewsId ? 'Berita berhasil diperbarui.' : 'Berita berhasil dipublikasikan.');
      await fetchNews();
      await loadAuditLogs();
    } catch (error) {
      setNewsError(error instanceof Error ? error.message : 'Gagal menambahkan berita.');
    } finally {
      setSavingNews(false);
    }
  };

  const handleEditNews = (news: NewsItem) => {
    if (!permissions.canEditNews) {
      setNewsError('Role monitoring tidak dapat mengedit berita.');
      return;
    }

    setEditingNewsId(news.id);
    setNewsTitle(news.title);
    setNewsSummary(news.summary ?? '');
    setNewsContent(news.content);
    setExistingImageUrls(news.image_urls ?? []);
    setNewsPhotos([]);
    setNewsError('');
    setNewsMessage('Mode edit aktif. Simpan untuk memperbarui berita.');
  };

  const handleCancelEditNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsSummary('');
    setNewsContent('');
    setExistingImageUrls([]);
    setNewsPhotos([]);
    setNewsError('');
    setNewsMessage('');
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!permissions.canDeleteNews) {
      setNewsError('Role ini tidak memiliki izin untuk menghapus berita.');
      return;
    }

    setDeletingNewsId(newsId);
    setNewsError('');
    setNewsMessage('');

    try {
      const remove = await supabase.from('news_posts').delete().eq('id', newsId);

      if (remove.error) {
        throw new Error(remove.error.message);
      }

      await logAuditAction({
        admin_email: adminEmail,
        action: 'delete_news',
        table_name: 'news_posts',
        record_id: newsId,
        description: `Berita dihapus`
      });

      setNewsItems((current) => current.filter((item) => item.id !== newsId));
      if (editingNewsId === newsId) {
        handleCancelEditNews();
      }
      setNewsMessage('Berita berhasil dihapus.');
      await loadAuditLogs();
    } catch (error) {
      setNewsError(error instanceof Error ? error.message : 'Gagal menghapus berita.');
    } finally {
      setDeletingNewsId(null);
    }
  };

  const handleAddFlag = async (flagType: FlagType, priority: FlagPriority, description: string) => {
    if (!selectedReport || !adminEmail) return;
    if (!permissions.canModerateContent) {
      setAuthError('Role monitoring hanya bisa membaca data moderasi.');
      return;
    }

    try {
      await createModerationFlag(
        {
          report_id: selectedReport.id,
          flag_type: flagType,
          priority: priority,
          description: description
        },
        adminEmail
      );

      const updatedFlags = await fetchModerationFlags(selectedReport.id);
      setReportFlags((prev) => ({
        ...prev,
        [selectedReport.id]: updatedFlags
      }));

      await loadAuditLogs();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal membuat flag');
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    if (!selectedReport || !adminEmail) return;
    if (!permissions.canModerateContent) {
      setAuthError('Role monitoring hanya bisa membaca data moderasi.');
      return;
    }

    try {
      await resolveModerationFlag(flagId, adminEmail);

      const updatedFlags = await fetchModerationFlags(selectedReport.id);
      setReportFlags((prev) => ({
        ...prev,
        [selectedReport.id]: updatedFlags
      }));

      await loadAuditLogs();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal menyelesaikan flag');
    }
  };

  const closeSelectedReport = useCallback(() => {
    setSelectedReport(null);
  }, []);

  const requestCloseSelectedReport = useCallback(() => {
    if (typeof window !== 'undefined' && modalDepthRef.current > 0) {
      window.history.back();
      return;
    }

    closeSelectedReport();
  }, [closeSelectedReport]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedReport && modalDepthRef.current === 0) {
      window.history.pushState({ __modal: 'admin-report-detail' }, '', window.location.href);
      modalDepthRef.current = 1;
      return;
    }

    if (!selectedReport && modalDepthRef.current > 0) {
      modalDepthRef.current = 0;
    }
  }, [selectedReport]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalDepthRef.current > 0) {
        event.preventDefault();
        requestCloseSelectedReport();
      }
    };

    const handlePopState = () => {
      if (modalDepthRef.current > 0) {
        closeSelectedReport();
        modalDepthRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeSelectedReport, requestCloseSelectedReport]);

  if (!sessionReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-slate-900">
        <div className="glass-panel rounded-[2rem] px-8 py-10 text-center shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-navy-700">INTERAKSI</p>
          <h1 className="mt-3 text-2xl font-bold text-navy-950">Memeriksa sesi admin...</h1>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10 text-slate-900">
        <section className="glass-panel w-full max-w-lg rounded-[2rem] p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">Admin Access</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-950">Login Admin INTERAKSI</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">Masuk dengan Email/Password.</p>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </div>
          )}

          {authError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</div>}

          <form className="mt-6 space-y-4" onSubmit={handleEmailLogin}>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="Email admin"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-navy-200 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Memproses login...' : 'Login dengan Email'}
            </button>
          </form>

          <Link href="/" className="mt-4 block text-center text-sm font-semibold text-navy-700 hover:text-navy-900">
            Kembali ke beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="editorial-shell min-h-screen px-4 py-6 text-slate-900 md:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-navy-700">INTERAKSI Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">Dashboard Laporan Mahasiswa</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Pantau laporan, atur status redaksi, kelola moderasi konten, dan analitik mendalam.</p>
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm text-cyan-900">
                <span className="font-semibold">Hak Akses:</span>
                <span className="font-bold">{roleLabel}</span>
                <span className="text-cyan-700/80">{roleDescription}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
              >
                Beranda
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-navy-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Laporan Masuk" value={totalReportsCount} tone="navy" />
            <AdminMetricCard label="Backlog Verifikasi" value={backlogCount} tone="amber" />
            <AdminMetricCard label="Sudah Terbit" value={publishedCount} tone="emerald" />
            <AdminMetricCard label="Flag Aktif" value={flaggedReportsCount} tone="rose" />
          </div>
        </header>

        <div className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-4">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  currentTab === tab.id
                    ? 'bg-navy-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-navy-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {currentTab === 'reports' && (
          <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            {authError && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{authError}</div>
            )}

            {!hasStatusColumn && (
              <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Kolom status belum tersedia di tabel reports. Dashboard tetap bisa melihat data, tapi update status perlu SQL migration.
              </div>
            )}

            <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Data Reports</p>
                <h2 className="mt-1 text-2xl font-bold text-navy-950">Semua laporan masuk</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-slate-600">Filter Kategori</label>
                <select
                  value={categoryFilter}
                  title="Filter Kategori"
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                >
                  <option value="all">Semua</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Timestamp</th>
                      <th className="px-5 py-4 font-semibold">Category</th>
                      <th className="px-5 py-4 font-semibold">Reporter</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Status Privasi</th>
                      <th className="px-5 py-4 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedReports.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-sm text-slate-500" colSpan={6}>
                          Belum ada laporan untuk filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      paginatedReports.map((report) => (
                        <tr key={report.id} className="align-top">
                          <td className="px-5 py-4 text-slate-600">{formatDate(report.created_at)}</td>
                          <td className="px-5 py-4 font-medium text-navy-900">{categoryLabels[report.category] ?? report.category}</td>
                          <td className="px-5 py-4 text-slate-600">
                            <div className="font-medium text-slate-900">{report.reporter_name || 'Anonim'}</div>
                            <div className="text-xs text-slate-500">{report.prodi}</div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={report.status} />
                          </td>
                          <td className="px-5 py-4 text-slate-600">{report.privacy}</td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openDetail(report)}
                              className="rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {paginationState.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  Halaman {paginationState.currentPage} dari {paginationState.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!paginationState.hasPreviousPage}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(paginationState.totalPages, p + 1))}
                    disabled={!paginationState.hasNextPage}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {currentTab === 'berita' && (
          <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            <div className="border-b border-slate-200/70 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Berita Terkini</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Kelola berita dari hasil laporan</h2>
              {editingNewsId && (
                <p className="mt-2 text-sm text-navy-700">Sedang mengedit berita. Foto baru akan ditambahkan ke galeri yang sudah ada.</p>
              )}
            </div>

            {!permissions.canPublishContent && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Role monitoring hanya dapat membaca berita yang sudah terbit.
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleCreateNews}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(event) => setNewsTitle(event.target.value)}
                  disabled={!permissions.canPublishContent}
                  placeholder="Judul berita"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                />
                <input
                  type="text"
                  value={newsSummary}
                  onChange={(event) => setNewsSummary(event.target.value)}
                  disabled={!permissions.canPublishContent}
                  placeholder="Ringkasan berita (opsional)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                />
              </div>

              <textarea
                value={newsContent}
                onChange={(event) => setNewsContent(event.target.value)}
                disabled={!permissions.canPublishContent}
                rows={6}
                placeholder="Isi berita lengkap"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Foto Berita (bisa lebih dari satu)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  title="Upload Foto Berita"
                  onChange={(event) => setNewsPhotos(Array.from(event.target.files ?? []))}
                  disabled={!permissions.canPublishContent}
                  className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-navy-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-navy-200"
                />
                {existingImageUrls.length > 0 && (
                  <p className="text-xs text-slate-500">Foto tersimpan saat ini: {existingImageUrls.length}</p>
                )}
              </div>

              {newsError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{newsError}</div>}
              {newsMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{newsMessage}</div>}

              {permissions.canPublishContent ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingNews}
                    className="inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingNews ? 'Menyimpan berita...' : editingNewsId ? 'Simpan Perubahan Berita' : 'Publikasikan Berita'}
                  </button>
                  {editingNewsId && (
                    <button
                      type="button"
                      onClick={handleCancelEditNews}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              ) : null}
            </form>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {newsItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  Belum ada berita terkini yang dipublikasikan.
                </div>
              ) : (
                newsItems.map((news) => (
                  <article key={news.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                    {news.image_urls?.[0] && (
                      <img
                        src={news.image_urls[0]}
                        alt={news.title}
                        className="mb-3 h-40 w-full rounded-xl object-cover"
                      />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatDate(news.created_at)}</p>
                    <h3 className="mt-2 text-lg font-bold text-navy-950">{news.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{news.summary || news.content}</p>
                    {news.image_urls && news.image_urls.length > 1 && (
                      <p className="mt-2 text-xs text-slate-500">+{news.image_urls.length - 1} foto tambahan</p>
                    )}
                    {(permissions.canEditNews || permissions.canDeleteNews) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {permissions.canEditNews && (
                          <button
                            type="button"
                            onClick={() => handleEditNews(news)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-navy-200 hover:text-navy-900"
                          >
                            Edit
                          </button>
                        )}
                        {permissions.canDeleteNews && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(news.id)}
                            disabled={deletingNewsId === news.id}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingNewsId === news.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {currentTab === 'analytics' && (
          <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            <div className="border-b border-slate-200/70 pb-5 mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Dashboard Analitik</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Statistik dan Tren Laporan</h2>
            </div>

            {analyticsLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Memuat data analitik...</p>
              </div>
            ) : (
              <AnalyticsDashboard analytics={analytics} weeklyStats={weeklyStats} categoryStats={categoryStats} />
            )}
          </section>
        )}

        {currentTab === 'audit' && permissions.canViewAuditLog && (
          <section className="glass-panel rounded-[2rem] p-6 shadow-soft lg:p-8">
            <div className="border-b border-slate-200/70 pb-5 mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Audit Logs</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-950">Riwayat Aktivitas Admin</h2>
            </div>

            {auditLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Memuat audit logs...</p>
              </div>
            ) : (
              <AuditLogViewer logs={auditLogs} isLoading={auditLoading} />
            )}
          </section>
        )}
      </div>

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestCloseSelectedReport();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft lg:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-700">Detail Laporan</p>
                <h3 className="mt-1 text-2xl font-bold text-navy-950">{categoryLabels[selectedReport.category] ?? selectedReport.category}</h3>
              </div>
              <button
                type="button"
                onClick={() => requestCloseSelectedReport()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-navy-200 hover:text-navy-900"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <InfoRow label="Timestamp" value={formatDate(selectedReport.created_at)} />
                <InfoRow label="Reporter" value={selectedReport.reporter_name || '-'} />
                <InfoRow label="Program Studi & Angkatan" value={selectedReport.prodi} />
                <InfoRow label="WhatsApp" value={selectedReport.whatsapp} />
                <InfoRow label="Privasi" value={selectedReport.privacy} />
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status Laporan</div>
                  <select
                    value={statusDraft}
                    title="Status Laporan"
                    onChange={(event) => setStatusDraft(event.target.value)}
                    disabled={!permissions.canEditReports}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <StatusBadge status={statusDraft} />
                  </div>

                  <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Catatan Admin/Redaksi</label>
                  <textarea
                    value={redaksiNoteDraft}
                    onChange={(event) => setRedaksiNoteDraft(event.target.value)}
                    rows={4}
                    disabled={!permissions.canEditReports}
                    placeholder="Isi hasil verifikasi, temuan lapangan, atau catatan redaksi yang bisa dilihat user."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-navy-300 focus:ring-4 focus:ring-navy-100"
                  />

                  {permissions.canEditReports ? (
                    <button
                      type="button"
                      onClick={saveStatus}
                      disabled={savingStatus || !hasStatusColumn}
                      className="mt-3 inline-flex rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {!hasStatusColumn ? 'Status Belum Aktif' : savingStatus ? 'Menyimpan...' : 'Simpan Status'}
                    </button>
                  ) : (
                    <p className="mt-3 text-xs font-semibold text-slate-500">Mode monitoring: status laporan hanya bisa dilihat.</p>
                  )}
                </div>
                <InfoRow label="Deskripsi" value={selectedReport.description} />
                {String(selectedReport.additional_data?.opini ?? '').trim().length > 0 && (
                  <InfoRow label="Opini Pelapor" value={String(selectedReport.additional_data?.opini)} />
                )}
                <AdditionalDataCard data={selectedReport.additional_data} />

                {reportFlags[selectedReport.id] && (
                  <ModerationFlagsPanel
                    reportId={selectedReport.id}
                    flags={reportFlags[selectedReport.id]}
                    onAddFlag={handleAddFlag}
                    onResolveFlag={handleResolveFlag}
                    isLoading={flagsLoading}
                    readOnly={!permissions.canModerateContent}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                  {selectedReport.evidence_url ? (
                    <img src={selectedReport.evidence_url} alt="Bukti laporan" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      Tidak ada bukti foto yang diunggah.
                    </div>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-navy-100 bg-navy-50 p-4 text-sm text-navy-950">
                  Laporan ini disimpan pada tabel reports dan dapat ditindaklanjuti sesuai alur redaksi.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>;
}

function AdditionalDataCard({ data }: { data: Record<string, string> | null }) {
  const lines = formatAdditionalDataLines(data, ['opini', 'redaksi_note']);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Data Tambahan</div>
      {lines.length === 0 ? (
        <div className="mt-1 text-sm leading-6 text-slate-500">-</div>
      ) : (
        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-800">
          {lines.map((item) => (
            <div key={item.key}>
              <span className="font-semibold">{item.label}:</span> {item.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
  );
}

function AdminMetricCard({ label, value, tone }: { label: string; value: number; tone: 'navy' | 'amber' | 'emerald' | 'rose' }) {
  const toneClass: Record<'navy' | 'amber' | 'emerald' | 'rose', string> = {
    navy: 'border-navy-100 bg-navy-50 text-navy-900',
    amber: 'border-amber-100 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-100 bg-rose-50 text-rose-900'
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass[tone]}`}>
      <p className="text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
