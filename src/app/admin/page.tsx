'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
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
import {
  formatBytes,
  getAttachmentLabel,
  getReportSearchText,
  getSlaMeta,
  parseReportAttachments,
  parseReportCode
} from '@/lib/reportUtils';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { ModerationFlagsPanel } from '@/components/ModerationFlagsPanel';
import { ImageUploadManager } from '@/components/ImageUploadManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminStats } from '@/components/admin/AdminStats';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  additional_data: Record<string, unknown> | null;
};

type NewsItem = {
  id: string;
  created_at: string;
  title: string;
  summary: string | null;
  content: string;
  image_urls: string[] | null;
};

import { StatusBadge, statusMetaMap, getStatusMeta } from '@/components/StatusBadge';

type TabName = 'reports' | 'berita' | 'analytics' | 'audit';

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



function formatAdditionalDataLines(data: Record<string, unknown> | null, excludedKeys: string[] = []) {
  if (!data) return [] as Array<{ key: string; label: string; value: string }>;

  return Object.entries(data)
    .filter(
      ([key, value]) =>
        !excludedKeys.includes(key) &&
        key !== 'evidence_urls' &&
        key !== 'uploaded_photo_names' &&
        key !== 'report_code' &&
        key !== 'attachments' &&
        String(value ?? '').trim().length > 0
    )
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
  const [reportSearch, setReportSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState<'all' | 'on-track' | 'warning' | 'overdue'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [statusDraft, setStatusDraft] = useState('Menunggu Verifikasi');
  const [redaksiNoteDraft, setRedaksiNoteDraft] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);
  const [showPassword, setShowPassword] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    return reports.filter((report) => {
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      const searchText = getReportSearchText([
        parseReportCode(report.additional_data),
        categoryLabels[report.category] ?? report.category,
        report.reporter_name,
        report.prodi,
        report.whatsapp,
        report.description,
        report.status,
        report.privacy
      ]);
      const matchesSearch = reportSearch.trim().length === 0 || searchText.includes(reportSearch.trim().toLowerCase());
      const slaMeta = getSlaMeta(report.created_at, report.status);
      const matchesSla =
        slaFilter === 'all' ||
        (slaFilter === 'on-track' && !slaMeta.warning && !slaMeta.overdue) ||
        (slaFilter === 'warning' && slaMeta.warning && !slaMeta.overdue) ||
        (slaFilter === 'overdue' && slaMeta.overdue);

      return matchesCategory && matchesSearch && matchesSla;
    });
  }, [categoryFilter, reportSearch, reports, slaFilter]);

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
  const slaOverdueCount = useMemo(
    () => reports.filter((report) => getSlaMeta(report.created_at, report.status).overdue).length,
    [reports]
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
      <div className="flex min-h-screen items-center justify-center bg-navy-950 px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500"></div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500 animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAuthorized) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-navy-950 px-6 py-12 transition-colors duration-500">
        <ThemeToggle />
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-rose-600/10 dark:bg-rose-600/5 blur-[120px] rounded-full"></div>
        
        <div className="relative z-10 w-full max-w-md animate-fade-in-up text-center">
          <div className="inline-flex rounded-2xl bg-white p-3 shadow-2xl mb-8 border border-slate-200 dark:border-white/20">
            <NextImage src="/images/lempers-flag.png" alt="Logo" width={48} height={48} className="h-12 w-auto object-contain" />
          </div>
          <h1 className="font-display text-4xl font-black text-navy-950 dark:text-white tracking-tight">INTERAKSI <span className="text-amber-500 uppercase">Admin</span></h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest italic opacity-50">Authorized Personnel Only</p>

          <div className="mt-10 rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-8 backdrop-blur-2xl shadow-2xl">
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Access Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-4 text-navy-950 dark:text-white outline-none transition focus:border-amber-500"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Access Key</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-4 text-navy-950 dark:text-white outline-none transition focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 dark:text-slate-200 dark:hover:text-amber-400 transition-colors p-2"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {authError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-amber-500 py-4 text-sm font-black text-navy-950 transition hover:bg-amber-400 active:scale-95 shadow-xl shadow-amber-500/20"
              >
                {loading ? 'AUTHORIZING...' : 'OPEN ACCESS'}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      <ThemeToggle />
      <AdminSidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setIsSidebarOpen(false);
        }}
        adminEmail={adminEmail}
        adminRole={roleLabel}
        onLogout={handleLogout}
        availableTabs={availableTabs}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="lg:pl-72 min-h-screen transition-all duration-500">
        {/* Modern Top Header */}
        <header className="sticky top-0 z-40 h-20 bg-white/80 dark:bg-navy-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg lg:text-xl font-display font-black text-navy-950 dark:text-white uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">
                {availableTabs.find(t => t.id === currentTab)?.label.split(' ').slice(1).join(' ') || 'Control Panel'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Management Suite • {roleLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <Link href="/" className="text-xs font-black text-slate-400 hover:text-amber-500 uppercase tracking-widest transition-colors hidden sm:block">
              Public Home ↗
            </Link>
            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:block">System Live</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-10 space-y-6 lg:space-y-10 animate-fade-in">
          {currentTab === 'reports' && (
            <div className="space-y-10">
              <AdminStats 
                totalReports={totalReportsCount}
                backlogCount={backlogCount}
                publishedCount={publishedCount}
                slaOverdueCount={slaOverdueCount}
              />

              <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
                <div className="flex flex-col gap-8 border-b border-slate-200 dark:border-white/5 pb-10 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-0.5 w-8 bg-amber-500" />
                      <p className="text-[10px] font-black tracking-[0.3em] text-amber-600 dark:text-amber-500 uppercase">Aspirasi Mahasiswa</p>
                    </div>
                    <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Pusat Kendali <span className="text-amber-600">Laporan</span></h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                      <input
                        type="search"
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        placeholder="Cari kode tiket, prodi, atau isi..."
                        className="w-full sm:min-w-[300px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-6 py-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      />
                      <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-6 py-4 text-sm font-bold outline-none focus:border-amber-500"
                    >
                      <option value="all">Semua Kategori</option>
                      {Object.entries(categoryLabels).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>

                    <select
                      value={slaFilter}
                      onChange={(e) => setSlaFilter(e.target.value as any)}
                      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-6 py-4 text-sm font-bold outline-none focus:border-amber-500"
                    >
                      <option value="all">Semua SLA</option>
                      <option value="on-track">On Track</option>
                      <option value="warning">Warning</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="mt-10 overflow-x-auto rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 shadow-2xl custom-scrollbar">
                  <div className="min-w-[800px]">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">
                      <tr>
                        <th className="px-8 py-5">Tiket & Waktu</th>
                        <th className="px-8 py-5">Kategori & Isu</th>
                        <th className="px-8 py-5">Status & SLA</th>
                        <th className="px-8 py-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {paginatedReports.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">Data tidak ditemukan.</td>
                        </tr>
                      ) : (
                        paginatedReports.map((report) => {
                          const sla = getSlaMeta(report.created_at, report.status);
                          return (
                            <tr key={report.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 tracking-tighter">#{parseReportCode(report.additional_data) || 'NO-ID'}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(report.created_at)}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col gap-1 max-w-md">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{categoryLabels[report.category] ?? report.category}</span>
                                  <p className="font-bold text-navy-950 dark:text-white line-clamp-1">{report.description}</p>
                                  <span className="text-[10px] text-slate-400 italic">By {report.reporter_name || 'Anonim'} • {report.prodi}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col gap-2">
                                  <StatusBadge status={report.status} />
                                  <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${sla.overdue ? 'bg-rose-500 animate-pulse' : sla.warning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${sla.overdue ? 'text-rose-500' : sla.warning ? 'text-amber-600' : 'text-slate-400'}`}>
                                      {sla.label}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <button
                                  onClick={() => openDetail(report)}
                                  className="rounded-xl bg-navy-950 dark:bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white dark:text-navy-950 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-navy-900/20"
                                >
                                  Detail →
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* Pagination */}
                {paginationState.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-8 px-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Halaman {currentPage} dari {paginationState.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={!paginationState.hasPreviousPage}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2 text-xs font-bold disabled:opacity-30 transition hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        ← Sebelumnya
                      </button>
                      <button
                        disabled={!paginationState.hasNextPage}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2 text-xs font-bold disabled:opacity-30 transition hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        Berikutnya →
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {currentTab === 'berita' && (
             <div className="space-y-10">
                <section className="relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md lg:p-12 dark:border-slate-800/50 dark:bg-slate-950/20">
                  <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-white/5 pb-10">
                    <div className="flex items-center gap-3">
                      <div className="h-0.5 w-8 bg-rose-500" />
                      <p className="text-[10px] font-black tracking-[0.3em] text-rose-600 dark:text-rose-500 uppercase">Publikasi Konten</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-3xl font-bold tracking-tight text-navy-950 dark:text-white md:text-4xl">Ruang <span className="text-rose-600">Investigasi</span></h2>
                      {editingNewsId && (
                        <button onClick={handleCancelEditNews} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline">Batal Edit ✕</button>
                      )}
                    </div>
                  </div>

                  <div className="mt-10 grid gap-10 grid-cols-1 lg:grid-cols-[1.2fr_1.8fr]">
                    {/* Immersive Form */}
                    <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-8 shadow-xl">
                      <h3 className="text-lg font-bold text-navy-950 dark:text-white mb-6 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                        {editingNewsId ? 'Mode Editor: Perbarui' : 'Draf Berita Baru'}
                      </h3>
                      <form onSubmit={handleCreateNews} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Headline Berita</label>
                          <input
                            type="text"
                            value={newsTitle}
                            onChange={(e) => setNewsTitle(e.target.value)}
                            placeholder="Judul yang provokatif dan tajam..."
                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm outline-none focus:border-rose-500 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lead / Ringkasan</label>
                          <textarea
                            value={newsSummary}
                            onChange={(e) => setNewsSummary(e.target.value)}
                            placeholder="Paragraf pembuka yang meringkas isi..."
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm outline-none focus:border-rose-500 transition-all leading-relaxed"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Konten Investigasi</label>
                          <textarea
                            value={newsContent}
                            onChange={(e) => setNewsContent(e.target.value)}
                            placeholder="Tuliskan detail berita, fakta lapangan, dan hasil wawancara..."
                            rows={10}
                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm outline-none focus:border-rose-500 transition-all font-serif text-lg leading-relaxed"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Media Visual</label>
                          <ImageUploadManager
                            onImagesUploaded={(urls) => setExistingImageUrls(prev => [...prev, ...urls])}
                            currentImages={existingImageUrls}
                          />
                        </div>

                        {newsError && <p className="text-xs font-bold text-rose-500 bg-rose-500/10 p-3 rounded-xl">{newsError}</p>}
                        {newsMessage && <p className="text-xs font-bold text-emerald-500 bg-emerald-500/10 p-3 rounded-xl">{newsMessage}</p>}

                        <button
                          type="submit"
                          disabled={savingNews || !permissions.canPublishContent}
                          className="w-full rounded-2xl bg-rose-600 py-5 text-sm font-black text-white transition hover:bg-rose-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl shadow-rose-600/20"
                        >
                          {savingNews ? 'MEMPROSES PUBLIKASI...' : editingNewsId ? 'PERBARUI ARTIKEL' : 'PUBLIKASIKAN ARTIKEL'}
                        </button>
                      </form>
                    </div>

                    {/* Published Feed */}
                    <div className="space-y-6 overflow-y-auto max-h-[1000px] pr-4 custom-scrollbar">
                      <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-navy-950/80 backdrop-blur-sm py-4 border-b border-slate-200 dark:border-white/5 mb-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Feed Berita Terbit</h3>
                      </div>
                      
                      {newsItems.length === 0 ? (
                        <div className="rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 p-20 text-center">
                          <p className="text-slate-400 font-bold italic">Belum ada artikel publik.</p>
                        </div>
                      ) : (
                        newsItems.map((news) => (
                          <div key={news.id} className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-sm transition-all hover:shadow-2xl dark:border-white/5 dark:bg-white/5">
                            <div className="flex flex-col sm:flex-row items-start gap-8">
                               {news.image_urls && news.image_urls[0] && (
                                <div className="h-40 w-full sm:w-40 shrink-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10 shadow-lg">
                                  <img src={news.image_urls[0]} alt="News" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{formatDate(news.created_at)}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{news.image_urls?.length || 0} Foto</span>
                                </div>
                                <h4 className="text-2xl font-bold text-navy-950 dark:text-white mb-3 group-hover:text-rose-600 transition-colors leading-tight">{news.title}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-6">{news.summary || 'Tidak ada lead berita.'}</p>
                                
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => handleEditNews(news)}
                                    className="flex items-center gap-2 rounded-xl bg-navy-950 dark:bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white dark:text-navy-950 transition-all hover:scale-105"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { if(confirm('Hapus berita ini secara permanen?')) handleDeleteNews(news.id) }}
                                    disabled={deletingNewsId === news.id}
                                    className="flex items-center gap-2 rounded-xl border border-rose-200 text-rose-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                                  >
                                    {deletingNewsId === news.id ? 'MENGHAPUS...' : 'Hapus'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
             </div>
          )}

          {currentTab === 'analytics' && (
             <div className="animate-fade-in">
                <AnalyticsDashboard
                  analytics={analytics}
                  weeklyStats={weeklyStats}
                  categoryStats={categoryStats}
                />
             </div>
          )}

          {currentTab === 'audit' && (
             <div className="animate-fade-in">
                <AuditLogViewer logs={auditLogs} isLoading={auditLoading} />
             </div>
          )}
        </div>
      </main>

      {/* Slide-over Detail Panel (Immersive Version) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-md animate-fade-in" onClick={requestCloseSelectedReport} />
          
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
             {/* Dynamic Mesh Bg for Panel */}
            <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500 via-transparent to-rose-600 blur-[120px]"></div>
            </div>

            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 px-10 py-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Report Insights</p>
                <h3 className="font-display text-3xl font-black text-navy-950 dark:text-white tracking-tighter">#{parseReportCode(selectedReport.additional_data) || 'NO-ID'}</h3>
              </div>
              <button
                onClick={requestCloseSelectedReport}
                className="rounded-2xl bg-slate-100 dark:bg-white/5 p-4 text-slate-400 hover:text-navy-950 dark:hover:text-white transition-all hover:rotate-90"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {/* Status Indicator */}
              <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Saat Ini</span>
                  <StatusBadge status={selectedReport.status} />
                </div>
                <div className="h-8 w-px bg-slate-100 dark:bg-white/5"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Kirim</span>
                  <span className="text-sm font-bold text-navy-950 dark:text-white">{formatDate(selectedReport.created_at)}</span>
                </div>
                <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                   <span className={`h-2 w-2 rounded-full ${getSlaMeta(selectedReport.created_at, selectedReport.status).overdue ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{getSlaMeta(selectedReport.created_at, selectedReport.status).label}</span>
                </div>
              </div>

              {/* Identity & Context */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Identitas Pelapor</p>
                   <p className="text-lg font-black text-navy-950 dark:text-white leading-tight">{selectedReport.reporter_name || 'ANONIM (PROTECTED)'}</p>
                   <p className="text-xs font-bold text-amber-600 mt-1">{selectedReport.prodi}</p>
                </div>
                <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Kontak Jalur Cepat</p>
                   <p className="text-lg font-black text-navy-950 dark:text-white leading-tight">{selectedReport.whatsapp}</p>
                   <span className="inline-flex mt-2 rounded-full bg-navy-950 dark:bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase text-white">{selectedReport.privacy}</span>
                </div>
              </div>

              {/* Content Description */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-rose-600 rounded-[2rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="relative rounded-[2rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-800 p-8 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Kronologi Masalah</p>
                  <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">{selectedReport.description}</p>
                </div>
              </div>

              {/* Evidence Gallery */}
              {selectedReport.evidence_url && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Visual Evidence</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {parseReportAttachments(selectedReport.additional_data).map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
                        <img src={att.url} alt="Evidence" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-navy-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                          <div className="rounded-full bg-white/20 p-4 border border-white/40">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                             </svg>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Editorial Actions (The Most Important Section) */}
              <div className="rounded-[3rem] border-2 border-amber-500/20 bg-amber-500/5 p-10 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-4 w-4 rounded-full bg-amber-500 animate-pulse"></div>
                   <h4 className="font-display text-xl font-black text-navy-950 dark:text-amber-500 uppercase tracking-tight">Editorial Workflow</h4>
                </div>
                
                <div className="grid gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Langkah Strategis</label>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 shadow-sm"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Catatan Verifikasi & Redaksi</label>
                    <textarea
                      value={redaksiNoteDraft}
                      onChange={(e) => setRedaksiNoteDraft(e.target.value)}
                      placeholder="Tambahkan catatan investigasi, fakta baru, atau rilis singkat yang dapat dipantau pelapor..."
                      rows={5}
                      className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-6 py-4 text-sm outline-none focus:border-amber-500 shadow-sm leading-relaxed"
                    />
                  </div>

                  <button
                    onClick={saveStatus}
                    disabled={savingStatus || !permissions.canEditReports}
                    className="w-full rounded-2xl bg-navy-950 dark:bg-amber-500 py-5 text-sm font-black uppercase tracking-widest text-white dark:text-navy-950 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl shadow-navy-950/20 dark:shadow-amber-500/20"
                  >
                    {savingStatus ? 'MENYIMPAN DATA...' : 'KONFIRMASI UPDATE LAPORAN'}
                  </button>
                </div>
              </div>

              {/* Flags & Moderation */}
              <ModerationFlagsPanel
                reportId={selectedReport.id}
                flags={reportFlags[selectedReport.id] || []}
                onAddFlag={handleAddFlag}
                onResolveFlag={handleResolveFlag}
                isLoading={flagsLoading}
                readOnly={!permissions.canModerateContent}
              />
              
              <div className="pt-10 pb-6 text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID System: {selectedReport.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function AdditionalDataCard({ data }: { data: Record<string, unknown> | null }) {
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


function AttachmentPanel({ attachments }: { attachments: ReturnType<typeof parseReportAttachments> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Lampiran</div>
      {attachments.length === 0 ? (
        <div className="mt-1 text-sm leading-6 text-slate-500">Tidak ada lampiran yang tersimpan.</div>
      ) : (
        <div className="mt-3 space-y-4">
          {attachments.map((attachment, index) => (
            <div key={`${attachment.url}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {getAttachmentLabel(attachment.kind)} - {attachment.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {attachment.mime} {attachment.size > 0 ? `• ${formatBytes(attachment.size)}` : ''}
                  </div>
                </div>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-800 transition hover:border-navy-300 hover:text-navy-950"
                >
                  Buka
                </a>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {attachment.kind === 'image' ? (
                  <img src={attachment.url} alt={attachment.name} className="h-56 w-full object-contain" />
                ) : attachment.kind === 'pdf' ? (
                  <iframe title={attachment.name} src={attachment.url} className="h-96 w-full" />
                ) : attachment.kind === 'video' ? (
                  <video controls src={attachment.url} className="h-96 w-full bg-black" />
                ) : (
                  <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                    Pratinjau tidak tersedia. Gunakan tombol Buka.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

