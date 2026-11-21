const $ = id => document.getElementById(id);
const esc = (v="") => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => `${Number(n||0).toLocaleString("fa-IR")} تومان`;
let galleryItems = [], galleryIndex = 0;

async function renderProducts() {
  const { data: all, error } = await barnaDb.from("products").select("*").order("sort_order").order("created_at", {ascending:false});
  if (error) { $("emptyState").textContent = "دریافت محصولات ناموفق بود: " + error.message; return; }
  const q = ($("searchInput")?.value || "").trim().toLowerCase(), status = $("statusFilter")?.value || "all";
  const {data: setting} = await barnaDb.from("store_settings").select("value").eq("key","order_link").maybeSingle();
  const orderLink = typeof setting?.value === "string" ? setting.value : "https://rubika.ir/Studivoid";
  const items = (all || []).filter(p => (status === "all" || p.status === status) && `${p.title} ${p.description}`.toLowerCase().includes(q));
  $("productCount").textContent = `${(all||[]).length.toLocaleString("fa-IR")} محصول`;
  $("emptyState").style.display = items.length ? "none" : "block";
  $("products").innerHTML = items.map(p => {
    const imgs = Array.isArray(p.images) ? p.images : [], first = imgs[0] || "", sold = p.status === "sold";
    return `<article class="product-card"><div class="product-image" data-gallery="${esc(p.id)}">${first ? `<img src="${esc(first)}" alt="${esc(p.title)}">` : `<div class="no-image">◇</div>`}<span class="status-pill ${sold?"sold":""}">${sold?"فروخته شد":"موجود"}</span></div><div class="product-info"><h3>${esc(p.title)}</h3><p>${esc(p.description || "بدون توضیحات")}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><a class="buy-btn ${sold?"disabled":""}" ${sold?'aria-disabled="true"':`href="${esc(orderLink)}" target="_blank" rel="noopener"`}>${sold?"ناموجود":"سفارش در روبیکا"}</a></div></div></article>`;
  }).join("");
  document.querySelectorAll("[data-gallery]").forEach(el => el.addEventListener("click", () => openGallery(el.dataset.gallery, all)));
}
function openGallery(id, all) {
  const p = all.find(x=>x.id===id); if (!p || !p.images?.length) return;
  galleryItems=p.images; galleryIndex=0; showGallery(); $("lightbox").hidden=false;
}
function showGallery(){ $("lightboxImage").src=galleryItems[galleryIndex]; $("lightboxCaption").textContent=`تصویر ${galleryIndex+1} از ${galleryItems.length}`; }
function closeGallery(){ $("lightbox").hidden=true; $("lightboxImage").src=""; }
$("searchInput").addEventListener("input",renderProducts);
$("statusFilter").addEventListener("change",renderProducts);
$("closeLightbox").addEventListener("click",closeGallery);
$("lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeGallery();});
$("prevImage").addEventListener("click",()=>{galleryIndex=(galleryIndex-1+galleryItems.length)%galleryItems.length;showGallery();});
$("nextImage").addEventListener("click",()=>{galleryIndex=(galleryIndex+1)%galleryItems.length;showGallery();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeGallery();});
renderProducts();
