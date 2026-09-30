const C=window.APP_CONFIG;
const READY=C.supabaseUrl && C.supabaseAnonKey && !C.supabaseUrl.includes("PASTE_") && !C.supabaseAnonKey.includes("PASTE_");
const db=READY?supabase.createClient(C.supabaseUrl,C.supabaseAnonKey):null;
let me=null, profile=null, session=null, currentVideo=null, realtimeChannel=null;

const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function toast(x){let e=document.createElement("div");e.className="toast";e.textContent=x;document.body.appendChild(e);setTimeout(()=>e.remove(),2500)}
function loading(x="Memuat..."){$("#app").innerHTML=`<div class="loading">${esc(x)}</div>`}

async function boot(){
 if(!READY){return setupMissing()}
 const {data,error}=await db.auth.getSession();
 if(error)return setupMissing(error.message);
 session=data.session;
 if(!session)return login();
 me=session.user;
 await loadProfile();
}

function setupMissing(msg=""){
 $("#app").innerHTML=`<div class="login"><div class="loginbox"><h1>AI LIVE CONTROL</h1><p class="muted">Konfigurasi Supabase belum diisi.</p>
 <div class="notice">Buka <b>config.js</b>, isi <b>supabaseUrl</b> dan <b>supabaseAnonKey</b>, lalu upload kembali ke GitHub Pages.</div>${msg?`<div class="notice">${esc(msg)}</div>`:""}</div></div>`;
}

function login(){
 $("#app").innerHTML=`<div class="login"><form class="loginbox" id="loginForm"><h1>AI LIVE CONTROL</h1><p class="muted">Login SaaS</p>
 <label>Email<input id="email" type="email" required autocomplete="email"></label>
 <label>Password<input id="password" type="password" required autocomplete="current-password"></label>
 <div class="row"><button class="primary" type="submit">LOGIN</button><button type="button" id="signup">DAFTAR</button></div>
 <div class="notice">Akun baru akan menjadi <b>user</b>. Admin ditetapkan melalui database/aturan server.</div>
 </form></div>`;

 $("#loginForm").onsubmit=async e=>{
  e.preventDefault();
  let {error}=await db.auth.signInWithPassword({
   email:$("#email").value,
   password:$("#password").value
  });
  if(error)toast(error.message);
  else boot();
 };

 $("#signup").onclick=async()=>{
  let email=$("#email").value.trim(),password=$("#password").value;
  if(!email||password.length<6)return toast("Isi email dan password minimal 6 karakter.");
  let {error}=await db.auth.signUp({email,password});
  if(error)toast(error.message);
  else toast("Pendaftaran berhasil. Cek email jika confirmation aktif.");
 };
}

async function loadProfile(){
 let {data,error}=await db.from("profiles").select("*").eq("id",me.id).maybeSingle();
 if(error){toast(error.message);return}

 if(!data){
  let {data:p,error:e}=await db.from("profiles").insert({
   id:me.id,
   email:me.email,
   display_name:me.email.split("@")[0]
  }).select().single();

  if(e){toast(e.message);return}
  profile=p;
 }else{
  profile=data;
 }

 render();
 startRealtime();
}

function render(){
 $("#app").innerHTML=`<div class="wrap"><header class="top"><div><div class="brand">AI LIVE CONTROL</div><div class="sub">${esc(profile.display_name)} • ${esc(profile.plan)}</div></div><div class="row"><span class="badge ${profile.active?"":"red"}">${profile.active?"ACTIVE":"DISABLED"}</span><button id="logout">LOGOUT</button></div></header>
 <nav class="nav" id="nav"></nav><div id="page"></div></div>`;

 $("#logout").onclick=()=>db.auth.signOut().then(boot);

 let nav=[
  ["dashboard","Dashboard"],
  ["videos","Video AI"],
  ["triggers","Triggers"],
  ["account","Account"]
 ];

 if(profile.role==="admin")nav.push(["admin","Admin"]);

 $("#nav").innerHTML=nav.map((n,i)=>`<button class="${i===0?"active":""}" data-page="${n[0]}">${n[1]}</button>`).join("");

 $("#nav").onclick=e=>{
  let b=e.target.closest("[data-page]");
  if(!b)return;
  document.querySelectorAll("#nav button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  route(b.dataset.page);
 };

 route("dashboard");
}

async function route(p){
 if(p==="dashboard")return dashboard();
 if(p==="videos")return videos();
 if(p==="triggers")return triggers();
 if(p==="account")return account();
 if(p==="admin")return admin();
}

async function dashboard(){
 let {data:logs=[]}=await db.from("event_logs")
  .select("*")
  .eq("user_id",me.id)
  .order("created_at",{ascending:false})
  .limit(30);

 let {data:s}=await db.from("live_sessions")
  .select("*")
  .eq("user_id",me.id)
  .order("updated_at",{ascending:false})
  .limit(1)
  .maybeSingle();

 s=s||{
  viewer_count:0,
  comment_count:0,
  gift_count:0,
  diamonds:0,
  status:"offline"
 };

 $("#page").innerHTML=`<section class="grid">
 <div class="card metric">Viewer<b>${s.viewer_count}</b></div>
 <div class="card metric">Comment<b>${s.comment_count}</b></div>
 <div class="card metric">Gift<b>${s.gift_count}</b></div>
 <div class="card metric">Diamonds<b>${Number(s.diamonds).toLocaleString("id-ID")}</b></div>
 </section>

 <div class="layout">
 <section class="card">
 <div class="head"><h2>VIDEO AI</h2><span class="muted" id="state">STANDBY</span></div>
 <div class="player" id="player"><video id="vid" controls playsinline></video></div>
 <div class="row">
 <button id="stop" class="danger">STOP</button>
 <button data-test="comment" class="primary">TEST COMMENT</button>
 <button data-test="gift">TEST GIFT</button>
 <button data-test="boss">TEST BOSS</button>
 </div>
 </section>

 <section class="card">
 <div class="head"><h2>EVENT LOG</h2></div>
 <div class="log">
 ${logs.map(x=>`<div class=item>${esc(new Date(x.created_at).toLocaleTimeString())} • ${esc(x.event_type)} • ${esc(x.event_value||"")}</div>`).join("")||"<div class='empty'>Belum ada event.</div>"}
 </div>
 </section>
 </div>`;

 $("#stop").onclick=()=>{
  $("#vid").pause();
  $("#state").textContent="STANDBY";
 };

 document.querySelectorAll("[data-test]").forEach(b=>
  b.onclick=()=>testEvent(
   b.dataset.test,
   b.dataset.test==="comment"?"JOGED":b.dataset.test==="gift"?"Rose":"BOSS",
   b.dataset.test==="gift"?10:0
  )
 );
}

async function processEvent(ev){
 if(!ev?.event_type)return;

 let type=String(ev.event_type).trim().toLowerCase();
 let value=String(ev.event_value??"").trim();

 let {data:t,error}=await db.from("triggers")
  .select("*,videos(name,storage_path)")
  .eq("user_id",me.id)
  .eq("event_type",type)
  .eq("event_value",value)
  .eq("enabled",true)
  .limit(1)
  .maybeSingle();

 if(error){
  toast(error.message);
  return;
 }

 if(t?.videos){
  await playCloud(t.videos);
  toast("Trigger "+type+" : "+value);
 }else{
  toast("Event "+value+" diterima");
 }

 if(document.querySelector('[data-page="dashboard"]')?.classList.contains("active"))dashboard();
}

function startRealtime(){
 if(!db||!me)return;

 if(realtimeChannel){
  db.removeChannel(realtimeChannel);
  realtimeChannel=null;
 }

 realtimeChannel=db.channel("event-logs-"+me.id)
  .on("postgres_changes",{
   event:"INSERT",
   schema:"public",
   table:"event_logs",
   filter:`user_id=eq.${me.id}`
  },payload=>processEvent(payload.new))
  .subscribe(status=>{
   if(status==="SUBSCRIBED")toast("Realtime event aktif");
   if(status==="CHANNEL_ERROR")toast("Realtime event gagal terhubung");
  });
}

async function testEvent(type,value,diamonds=0){
 let {error}=await db.from("event_logs").insert({
  user_id:me.id,
  event_type:type,
  event_value:value,
  diamonds
 });

 if(error)return toast(error.message);

 toast("Test event dikirim: "+value);
}

async function playCloud(v){
 const {data,error}=await db.storage.from("videos").createSignedUrl(
  v.storage_path,
  3600
 );

 if(error||!data?.signedUrl){
  toast(error?.message||"Gagal membuat URL video.");
  return;
 }

 let url=data.signedUrl;
 currentVideo=url;

 await new Promise(r=>setTimeout(r,0));

 let p=$("#player"),el=$("#vid");

 if(!p||!el)return;

 el.src=url;
 p.classList.add("has");
 el.play().catch(()=>{});
 $("#state").textContent="PLAYING";
}

async function videos(){
 let {data=[],error}=await db.from("videos")
  .select("*")
  .eq("user_id",me.id)
  .order("created_at",{ascending:false});

 $("#page").innerHTML=`<section class="card">
 <div class="head">
 <h2>VIDEO LIBRARY</h2>
 <label class="button">UPLOAD VIDEO
 <input id="up" type="file" accept="video/*" multiple hidden>
 </label>
 </div>

 <div id="library" class="library">
 ${data.length?
  data.map(v=>`<div class=file>
  <b>VIDEO ${esc(v.name)}</b>
  <span class=muted>${esc(v.mime_type||"video")}</span>
  <div class=row>
  <button data-play="${esc(v.id)}">PLAY</button>
  <button data-del="${esc(v.id)}" class=danger>DELETE</button>
  </div>
  </div>`).join("")
  :
  "<div class=empty>Belum ada video.</div>"
 }
 </div>
 </section>`;

 $("#up").onchange=uploadVideos;

 $("#library").onclick=async e=>{
  let b=e.target.closest("button");
  if(!b)return;

  if(b.dataset.del)deleteVideo(b.dataset.del);

  if(b.dataset.play){
   let {data:v}=await db.from("videos")
    .select("*")
    .eq("id",b.dataset.play)
    .single();

   if(v)playCloud(v);
  }
 };
}

async function uploadVideos(e){
 for(const f of [...e.target.files]){
  let path=`${me.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;

  let {error}=await db.storage.from("videos").upload(
   path,
   f,
   {
    contentType:f.type,
    upsert:false
   }
  );

  if(error){
   toast(error.message);
   continue;
  }

  let {error:e2}=await db.from("videos").insert({
   user_id:me.id,
   name:f.name,
   storage_path:path,
   mime_type:f.type,
   size_bytes:f.size
  });

  if(e2)toast(e2.message);
 }

 toast("Upload selesai");
 videos();
}

async function deleteVideo(id){
 let {data:v}=await db.from("videos")
  .select("*")
  .eq("id",id)
  .single();

 if(!v)return;

 await db.storage.from("videos").remove([v.storage_path]);
 await db.from("videos").delete().eq("id",id);

 videos();
}

async function triggers(){
 let {data:vs=[]}=await db.from("videos")
  .select("id,name")
  .eq("user_id",me.id)
  .order("name");

 let {data:ts=[]}=await db.from("triggers")
  .select("*")
  .eq("user_id",me.id)
  .order("created_at");

 $("#page").innerHTML=`<section class="card">
 <div class="head">
 <h2>TRIGGER MANAGER</h2>
 <button id="add" class=primary>ADD</button>
 </div>

 <div id="tl">
 ${ts.map(t=>rowTrigger(t,vs)).join("")||"<div class=empty>Belum ada trigger.</div>"}
 </div>
 </section>`;

 $("#add").onclick=async()=>{
  await db.from("triggers").insert({
   user_id:me.id,
   event_type:"comment",
   event_value:"KEYWORD",
   enabled:true
  });
  triggers();
 };

 $("#tl").onchange=async e=>{
  let id=e.target.dataset.id;
  let key=e.target.dataset.key;

  if(id&&key){
   await db.from("triggers")
    .update({
     [key]:key==="enabled"?e.target.checked:e.target.value
    })
    .eq("id",id)
    .eq("user_id",me.id);
  }
 };

 $("#tl").onclick=async e=>{
  let b=e.target.closest("[data-del]");

  if(b){
   await db.from("triggers")
    .delete()
    .eq("id",b.dataset.del)
    .eq("user_id",me.id);

   triggers();
  }
 };
}

function rowTrigger(t,vs){
 return `<div class=trigger>
 <select data-id="${t.id}" data-key="event_type">
 <option ${t.event_type==="comment"?"selected":""}>comment</option>
 <option ${t.event_type==="gift"?"selected":""}>gift</option>
 <option ${t.event_type==="boss"?"selected":""}>boss</option>
 </select>

 <input data-id="${t.id}" data-key="event_value" value="${esc(t.event_value)}">

 <select data-id="${t.id}" data-key="video_id">
 <option value="">-- video --</option>
 ${vs.map(v=>`<option value="${v.id}" ${v.id===t.video_id?"selected":""}>${esc(v.name)}</option>`).join("")}
 </select>

 <button data-del="${t.id}" class=danger>DELETE</button>
 </div>`;
}

async function account(){
 $("#page").innerHTML=`<section class=card>
 <div class=head><h2>ACCOUNT</h2></div>

 <div class=form>
 <label>Email<input value="${esc(me.email)}" readonly></label>
 <label>Nama<input id=name value="${esc(profile.display_name)}"></label>
 <label>Plan<input value="${esc(profile.plan)}" readonly></label>
 <label>Status<input value="${profile.active?"ACTIVE":"DISABLED"}" readonly></label>
 </div>

 <div class=row>
 <button id=save class=primary>SAVE</button>
 </div>
 </section>`;

 $("#save").onclick=async()=>{
  let {error}=await db.from("profiles")
   .update({
    display_name:$("#name").value.trim()
   })
   .eq("id",me.id);

  if(error){
   toast(error.message);
  }else{
   profile.display_name=$("#name").value.trim();
   toast("Tersimpan");
   render();
  }
 };
}

async function admin(){
 let {data:users=[],error}=await db.from("profiles")
  .select("*")
  .order("created_at",{ascending:false});

 if(error){
  return $("#page").innerHTML=`<div class=card>${esc(error.message)}</div>`;
 }

 $("#page").innerHTML=`<section class=card>
 <div class=head>
 <h2>ADMIN - USER MANAGEMENT</h2>
 <span class=muted>${users.length} akun</span>
 </div>

 <table class=table>
 <thead>
 <tr>
 <th>Email</th>
 <th>Nama</th>
 <th>Plan</th>
 <th>Status</th>
 <th>Role</th>
 <th></th>
 </tr>
 </thead>

 <tbody>
 ${users.map(u=>`<tr>
 <td>${esc(u.email)}</td>
 <td>${esc(u.display_name)}</td>
 <td>${esc(u.plan)}</td>
 <td>${u.active?"ACTIVE":"DISABLED"}</td>
 <td>${esc(u.role)}</td>
 <td>
 <button data-user="${u.id}" data-active="${u.active}">
 ${u.active?"DISABLE":"ENABLE"}
 </button>
 </td>
 </tr>`).join("")}
 </tbody>
 </table>
 </section>`;

 document.querySelectorAll("[data-user]").forEach(b=>
  b.onclick=async()=>{
   let id=b.dataset.user;
   let active=b.dataset.active==="true";

   await db.from("profiles")
    .update({active:!active})
    .eq("id",id);

   admin();
  }
 );
}

boot();
