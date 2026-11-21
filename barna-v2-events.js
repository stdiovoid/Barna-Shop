const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let chosen=null;
async function render(){
 const {data:events,error}=await barnaDb.from("events").select("*").neq("status","hidden").order("starts_at",{ascending:true,nullsFirst:false});
 if(error){$("empty").textContent=error.message;return;}
 $("eventCount").textContent=(events||[]).length.toLocaleString("fa-IR")+" ایونت";
 $("empty").style.display=events?.length?"none":"block";
 const {data:results}=await barnaDb.from("public_event_results").select("*");
 const resultMap=new Map((results||[]).map(r=>[r.event_id,r]));
 $("eventGrid").innerHTML=(events||[]).map(e=>{
  const r=resultMap.get(e.id);
  return `<article class="event-card"><div class="event-cover">${e.poster_url?`<img src="${esc(e.poster_url)}" alt="">`:""}</div><div class="event-content"><h3>${esc(e.title)}</h3><p>${esc(e.description||"")}</p><div class="event-data"><span><b>زمان</b>${esc(e.display_date||"اعلام نشده")} ${esc(e.display_time||"")}</span><span><b>جایزه</b>${esc(e.prize||"اعلام نشده")}</span><span><b>ورودی</b>${Number(e.fee||0).toLocaleString("fa-IR")} تومان</span><span><b>تیم</b>${Number(e.team_size||4)} نفره</span></div>${r?.room_code?`<p class="event-room"><b>کد روم:</b> ${esc(r.room_code)}</p>`:""}${r?.result_published?`<div class="event-result"><b>برنده: ${esc(r.winner)}</b><p>${esc(r.winner_message)}</p></div>`:""}<button class="join-btn" data-join="${e.id}" ${e.status!=="open"?"disabled":""}>${e.status==="open"?"شرکت در مسابقه":"ثبت‌نام بسته است"}</button></div></article>`;
 }).join("");
 document.querySelectorAll("[data-join]").forEach(b=>b.onclick=()=>openJoin(b.dataset.join,events));
}
function openJoin(id,events){
 chosen=events.find(e=>e.id===id);if(!chosen)return;
 $("joinForm").reset();$("modalTitle").textContent=chosen.title;
 $("modalRules").textContent=chosen.rules||"قوانین خاصی ثبت نشده است.";
 $("receiptWrap").hidden=!(Number(chosen.fee)>0);$("receipt").required=Number(chosen.fee)>0;
 $("joinMessage").textContent="";$("joinModal").hidden=false;
}
$("closeModal").onclick=()=>$("joinModal").hidden=true;
$("joinModal").onclick=e=>{if(e.target.id==="joinModal")$("joinModal").hidden=true};
$("joinForm").onsubmit=async e=>{
 e.preventDefault();$("joinMessage").textContent="در حال ارسال درخواست...";
 try{
  const uid=$("playerUid").value.trim();
  let receipt_path=null;
  const file=$("receipt").files[0];
  if(Number(chosen.fee)>0&&!file)throw Error("برای ایونت پولی تصویر فیش لازم است.");
  if(file)receipt_path=await barnaUpload(BARNA_RECEIPTS_BUCKET,file,chosen.id);
  const {error}=await barnaDb.from("event_registrations").insert({event_id:chosen.id,player_name:$("playerName").value.trim(),player_uid:uid,receipt_path});
  if(error){if(error.code==="23505")throw Error("برای این UID قبلاً درخواست ثبت شده.");throw error;}
  $("joinMessage").textContent="درخواست ثبت شد و منتظر بررسی مدیر است.";e.target.reset();
 }catch(err){$("joinMessage").textContent=err.message||"ارسال درخواست ناموفق بود.";}
};
render();
