// Temporary project configuration. Publishable key is safe to expose when RLS is enabled.
const BARNA_SUPABASE_URL = "https://jwnpfbutgtnytyojnqzb.supabase.co";
const BARNA_SUPABASE_KEY = "sb_publishable_kEZ1heYMhY89eSAvtS562Q_75jm4y5s";
const barnaDb = window.supabase.createClient(BARNA_SUPABASE_URL, BARNA_SUPABASE_KEY);
const BARNA_PUBLIC_BUCKET = "barna-public";
const BARNA_RECEIPTS_BUCKET = "barna-receipts";

async function barnaUpload(bucket, file, folder) {
  if (!file) return null;
  if (!file.type || !file.type.startsWith("image/")) throw new Error("فقط فایل تصویری مجاز است.");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم هر تصویر باید کمتر از ۵ مگابایت باشد.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await barnaDb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  if (bucket === BARNA_PUBLIC_BUCKET) {
    const { data } = barnaDb.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return path;
}

async function barnaReceiptUrl(path) {
  if (!path) return "";
  const { data, error } = await barnaDb.storage.from(BARNA_RECEIPTS_BUCKET).createSignedUrl(path, 300);
  if (error) return "";
  return data.signedUrl;
}

async function barnaRequireAdmin() {
  const { data: { user } } = await barnaDb.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    await barnaDb.auth.signOut();
    throw new Error("این حساب دسترسی مدیر ندارد. ابتدا نقش مدیر برای حساب فعال شود.");
  }
  return user;
}

function barnaShowError(target, error) {
  const el = typeof target === "string" ? document.getElementById(target) : target;
  if (el) el.textContent = error?.message || "خطایی رخ داد. دوباره تلاش کن.";
}
