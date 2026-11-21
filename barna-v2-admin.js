const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let pendingFiles=[], editingImages=[];

$("loginBtn").addEventListener("click", login);
$("password").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
async function login(){
  $("loginError").textContent="در حال ورود...";
  const {error}=await barnaDb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){$("loginError").textContent=error.message;return;}
  try{await barnaRequireAdmin();$("loginPanel").hidden=true;$("dashboard").hidden=false;await loadDashboard();}
  catch(e){$("loginError").textContent=e.message;}
}
barnaDb.auth.getSession().then(async ({data})=>{
  if(data.session){try{await barnaRequireAdmin();$("loginPanel").hidden=true;$("dashboard").hidden=false;await loadDashboard();}catch{}}
});
async function loadDashboard(){
  const {data}=await barnaDb.from("store_settings").select("value").eq("key","order_link").maybeSingle();
  $("orderLink").value=data?.value || "https://rubika.ir/Studivoid"; await renderAdmin();
}
function resetForm(){
  $("productForm").reset();$("editId").value="";pendingFiles=[];editingImages=[];
  $("imagePreview").innerHTML="";$("formTitle").textContent="افزودن اکانت جدید";
  $("saveBtn").textContent="ثبت محصول";$("cancelEdit").hidden=true;
}
$("cancelEdit").addEventListener("click",resetForm);
$("images").addEventListener("change",e=>{pendingFiles=[...e.target.files];$("imagePreview").innerHTML=pendingFiles.map(f=>`<span>${esc(f.name)}</span>`).join("");});
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();$("formMessage").textContent="در حال ذخیره...";
  try{
    await barnaRequireAdmin();
    const id=$("editId").value;
    let images=[...editingImages];
    for(const file of pendingFiles){const url=await barnaUpload(BARNA_PUBLIC_BUCKET,file,"products");if(url)images.push(url);}
    const product={title:$("title").value.trim(),description:$("description").value.trim(),price:Number($("price").value),status:$("status").value,images};
    const result=id?await barnaDb.from("products").update(product).eq("id",id):await barnaDb.from("products").insert(product);
    if(result.error)throw result.error;
    resetForm();await renderAdmin();$("formMessage").textContent="محصول در دیتابیس ذخیره شد.";
  }catch(err){barnaShowError("formMessage",err);}
});
async function editProduct(id){
  const {data:p,error}=await barnaDb.from("products").select("*").eq("id",id).single();
  if(error){barnaShowError("formMessage",error);return;}
  $("editId").value=p.id;$("title").value=p.title;$("description").value=p.description||"";
  $("price").value=p.price;$("status").value=p.status||"available";editingImages=p.images||[];pendingFiles=[];
  $("imagePreview").innerHTML=editingImages.map((u,i)=>`<div><img src="${esc(u)}" alt=""><button type="button" data-remove-image="${i}">حذف تصویر</button></div>`).join("");
  document.querySelectorAll("[data-remove-image]").forEach(b=>b.onclick=()=>{editingImages.splice(Number(b.dataset.removeImage),1);editProduct(id);});
  $("formTitle").textContent="ویرایش اکانت";$("saveBtn").textContent="ذخیره تغییرات";$("cancelEdit").hidden=false;
  window.scrollTo({top:0,behavior:"smooth"});
}
async function deleteProduct(id){
  if(!confirm("این محصول حذف شود؟"))return;
  const {error}=await barnaDb.from("products").delete().eq("id",id);
  if(error)alert(error.message);else await renderAdmin();
}
async function renderAdmin(){
  const {data:items,error}=await barnaDb.from("products").select("*").order("created_at",{ascending:false});
  if(error){barnaShowError("adminProducts",error);return;}
  $("adminCount").textContent=`${items.length} محصول`;
  $("adminProducts").innerHTML=items.length?items.map(p=>`<div class="admin-product">${p.images?.[0]?`<img src="${esc(p.images[0])}" alt="">`:`<div class="admin-thumb">◇</div>`}<div class="admin-product-info"><b>${esc(p.title)}</b><small>${Number(p.price).toLocaleString("fa-IR")} تومان · ${p.status==="sold"?"فروخته‌شده":"موجود"}</small></div><div class="admin-actions"><button data-edit="${p.id}">ویرایش</button><button class="delete" data-delete="${p.id}">حذف</button></div></div>`).join(""):"<p class='hint'>هنوز محصولی ثبت نشده است.</p>";
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
}
$("saveSettings").addEventListener("click",async()=>{
  const {error}=await barnaDb.from("store_settings").upsert({key:"order_link",value:$("orderLink").value.trim()||"https://rubika.ir/Studivoid"});
  alert(error?error.message:"تنظیمات مشترک ذخیره شد.");
});
