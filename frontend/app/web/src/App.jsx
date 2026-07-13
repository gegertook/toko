import React, { useMemo, useState } from "react";
import { deleteProduk, hasSupabaseConfig, loadProduk, upsertProduk } from "./lib/supabase";

const seedProduk = [
  { id: 1, nama: "Apel Malang", harga_per_kg: 28000, stok_kg: 14, kategori: "Buah Segar", tanggal_masuk: "2026-07-09", masa_simpan_hari: 7 },
  { id: 2, nama: "Pisang Raja", harga_per_kg: 18000, stok_kg: 4.5, kategori: "Buah Segar", tanggal_masuk: "2026-07-07", masa_simpan_hari: 6 },
  { id: 3, nama: "Jeruk Pontianak", harga_per_kg: 22000, stok_kg: 9, kategori: "Citrus", tanggal_masuk: "2026-07-11", masa_simpan_hari: 8 },
  { id: 4, nama: "Semangka", harga_per_kg: 15000, stok_kg: 3, kategori: "Buah Besar", tanggal_masuk: "2026-07-05", masa_simpan_hari: 5 },
  { id: 5, nama: "Mangga Harum Manis", harga_per_kg: 32000, stok_kg: 6.2, kategori: "Musiman", tanggal_masuk: "2026-07-10", masa_simpan_hari: 6 },
];

const seedPenjualan = [
  { label: "Sen", value: 1200000 },
  { label: "Sel", value: 880000 },
  { label: "Rab", value: 1430000 },
  { label: "Kam", value: 960000 },
  { label: "Jum", value: 1750000 },
  { label: "Sab", value: 2100000 },
  { label: "Min", value: 1520000 },
];

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function daysBetween(a, b) {
  const start = new Date(a);
  const end = new Date(b);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function productExpiry(product) {
  const today = new Date();
  const masuk = new Date(product.tanggal_masuk);
  const sisa = product.masa_simpan_hari - daysBetween(masuk, today);
  return {
    sisa,
    urgent: sisa <= 2,
    expired: sisa < 0,
  };
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <div className={classNames("mt-3 text-3xl font-semibold", accent)}>{value}</div>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="grid gap-4">
      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {data.map((item) => {
          const height = Math.max((item.value / max) * 180, 18);
          return (
            <div key={item.label} className="flex min-w-[52px] flex-1 flex-col items-center gap-2">
              <div className="flex h-[190px] w-full items-end justify-center rounded-2xl bg-slate-900/70 px-2 pb-2 ring-1 ring-white/5">
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-emerald-500 to-lime-300 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:opacity-90"
                  style={{ height }}
                  title={currency.format(item.value)}
                />
              </div>
              <span className="text-xs text-slate-400">{item.label}</span>
              <span className="text-[11px] text-slate-500">{Math.round(item.value / 1000)}k</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowStep({ step, title, desc }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
          {step}
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

function App() {
  const [produk, setProduk] = useState(seedProduk);
  const [sales] = useState(seedPenjualan);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nama: "",
    harga_per_kg: "",
    stok_kg: "",
    kategori: "",
    tanggal_masuk: "2026-07-12",
    masa_simpan_hari: 7,
  });
  const [status, setStatus] = useState("Siap. Gunakan form untuk menambah produk.");

  const stats = useMemo(() => {
    const expiry = produk.map(productExpiry);
    const lowStock = produk.filter((item) => item.stok_kg < 5).length;
    const urgent = expiry.filter((item) => item.urgent).length;
    const revenue = 8840000;
    return {
      total: produk.length,
      lowStock,
      urgent,
      revenue,
    };
  }, [produk]);

  async function syncFromSupabase() {
    try {
      const { data, error } = await loadProduk();
      if (error) throw error;
      if (data?.length) setProduk(data);
      setStatus("Data berhasil diambil dari Supabase.");
    } catch (err) {
      setStatus(err.message || "Gagal memuat data Supabase, memakai data lokal.");
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      nama: item.nama,
      harga_per_kg: item.harga_per_kg,
      stok_kg: item.stok_kg,
      kategori: item.kategori,
      tanggal_masuk: item.tanggal_masuk,
      masa_simpan_hari: item.masa_simpan_hari,
    });
    setStatus(`Mengedit ${item.nama}.`);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      nama: "",
      harga_per_kg: "",
      stok_kg: "",
      kategori: "",
      tanggal_masuk: "2026-07-12",
      masa_simpan_hari: 7,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      nama: form.nama,
      harga_per_kg: Number(form.harga_per_kg),
      stok_kg: Number(form.stok_kg),
      kategori: form.kategori,
      tanggal_masuk: form.tanggal_masuk,
      masa_simpan_hari: Number(form.masa_simpan_hari),
    };

    if (!payload.nama || !payload.kategori) {
      setStatus("Nama dan kategori wajib diisi.");
      return;
    }

    const nextLocal = editingId
      ? produk.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      : [
          ...produk,
          {
            id: Date.now(),
            ...payload,
          },
        ];

    setProduk(nextLocal);

    try {
      const { error } = await upsertProduk(payload, editingId);
      if (error) throw error;
      setStatus(editingId ? "Produk berhasil diperbarui di Supabase." : "Produk berhasil ditambahkan ke Supabase.");
    } catch (err) {
      setStatus(`${editingId ? "Update" : "Insert"} lokal berhasil. ${err.message || "Supabase belum aktif."}`);
    }

    resetForm();
  }

  async function handleDelete(id) {
    const item = produk.find((entry) => entry.id === id);
    setProduk((current) => current.filter((entry) => entry.id !== id));

    try {
      const { error } = await deleteProduk(id);
      if (error) throw error;
      setStatus(`Produk ${item?.nama || ""} dihapus dari Supabase.`);
    } catch (err) {
      setStatus(`Produk ${item?.nama || ""} dihapus lokal. ${err.message || ""}`);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_20%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                Toko Buah Merah Putih
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Dashboard inventori buah yang siap untuk admin dan otomasi Telegram.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Aplikasi ini memantau stok, menandai buah yang mendekati kedaluwarsa, dan menyiapkan fondasi integrasi Supabase, n8n, OpenAI, serta Telegram Bot API.
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-8">
                <span className="text-slate-500">Supabase</span>
                <span className={classNames("font-medium", hasSupabaseConfig ? "text-emerald-300" : "text-amber-300")}>
                  {hasSupabaseConfig ? "Terkoneksi" : "Belum dikonfigurasi"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="text-slate-500">Mode</span>
                <span className="font-medium text-slate-100">Admin Dashboard</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="text-slate-500">Bot</span>
                <span className="font-medium text-slate-100">Telegram + n8n</span>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Produk" value={stats.total} hint="Jumlah item aktif di inventori" accent="text-emerald-300" />
          <StatCard label="Stok Rendah" value={stats.lowStock} hint="Produk di bawah 5 kg" accent="text-amber-300" />
          <StatCard label="Butuh Perhatian" value={stats.urgent} hint="Sisa masa simpan <= 2 hari" accent="text-rose-300" />
          <StatCard label="Penjualan Mingguan" value={currency.format(stats.revenue)} hint="Agregasi dari transaksi" accent="text-sky-300" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Manajemen Inventori</h2>
                <p className="mt-1 text-sm text-slate-400">Tambah, edit, dan hapus stok buah dari satu layar.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={syncFromSupabase}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/30 hover:text-white"
                >
                  Sinkron Supabase
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Tambah Produk
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.24em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Nama</th>
                    <th className="px-4 py-4">Harga/kg</th>
                    <th className="px-4 py-4">Stok</th>
                    <th className="px-4 py-4">Kategori</th>
                    <th className="px-4 py-4">Masuk</th>
                    <th className="px-4 py-4">Sisa</th>
                    <th className="px-4 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-950/40">
                  {produk.map((item) => {
                    const expiry = productExpiry(item);
                    const rowClass = expiry.expired
                      ? "bg-rose-500/10"
                      : expiry.urgent
                      ? "bg-amber-400/10"
                      : "";
                    return (
                      <tr key={item.id} className={rowClass}>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{item.nama}</div>
                          <div className="text-xs text-slate-500">ID #{item.id}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-200">{currency.format(item.harga_per_kg)}</td>
                        <td className="px-4 py-4 text-slate-200">{item.stok_kg} kg</td>
                        <td className="px-4 py-4 text-slate-300">{item.kategori}</td>
                        <td className="px-4 py-4 text-slate-300">{item.tanggal_masuk}</td>
                        <td className="px-4 py-4">
                          <span
                            className={classNames(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              expiry.expired
                                ? "bg-rose-500/20 text-rose-200"
                                : expiry.urgent
                                ? "bg-amber-400/20 text-amber-200"
                                : "bg-emerald-400/15 text-emerald-200",
                            )}
                          >
                            {expiry.sisa} hari
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:border-rose-400/40 hover:text-rose-100"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 shadow-glow backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">{editingId ? "Edit Produk" : "Form Produk"}</h2>
            <p className="mt-1 text-sm text-slate-400">Form ini bisa langsung dipakai untuk operasi CRUD.</p>
            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
              <Field label="Nama">
                <input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Apel" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Harga / kg">
                  <input className="input" type="number" value={form.harga_per_kg} onChange={(e) => setForm({ ...form, harga_per_kg: e.target.value })} placeholder="28000" />
                </Field>
                <Field label="Stok / kg">
                  <input className="input" type="number" step="0.1" value={form.stok_kg} onChange={(e) => setForm({ ...form, stok_kg: e.target.value })} placeholder="12" />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Kategori">
                  <input className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Buah Segar" />
                </Field>
                <Field label="Tanggal Masuk">
                  <input className="input" type="date" value={form.tanggal_masuk} onChange={(e) => setForm({ ...form, tanggal_masuk: e.target.value })} />
                </Field>
              </div>
              <Field label="Masa Simpan (hari)">
                <input className="input" type="number" value={form.masa_simpan_hari} onChange={(e) => setForm({ ...form, masa_simpan_hari: e.target.value })} placeholder="7" />
              </Field>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">
                  {editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
                {editingId ? (
                  <button type="button" onClick={resetForm} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20">
                    Batal
                  </button>
                ) : null}
              </div>
            </form>
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Status</p>
              <p className="mt-2 leading-6 text-slate-400">{status}</p>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Laporan Penjualan</h2>
                <p className="mt-1 text-sm text-slate-400">Grafik mingguan dari agregasi transaksi.</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                Total mingguan: {currency.format(sales.reduce((sum, item) => sum + item.value, 0))}
              </div>
            </div>
            <div className="mt-5">
              <BarChart data={sales} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 shadow-glow backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">Alur Otomasi Telegram</h2>
            <p className="mt-1 text-sm text-slate-400">Rangkaian proses yang cocok dipasang di n8n.</p>
            <div className="mt-5 grid gap-4">
              <FlowStep step="1" title="Webhook Trigger" desc="Telegram mengirim pesan masuk ke n8n untuk memulai proses parsing." />
              <FlowStep step="2" title="OpenAI Parsing" desc="Pesan natural language diubah menjadi JSON: daftar produk dan jumlah kilogram." />
              <FlowStep step="3" title="Cek Stok Supabase" desc="n8n memvalidasi ketersediaan stok sebelum transaksi dibuat." />
              <FlowStep step="4" title="Update Transaksi" desc="Stok dikurangi, transaksi disimpan, dan item transaksi direkam otomatis." />
              <FlowStep step="5" title="Notifikasi Telegram" desc="Bot mengirimkan konfirmasi pembelian atau peringatan stok menipis ke grup admin." />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h2 className="text-2xl font-semibold text-white">Rangkuman Fitur yang Sudah Disiapkan</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <Feature text="CRUD inventori buah dengan form siap pakai." />
                <Feature text="Highlight kuning dan merah untuk buah yang mendekati atau melewati masa simpan." />
                <Feature text="Grafik penjualan mingguan tanpa dependency chart tambahan." />
                <Feature text="Koneksi Supabase sudah dibungkus di layer helper agar mudah disambungkan ke tabel asli." />
                <Feature text="Layout responsif untuk desktop dan mobile." />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              <h3 className="text-lg font-semibold text-white">Catatan Integrasi</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Setelah dependency terpasang, aplikasi ini bisa langsung disambungkan ke tabel <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-100">produk</code>, <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-100">transaksi</code>, dan <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-100">item_transaksi</code>.
                Untuk Telegram dan AI, backend otomasi tetap ideal dikerjakan di n8n sesuai PRD.
              </p>
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                Gunakan file <code className="rounded bg-black/20 px-1.5 py-0.5">.env</code> untuk menyimpan kredensial Supabase.
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2,6,23,0.85);
          padding: 0.85rem 1rem;
          color: #f8fafc;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input::placeholder {
          color: #64748b;
        }
        .input:focus {
          border-color: rgba(52, 211, 153, 0.4);
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.1);
        }
        code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Feature({ text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.7)]" />
      <p className="leading-6 text-slate-300">{text}</p>
    </div>
  );
}

export default App;
