const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let posterFile=null;
$("loginBtn").onclick=login;
$("password").onkeydown=e=>{if(e.key==="Enter")login();};
async function login(){
 $("loginError").textContent="در حال ورود...";
 const {error}=await barnaDb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){$("loginError").textContent=error.message;return;}
 try{await barnaRequireAdmin();$("login").hidden=true;$("dash").hidden=false;await renderAll();}
 catch(e){$("loginError").textContent=e.message;}
}
barnaDb.auth.getSession().then(async({data})=>{if(data.session){try{await barnaRequireAdmin();$("login").hidden=true;$("dash").hidden=false;await renderAll();}catch{}}});
$("image").onchange=e=>{posterFile=e.target.files[0]||null;$("preview").textContent=posterFile?posterFile.name:"";};
$("eventForm").onsubmit=async e=>{
 e.preventDefault();$("formMsg").textContent="در حال ذخیره ایونت...";
 try{
  await barnaRequireAdmin();
  const id=$("editId").value;
  const {data:old}=id?await barnaDb.from("events").select("*").eq("id",id).single():{data:null};
  let poster_url=old?.poster_url||"";
  if(posterFile)poster_url=await barnaUpload(BARNA_PUBLIC_BUCKET,posterFile,"posters");
  const display_date=$("date").value.trim(),display_time=$("time").value;
  const item={title:$("title").value.trim(),description:$("description").value.trim(),display_date,display_time,prize:$("prize").value.trim(),fee:Number($("fee").value||0),capacity:Number($("capacity").value||0)||null,team_size:Number($("teamSize").value||4),rules:$("rules").value.trim(),poster_url};
  const result=id?await barnaDb.from("events").update(item).eq("id",id):await barnaDb.from("events").insert(item);
  if(result.error)throw result.error;
  reset();await renderAll();$("formMsg").textContent="ایونت در دیتابیس ذخیره شد.";
 }catch(err){barnaShowError("formMsg",err);}
};
function reset(){$("eventForm").reset();$("editId").value="";posterFile=null;$("preview").textContent="";$("formHeading").textContent="ساخت ایونت";$("cancel").hidden=true;}
$("cancel").onclick=reset;
async function edit(id){
 const {data:e,error}=await barnaDb.from("events").select("*").eq("id",id).single();if(error)return alert(error.message);
 $("editId").value=id;$("title").value=e.title;$("description").value=e.description||"";
 $("date").value=e.display_date||"";$("time").value=e.display_time||"";$("prize").value=e.prize||"";
 $("fee").value=e.fee||0;$("capacity").value=e.capacity||"";$("teamSize").value=e.team_size||4;$("rules").value=e.rules||"";
 $("preview").textContent=e.poster_url?"پوستر فعلی حفظ می‌شود؛ برای تعویض فایل جدید انتخاب کن.":"";
 $("formHeading").textContent="ویرایش ایونت";$("cancel").hidden=false;window.scrollTo({top:0,behavior:"smooth"});
}
async function toggleEvent(id,status){const {error}=await barnaDb.from("events").update({status:status==="closed"?"open":"closed"}).eq("id",id);if(error)alert(error.message);await renderAll();}
async function deleteEvent(id){if(!confirm("ایونت و ثبت‌نام‌های آن حذف شوند؟"))return;const {error}=await barnaDb.from("events").delete().eq("id",id);if(error)alert(error.message);await renderAll();}
async function renderAll(){
 const {data:ev,error}=await barnaDb.from("events").select("*").order("created_at",{ascending:false});if(error)throw error;
 $("eventList").innerHTML=ev.length?ev.map(e=>`<div class="admin-product"><div class="admin-product-info"><b>${esc(e.title)}</b><small>${esc(e.display_date)} ${esc(e.display_time)} · ${e.status==="closed"?"بسته":"باز"}</small></div><div class="admin-actions"><button data-edit="${e.id}">ویرایش</button><button data-toggle="${e.id}">${e.status==="closed"?"بازکردن":"بستن"}</button><button data-delete="${e.id}">حذف</button></div></div>`).join(""):"<p>ایونتی وجود ندارد.</p>";
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit));
 document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggleEvent(b.dataset.toggle,ev.find(x=>x.id===b.dataset.toggle).status));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteEvent(b.dataset.delete));
 const options=ev.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join("");
 $("filterEvent").innerHTML='<option value="all">همه ایونت‌ها</option>'+options;
 $("resultEvent").innerHTML=options;
 await renderRegs();await loadResult();
}
$("filterEvent").onchange=renderRegs;$("filterStatus").onchange=renderRegs;
async function renderRegs(){
 const f=$("filterEvent").value,s=$("filterStatus").value;
 let q=barnaDb.from("event_registrations").select("*").order("created_at",{ascending:false});
 if(f!=="all")q=q.eq("event_id",f);if(s!=="all")q=q.eq("status",s);
 const [{data:regs,error},{data:ev}]=await Promise.all([q,barnaDb.from("events").select("id,title")]);
 if(error){barnaShowError("registrations",error);return;}
 const html=await Promise.all((regs||[]).map(async r=>{
  const receipt=await barnaReceiptUrl(r.receipt_path);
  return `<div class="reg-row"><div class="reg-info"><b>${esc(r.player_name)}</b><small>UID: ${esc(r.player_uid)}<br>ایونت: ${esc(ev.find(x=>x.id===r.event_id)?.title||"حذف‌شده")}<br>وضعیت: ${esc(r.status)}</small></div>${receipt?`<a href="${receipt}" target="_blank" rel="noopener">مشاهده فیش</a>`:""}<div class="reg-actions"><button class="yes" data-yes="${r.id}">تأیید</button><button class="no" data-no="${r.id}">رد</button></div></div>`;
 }));
 $("registrations").innerHTML=html.join("")||"<p>درخواستی پیدا نشد.</p>";
 document.querySelectorAll("[data-yes]").forEach(b=>b.onclick=()=>setStatus(b.dataset.yes,"approved"));
 document.querySelectorAll("[data-no]").forEach(b=>b.onclick=()=>setStatus(b.dataset.no,"rejected"));
}
async function setStatus(id,status){const {error}=await barnaDb.from("event_registrations").update({status}).eq("id",id);if(error)alert(error.message);await renderRegs();}
$("draw").onclick=async()=>{
 const id=$("filterEvent").value==="all"?$("resultEvent").value:$("filterEvent").value;
 const {data:e}=await barnaDb.from("events").select("*").eq("id",id).single();if(!e)return alert("یک ایونت انتخاب کن.");
 const {data:p,error}=await barnaDb.from("event_registrations").select("*").eq("event_id",id).eq("status","approved");
 if(error)return alert(error.message);if(!p.length)return alert("بازیکن تأییدشده‌ای وجود ندارد.");
 for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
 const {data:oldTeams,error:oldErr}=await barnaDb.from("event_teams").select("id").eq("event_id",id);
 if(oldErr)return alert(oldErr.message);
 const oldIds=(oldTeams||[]).map(t=>t.id);
 if(oldIds.length){
  const {error:membersErr}=await barnaDb.from("event_team_members").delete().in("team_id",oldIds);
  if(membersErr)return alert(membersErr.message);
  const {error:teamsErr}=await barnaDb.from("event_teams").delete().eq("event_id",id);
  if(teamsErr)return alert(teamsErr.message);
 }
 const groups=[];for(let i=0;i<p.length;i+=e.team_size)groups.push(p.slice(i,i+e.team_size));
 let teamMarkup=[];
 for(let i=0;i<groups.length;i++){
  const {data:t,error:te}=await barnaDb.from("event_teams").insert({event_id:id,team_number:i+1}).select().single();
  if(te)return alert(te.message);
  const members=groups[i].map(x=>({team_id:t.id,registration_id:x.id}));
  const {error:me}=await barnaDb.from("event_team_members").insert(members);if(me)return alert(me.message);
  teamMarkup.push(`<div class="team"><b>تیم ${i+1}</b>${groups[i].map(x=>`<p>${esc(x.player_name)}<br>UID: ${esc(x.player_uid)}</p>`).join("")}</div>`);
 }
 $("teams").innerHTML=teamMarkup.join("");
};
$("resultEvent").onchange=loadResult;
async function loadResult(){
 const id=$("resultEvent").value;if(!id)return;
 const {data}=await barnaDb.from("event_results").select("*").eq("event_id",id).maybeSingle();
 $("room").value=data?.room_code||"";$("revealRoom").checked=data?.reveal_room_code||false;
 $("winner").value=data?.winner||"";$("winnerMsg").value=data?.winner_message||"";$("publishWinner").checked=data?.published||false;
}
$("saveResult").onclick=async()=>{
 const id=$("resultEvent").value;if(!id)return;
 const {error}=await barnaDb.from("event_results").upsert({event_id:id,room_code:$("room").value.trim(),reveal_room_code:$("revealRoom").checked,winner:$("winner").value.trim(),winner_message:$("winnerMsg").value.trim(),published:$("publishWinner").checked});
 $("resultMsg").textContent=error?error.message:"نتیجه ذخیره شد و طبق گزینه‌ها در صفحه عمومی نمایش داده می‌شود.";
};
