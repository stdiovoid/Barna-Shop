const STORAGE_KEY = "barna_shop_products_v1";
const SETTINGS_KEY = "barna_shop_settings_v1";
const $ = (id) => document.getElementById(id);
const readProducts = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const readSettings = () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; } };
const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => `${Number(n||0).toLocaleString("fa-IR")} تومان`;
let galleryItems = [], galleryIndex = 0;

function renderProducts(){
  const all = readProducts(), q = ($("searchInput")?.value || "").trim().toLowerCase(), status = $("statusFilter")?.value || "all";
  const items = all.filter(p => (status === "all" || p.status === status) && `${p.title} ${p.description}`.toLowerCase().includes(q));
  $("productCount").textContent = `${all.length.toLocaleString("fa-IR")} محصول`;
  $("emptyState").style.display = items.length ? "none" : "block";
  $("products").innerHTML = items.map(p => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    const first = imgs[0] || "";
    const sold = p.status === "sold";
    return `<article class="product-card">
      <div class="product-image" data-gallery="${escapeHTML(p.id)}">${first ? `<img src="${first}" alt="${escapeHTML(p.title)}">` : `<div class="no-image">◇</div>`}
      <span class="status-pill ${sold?"sold":""}">${sold?"فروخته شد":"موجود"}</span></div>
      <div class="product-info"><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.description || "بدون توضیحات")}</p>
      <div class="product-bottom"><span class="price">${money(p.price)}</span>
      <a class="buy-btn ${sold?"disabled":""}" ${sold?'aria-disabled="true"':`href="${escapeHTML((readSettings().orderLink)||"https://rubika.ir/Studivoid")}" target="_blank" rel="noopener"`}>${sold?"ناموجود":"سفارش در روبیکا"}</a></div></div></article>`;
  }).join("");
  document.querySelectorAll("[data-gallery]").forEach(el => el.addEventListener("click", () => openGallery(el.dataset.gallery)));
}
function openGallery(id){
  const p = readProducts().find(x=>x.id===id); if(!p || !p.images?.length) return;
  galleryItems=p.images; galleryIndex=0; showGallery();
  $("lightbox").hidden=false;
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
