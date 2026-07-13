import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


export const hasSupabaseConfig =
  !!supabaseUrl && !!supabaseKey;

console.log("SUPABASE URL :", supabaseUrl);
console.log("SUPABASE KEY :", supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function loadProduk() {
  return await supabase
    .from("produk")
    .select("*")
    .order("tanggal_masuk", { ascending: false });
}

export async function upsertProduk(payload, id) {
  if (id) {
    return await supabase
      .from("produk")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  }

  return await supabase
    .from("produk")
    .insert(payload)
    .select()
    .single();
}

export async function deleteProduk(id) {
  return await supabase
    .from("produk")
    .delete()
    .eq("id", id);
}