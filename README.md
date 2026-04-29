# INTERAKSI - Campus Reporting & Investigation Platform

![INTERAKSI Banner](https://raw.githubusercontent.com/nahli123140049/Interaksi/GarisFE/public/images/LOGO-INTERAKSI.png)

> **Suara Mahasiswa, Didengar Redaksi.**

**INTERAKSI** is an independent reporting and investigation platform managed by **UKM Lembaga Pers ITERA**. It bridges the gap between student aspirations and campus policy through data-driven journalism, transparency, and real-world action.

---

## 🚀 Key Features

### 📝 Reporting Suite
- **Multi-Category Reporting**: Report issues related to facilities, academics, campus politics, security, and more.
- **Anonymous Mode**: Protect whistleblower identity with absolute anonymity.
- **Ticket Tracking**: Real-time status tracking using unique ticket codes.

### 📊 Public Dashboard
- **Transparency Metrics**: View live statistics of reports received and published.
- **Data Insights**: Deep dive into campus trends and distribution of issues.
- **Investigation Releases**: Access verified news and field investigation reports.

### 🔐 Admin Control Center
- **Workflow Management**: Systematic status updates (Menunggu Verifikasi → Investigasi → Terbit).
- **Audit Logs**: Transparent history of all administrative actions.
- **Content Editor**: Full suite for publishing investigation articles with media galleries.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Monitoring, Redaksi, and Super Admin.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **State Management**: React Hooks & Context
- **Fonts**: Space Grotesk & Plus Jakarta Sans

---

## 📁 Project Structure

```text
src/
├── app/              # Next.js App Router (Pages & Layouts)
│   ├── admin/        # Admin Dashboard & Login
│   ├── dashboard/    # Public Analytics & News
│   ├── report/       # Reporting Flow
│   └── ...
├── components/       # Reusable UI Components
│   ├── admin/        # Admin-specific components
│   └── ...
├── lib/              # Utilities, Supabase client, & Services
└── ...
```

---

## 🛠 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nahli123140049/Interaksi.git
   cd Interaksi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the SQL scripts provided in the root directory in your Supabase SQL Editor:
   - `supabase_setup.sql`
   - `supabase_auth_roles.sql`
   - `supabase_new_features.sql`

5. **Run locally**
   ```bash
   npm run dev
   ```

---

## 🎨 Design Philosophy

The name **INTERAKSI** represents three core values:
- **IN (Inovasi)**: Modern journalism driven by data and technology.
- **TERA (ITERA)**: Rooted in the Institut Teknologi Sumatera community.
- **AKSI (Action)**: Ensuring every report leads to a real-world impact.

---

## 📄 License

&copy; 2026 **INTERAKSI**. Managed by **UKM Lembaga Pers ITERA**.
All Rights Reserved.

---

<p align="center">
  Developed for a better campus ecosystem.
</p>
