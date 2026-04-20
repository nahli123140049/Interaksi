# 🎯 Quick Reference - 5 Fitur Baru WebPers

## Akses Fitur di Admin Dashboard

```
Admin Dashboard (src/app/admin/page.tsx)
│
├─ 📊 Tab: LAPORAN (Default)
│  ├─ Pagination: Prev [1] [2] [3] ... Next
│  ├─ Filters: Kategori, Status
│  ├─ 🚩 Flag Indicator pada laporan dengan flag
│  └─ Buka Detail → Moderasi Konten Panel
│
├─ 📰 Tab: BERITA
│  ├─ Daftar berita yang dipublikasikan
│  ├─ 📤 Upload Manager untuk foto
│  │  └─ Drag-drop area dengan preview grid
│  └─ Edit/Delete berita existing
│
├─ 📈 Tab: ANALYTICS
│  ├─ Stat Cards: Total, Pending, Investigating, Published, Rejected, Archived
│  ├─ Distribusi Kategori: Bar chart dengan %
│  ├─ Tren Mingguan: Table dengan week_start, category, status, count
│  └─ Last update timestamp
│
└─ 🔍 Tab: AUDIT LOG
   ├─ List dengan timestamps dan admin emails
   ├─ Color-coded badges: Create, Update, Delete, Resolve
   ├─ Expandable details: Show old vs new values
   └─ Load More untuk pagination
```

---

## Fitur 1: AUDIT LOG ADMIN 🔍

### Akses
**Admin Dashboard → Tab "Audit Log"**

### Yang Bisa Dilihat
- ✅ Siapa (admin email) yang melakukan aksi
- ✅ Kapan (timestamp)
- ✅ Apa (action: create_news, update_status, delete_news, create_flag, resolve_flag)
- ✅ Data apa yang berubah (old_values vs new_values)

### Contoh
```
Admin: admin@example.com
Waktu: 2024-04-20 10:30:15
Aksi: UPDATE_STATUS
Table: reports (id: abc123)
Deskripsi: Status Laporan changed from "Pending" to "Investigating"
Old Value: {"status": "Pending"}
New Value: {"status": "Investigating"}
```

### Navigasi
- Scroll untuk lihat lebih banyak
- Klik "Detail" untuk expand old/new values
- Klik "Load More" untuk load 20 entries berikutnya

---

## Fitur 2: PAGINATION 📄

### Akses
**Admin Dashboard → Tab "Laporan" (Default)**

### Controls
```
[← Sebelumnya] [Next →] | Page 1 of 15
```

### Features
- Prev button disabled pada halaman 1
- Next button disabled pada halaman terakhir
- Menampilkan 10 laporan per halaman
- Filters (kategori/status) tetap active saat navigate

### Contoh Usage
1. Filter by kategori "Politik"
2. Halaman 1 menunjukkan laporan 1-10
3. Klik "Next →"
4. Halaman 2 menunjukkan laporan 11-20
5. Klik "← Sebelumnya"
6. Kembali ke halaman 1

---

## Fitur 3: UPLOAD MANAGER 📤

### Akses
**Admin Dashboard → Tab "Berita" → Section "Foto Berita"**

### Cara Pakai
```
┌─────────────────────────────────────┐
│  Drag-drop images di sini           │
│  atau klik untuk browse             │
└─────────────────────────────────────┘

Lalu lihat preview grid:
┌─────┬─────┬─────┐
│ IMG │ IMG │ IMG │
├─────┼─────┼─────┤
│ IMG │ IMG │ IMG │
└─────┴─────┴─────┘
```

### Validasi
- ✅ Format: JPG, PNG, GIF, WebP only
- ✅ Ukuran: Max 10MB per image
- ✅ Jumlah: Max 5 images
- ✅ Auto-compress sebelum upload

### Buttons
- **Remove (X)** - Hapus image sebelum upload
- **Publikasikan Berita** - Upload semua images + berita

---

## Fitur 4: MODERASI KONTEN CEPAT 🚩

### Akses
**Admin Dashboard → Tab "Laporan" → Buka Detail Laporan → Scroll ke "Moderasi Konten"**

### Flag Types
| Flag | Icon | Arti |
|------|------|------|
| Duplicate | 🔄 | Laporan duplikat |
| Priority | ⚡ | Urgent/Prioritas tinggi |
| Spam | 📧 | Spam atau frivolous |
| Inappropriate | ⚠️ | Konten tidak sesuai policy |
| Low Quality | 📉 | Kualitas rendah/kurang detail |

### Priority Levels
| Level | Icon | Warna | Arti |
|-------|------|-------|------|
| Low | 📍 | Gray | Bisa ditunda |
| Medium | 📍 | Amber | Normal priority |
| High | 📍 | Red | URGENT |

### Cara Pakai
1. Buka laporan detail
2. Scroll ke "Moderasi Konten"
3. Form "Tambah Flag":
   - Pilih **Tipe Flag** (dropdown)
   - Pilih **Priority Level** (dropdown)
   - Tulis **Deskripsi** (text area)
4. Klik "+ Tambah Flag"
5. Flag muncul di list "Flag Aktif"

### Resolve Flag
1. Di list "Flag Aktif", klik tombol **Resolve (X)**
2. Flag pindah ke "Riwayat Flag"
3. Audit log mencatat siapa yang resolve

### Indicator
- Laporan dengan flag aktif: **🚩 Ada Flag** badge di list

---

## Fitur 5: DASHBOARD ANALYTICS 📊

### Akses
**Admin Dashboard → Tab "Analytics"**

### Stat Cards (6 Cards)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🔵 Total     │  │ 🟠 Pending   │  │ 🟣 Invest.   │
│  156         │  │   23         │  │   45         │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🟢 Published │  │🔴 Rejected   │  │ ⚫ Archived   │
│  67          │  │   15         │  │   6          │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Distribusi Kategori
```
Category          Count    Percentage
─────────────────────────────────────
Politik           45       28.8% ████████
Sosial            38       24.4% ██████
Olahraga           32       20.5% █████
Lainnya            41       26.3% ██████
```

### Tren Mingguan (Table)
```
Week Start        Category    Status         Count
─────────────────────────────────────────────────
2024-04-14       Politik     Pending         12
2024-04-14       Politik     Investigating    3
2024-04-14       Sosial      Pending          8
2024-04-21       Politik     Pending         15
2024-04-21       Politik     Published        5
...
```

### Last Update
```
Last updated: 2024-04-20 10:35:22
```

### Insights
- Total Laporan: Sum dari semua status
- Rata-rata per kategori
- % distribution
- Trend naik/turun per minggu

---

## Integrasi Fitur di Workflow

### Workflow 1: Proses Laporan
```
1. Admin lihat laporan di tab Laporan (Pagination)
   ↓
2. Admin buka detail laporan
   ↓
3. Admin flag laporan jika perlu (Moderasi)
   ↓
4. Admin update status → Auto-logged to Audit Log
   ↓
5. Admin lihat audit trail di Audit Log tab
```

### Workflow 2: Publish Berita
```
1. Admin go to Berita tab
   ↓
2. Upload foto dengan drag-drop (Upload Manager)
   ↓
3. Isi form berita
   ↓
4. Publikasikan → Auto-logged to Audit Log
```

### Workflow 3: Monitor Performance
```
1. Admin go to Analytics tab
   ↓
2. Lihat stat cards dan distribusi
   ↓
3. Identifikasi category dengan volume tinggi
   ↓
4. Go back to Laporan tab
   ↓
5. Filter by category tinggi
   ↓
6. Process dengan pagination
```

---

## Database Queries (Developer Reference)

### Lihat Audit Logs
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Lihat Active Flags
```sql
SELECT * FROM moderation_flags 
WHERE resolved_at IS NULL 
ORDER BY priority DESC;
```

### Lihat Analytics
```sql
SELECT * FROM reports_analytics;
```

### Lihat Weekly Stats
```sql
SELECT * FROM reports_weekly_stats 
ORDER BY week_start DESC 
LIMIT 10;
```

---

## Keyboard Shortcuts (Bonus)

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate antara field/button |
| `Enter` | Submit form / Confirm action |
| `Esc` | Close modal |
| `Ctrl+R` | Refresh halaman |

---

## Environment Variables (Sudah Configure)

```
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,admin2@example.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Performance Metrics

| Metric | Expected |
|--------|----------|
| Audit Log load | <200ms |
| Pagination query | <300ms |
| Analytics fetch | <500ms |
| Flag creation | <100ms |
| Image upload | <2s (per image) |
| Dashboard load | <1.5s |

---

**Last Updated:** April 20, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

