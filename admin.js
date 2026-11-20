const KEY="barna_shop_products_v1", SETTINGS="barna_shop_settings_v1";
const $=id=>document.getElementById(id);
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}};
const write=items=>localStorage.setItem(KEY,JSON.stringify(items));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let pendingImages=[],editingImages=[];
const defaultPassword="8888";
$("loginBtn").addEventListener("click",()=>{
  if($("password").value===defaultPassword){$("loginPanel").hidden=true;$("dashboard").hidden=false;loadDashboard();}
  else $("loginError").textContent="رمز واردشده درست نیست.";
});
$("password").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click();});
function loadDashboard(){
  const s=JSON.parse(localStorage.getItem(SETTINGS)||"{}");$("orderLink").value=s.orderLink||"https://rubika.ir/Studivoid";renderAdmin();
}
function resetForm(){
  $("productForm").reset();$("editId").value="";pendingImages=[];editingImages=[];$("imagePreview").innerHTML="";$("formTitle").textContent="افزودن اکانت جدید";$("saveBtn").textContent="ثبت محصول";$("cancelEdit").hidden=true;$("formMessage").textContent="";
}
$("cancelEdit").addEventListener("click",resetForm);
function compressImage(file){
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith("image/"))return reject(new Error("فایل تصویر معتبر نیست."));
  const reader=new FileReader();reader.onerror=()=>reject(new Error("خواندن تصویر ناموفق بود."));
  reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error("تصویر قابل خواندن نیست."));
   img.onload=()=>{const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.78));};img.src=reader.result;};reader.readAsDataURL(file);
 });
}
$("images").addEventListener("change",async e=>{
  $("formMessage").textContent="در حال آماده‌سازی تصاویر...";
  try{pendingImages=await Promise.all([...e.target.files].map(compressImage));$("imagePreview").innerHTML=pendingImages.map(src=>`<img src="${src}">`).join("");$("formMessage").textContent="";}
  catch(err){$("formMessage").textContent=err.message;}
});
$("productForm").addEventListener("submit",e=>{
 e.preventDefault();const items=read(),id=$("editId").value;
 const old=items.find(p=>p.id===id);
 const product={id:id||crypto.randomUUID(),title:$("title").value.trim(),description:$("description").value.trim(),price:Number($("price").value),status:$("status").value,images:pendingImages.length?pendingImages:(old?.images||[])};
 if(!product.title||!Number.isFinite(product.price)||product.price<0)return;
 try{if(old)items[items.findIndex(p=>p.id===id)]=product;else items.unshift(product);write(items);resetForm();renderAdmin();$("formMessage").textContent="محصول ذخیره شد.";}
 catch(err){$("formMessage").textContent="فضای ذخیره‌سازی مرورگر پر شده؛ تصاویر کوچک‌تری انتخاب کن.";}
});
function editProduct(id){
 const p=read().find(x=>x.id===id);if(!p)return;
 $("editId").value=p.id;$("title").value=p.title;$("description").value=p.description||"";$("price").value=p.price;$("status").value=p.status||"available";
 pendingImages=[];$("imagePreview").innerHTML=(p.images||[]).map(src=>`<img src="${src}">`).join("");$("formTitle").textContent="ویرایش اکانت";$("saveBtn").textContent="ذخیره تغییرات";$("cancelEdit").hidden=false;window.scrollTo({top:0,behavior:"smooth"});
}
function deleteProduct(id){if(!confirm("این محصول حذف شود؟"))return;write(read().filter(p=>p.id!==id));renderAdmin();}
function renderAdmin(){
 const items=read();$("adminCount").textContent=`${items.length} محصول`;
 $("adminProducts").innerHTML=items.length?items.map(p=>`<div class="admin-product">${p.images?.[0]?`<img src="${p.images[0]}" alt="">`:`<div class="admin-thumb">◇</div>`}<div class="admin-product-info"><b>${esc(p.title)}</b><small>${Number(p.price).toLocaleString("fa-IR")} تومان · ${p.status==="sold"?"فروخته‌شده":"موجود"}</small></div><div class="admin-actions"><button data-edit="${p.id}">ویرایش</button><button class="delete" data-delete="${p.id}">حذف</button></div></div>`).join(""):"<p class='hint'>هنوز محصولی ثبت نشده است.</p>";
 document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
 document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
}
$("saveSettings").addEventListener("click",()=>{localStorage.setItem(SETTINGS,JSON.stringify({orderLink:$("orderLink").value.trim()||"https://rubika.ir/Studivoid"}));alert("تنظیمات در همین مرورگر ذخیره شد.");});
$("exportBtn").addEventListener("click",()=>{
 const payload={schema:1,exportedAt:new Date().toISOString(),settings:JSON.parse(localStorage.getItem(SETTINGS)||"{}"),products:read()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="products.json";a.click();URL.revokeObjectURL(url);
});
$("importFile").addEventListener("change",async e=>{
 const f=e.target.files[0];if(!f)return;
 try{const data=JSON.parse(await f.text()),items=Array.isArray(data)?data:data.products;if(!Array.isArray(items))throw Error();
  if(!confirm("کاتالوگ فعلی با فایل انتخاب‌شده جایگزین شود؟"))return;
  write(items);if(data.settings)localStorage.setItem(SETTINGS,JSON.stringify(data.settings));loadDashboard();alert("کاتالوگ وارد شد.");
 }catch{alert("فایل کاتالوگ معتبر نیست.");}finally{e.target.value="";}
});
