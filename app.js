/* Ritregistratie PWA prototype. Local-first; configure the Apps Script backend before production use. */
const STORE_KEY = "ritregistratie_v1";
const SETTINGS_KEY = "ritregistratie_settings_v1";
const $ = id => document.getElementById(id);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
const nowIso = () => new Date().toISOString();
const nlTime = iso => iso ? new Date(iso).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}) : "";
let db = loadDb();
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"endpoint":"","token":""}');
let activeTripId = db.activeTripId || null;

function loadDb(){ try{return JSON.parse(localStorage.getItem(STORE_KEY)) || {trips:[],outbox:[],activeTripId:null};}catch(e){return {trips:[],outbox:[],activeTripId:null};} }
function saveDb(){ db.activeTripId=activeTripId; localStorage.setItem(STORE_KEY,JSON.stringify(db)); renderAll(); }
function activeTrip(){ return db.trips.find(t=>t.id===activeTripId && !t.endedAt) || null; }
function queue(type, record){ db.outbox.push({eventId:uuid(),type,record,queuedAt:nowIso()}); }
function persistTrip(trip){ trip.updatedAt=nowIso(); queue("upsert",JSON.parse(JSON.stringify(trip))); saveDb(); scheduleSync(); }
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setConnection(){ $("connection").textContent = navigator.onLine ? (db.outbox.length ? `Online · ${db.outbox.length} wijziging(en) wachten op synchronisatie` : "Online · lokaal opgeslagen") : "Offline · lokaal opgeslagen"; $("offlineNotice").classList.toggle("hidden",navigator.onLine); }
function showView(name){ document.querySelectorAll("main section").forEach(s=>s.classList.add("hidden")); $("view-"+name).classList.remove("hidden"); document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===name)); if(name==="overzicht")renderOverview(); }
document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));

function startTrip(){
  if(activeTrip()){alert("Er is al een actieve dienst.");return;}
  const chauffeur=$("chauffeur").value.trim();
  if(!chauffeur){alert("Vul eerst de naam van de chauffeur in.");$("chauffeur").focus();return;}
  const trip={id:uuid(),chauffeur,opdrachtgever:$("opdrachtgever").value.trim(),kenteken:$("kenteken").value.trim(),oplegger:$("oplegger").value.trim(),datum:$("dienstDatum").value || new Date().toISOString().slice(0,10),kmStart:$("kmStart").value,startedAt:nowIso(),endedAt:null,kmEind:"",stops:[],createdAt:nowIso(),updatedAt:nowIso(),syncStatus:"pending"};
  db.trips.push(trip); activeTripId=trip.id; queue("upsert",JSON.parse(JSON.stringify(trip))); saveDb(); scheduleSync();
}
function endTrip(){
  const trip=activeTrip(); if(!trip)return;
  if(!confirm("Dienst beëindigen? Controleer eerst de stops en kilometerstand."))return;
  const km=prompt("Kilometerstand einde:",trip.kmEind||""); if(km===null)return;
  trip.kmEind=km; trip.endedAt=nowIso(); trip.syncStatus="pending";
  queue("upsert",JSON.parse(JSON.stringify(trip))); activeTripId=null; saveDb(); scheduleSync();
}
function addStop(){
  const trip=activeTrip();if(!trip)return;
  const stop={id:uuid(),volgnummer:trip.stops.length+1,plaats:"",km:"",aankomstAt:null,vertrekAt:null,tempLaden:"",tempLossen:"",opmerking:"",palletregels:[],updatedAt:nowIso()};
  trip.stops.push(stop); persistTrip(trip);
}
function findStop(id){const t=activeTrip();return t?.stops.find(s=>s.id===id);}
function captureStop(el){
  const trip=activeTrip(); if(!trip)return;
  const stopId=el.closest(".stoprow").dataset.stopId; const stop=findStop(stopId); if(!stop)return;
  el.querySelectorAll("[data-field]").forEach(inp=>{const k=inp.dataset.field;if(k==="aankomst")return;if(k==="vertrek")return;stop[k]=inp.value;});
  stop.updatedAt=nowIso(); trip.syncStatus="pending"; queue("upsert",JSON.parse(JSON.stringify(trip))); saveDb(); scheduleSync();
}
function addCargo(stopId){
  const trip=activeTrip(),stop=findStop(stopId);if(!trip||!stop)return;
  stop.palletregels.push({id:uuid(),handeling:"Gelost",type:"Europallet",aantal:"",omschrijving:""});
  persistTrip(trip);
}
function captureCargo(el){
  const trip=activeTrip();if(!trip)return;
  const stop=findStop(el.closest(".stoprow").dataset.stopId);if(!stop)return;
  const cargo=stop.palletregels.find(c=>c.id===el.closest(".cargo-row").dataset.cargoId);if(!cargo)return;
  el.querySelectorAll("[data-cargo]").forEach(inp=>cargo[inp.dataset.cargo]=inp.value);
  const other=el.querySelector('[data-cargo="type"]').value==="Overige";
  el.querySelector(".otherType").classList.toggle("hidden",!other);
  trip.syncStatus="pending";queue("upsert",JSON.parse(JSON.stringify(trip)));saveDb();scheduleSync();
}
function renderStops(){
  const list=$("stopsList"),trip=activeTrip();list.innerHTML="";
  $("addStop").disabled=!trip;$("eindDienst").disabled=!trip;
  $("dienstStatus").textContent=trip?"Actieve dienst":"Geen actieve dienst";
  if(!trip){list.className="empty";list.textContent="Start eerst een dienst om stops toe te voegen.";return;}
  list.className="";
  if(!trip.stops.length){list.innerHTML='<div class="empty">Nog geen stops. Druk op + Stop.</div>';return;}
  // Toon alleen de nieuwste stop. Eerdere stops blijven bewaard in de dienst.
  const visibleStops = trip.stops.length ? [trip.stops[trip.stops.length - 1]] : [];
  visibleStops.forEach((stop)=>{
    const index = trip.stops.findIndex(s => s.id === stop.id);
    const node=$("stopTemplate").content.firstElementChild.cloneNode(true);node.dataset.stopId=stop.id;node.querySelector(".stopTitle").textContent=`Stop ${index+1}`;
    node.querySelectorAll("[data-field]").forEach(inp=>{const k=inp.dataset.field;if(k==="aankomst")inp.value=nlTime(stop.aankomstAt);else if(k==="vertrek")inp.value=nlTime(stop.vertrekAt);else inp.value=stop[k]??"";});
    node.querySelector(".markArrival").disabled=!!stop.aankomstAt;node.querySelector(".markDeparture").disabled=!stop.aankomstAt||!!stop.vertrekAt;
    node.querySelector(".markArrival").addEventListener("click",()=>{stop.aankomstAt=nowIso();persistTrip(trip);});
    node.querySelector(".markDeparture").addEventListener("click",()=>{if(!stop.aankomstAt){alert("Registreer eerst aankomst.");return;}stop.vertrekAt=nowIso();persistTrip(trip);});
    node.querySelector(".deleteStop").addEventListener("click",()=>{if(confirm("Deze stop verwijderen?")){trip.stops=trip.stops.filter(s=>s.id!==stop.id);persistTrip(trip);}});
    node.querySelector(".addCargo").addEventListener("click",()=>addCargo(stop.id));
    node.querySelectorAll("[data-field]").forEach(inp=>inp.addEventListener("change",()=>captureStop(node)));
    const cargoList=node.querySelector(".cargoList");
    stop.palletregels.forEach(cargo=>{
      const cnode=$("cargoTemplate").content.firstElementChild.cloneNode(true);cnode.dataset.cargoId=cargo.id;
      cnode.querySelectorAll("[data-cargo]").forEach(inp=>inp.value=cargo[inp.dataset.cargo]??"");
      cnode.querySelector(".otherType").classList.toggle("hidden",cargo.type!=="Overige");
      cnode.querySelector(".removeCargo").addEventListener("click",()=>{stop.palletregels=stop.palletregels.filter(c=>c.id!==cargo.id);persistTrip(trip);});
      cnode.querySelectorAll("[data-cargo]").forEach(inp=>inp.addEventListener("change",()=>captureCargo(cnode)));
      cargoList.appendChild(cnode);
    });
    list.appendChild(node);
  });
}
function renderAll(){
  const t=activeTrip();
  if(t){
    ["chauffeur","opdrachtgever","kenteken","oplegger","kmStart","dienstDatum"].forEach(id=>{const map={chauffeur:"chauffeur",opdrachtgever:"opdrachtgever",kenteken:"kenteken",oplegger:"oplegger",kmStart:"kmStart",dienstDatum:"datum"};$(id).value=t[map[id]]||"";});
  }
  renderStops();setConnection();renderOverview();
}
function renderOverview(){
  $("kpiDiensten").textContent=db.trips.length;
  $("kpiStops").textContent=db.trips.reduce((n,t)=>n+t.stops.length,0);
  $("kpiPallets").textContent=db.trips.reduce((n,t)=>n+t.stops.reduce((m,s)=>m+s.palletregels.length,0),0);
  $("kpiPending").textContent=db.outbox.length;
  const balance={};db.trips.forEach(t=>t.stops.forEach(s=>s.palletregels.forEach(p=>{if(!p.type||p.aantal==="")return;const key=p.type;balance[key]??={gelost:0,geladen:0};balance[key][p.handeling==="Gelost"?"gelost":"geladen"]+=Number(p.aantal)||0;})));
  const pb=$("palletBalance");const entries=Object.entries(balance);
  pb.innerHTML=entries.length?`<table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Type</th><th align="right">Gelost</th><th align="right">Geladen</th></tr></thead><tbody>${entries.map(([k,v])=>`<tr><td style="padding:8px 0">${esc(k)}</td><td align="right">${v.gelost}</td><td align="right">${v.geladen}</td></tr>`).join("")}</tbody></table>`:'<div class="empty">Nog geen palletregels.</div>';
  const tl=$("tripsList");
  tl.innerHTML=db.trips.length?db.trips.slice().reverse().map(t=>`<div class="triprow"><div class="rowtop"><strong>${esc(t.datum)} · ${esc(t.chauffeur)}</strong><span class="pill">${t.endedAt?"Afgerond":"Actief"}</span></div><div>${esc(t.kenteken||"Geen kenteken")} · ${t.stops.length} stop(s)</div><div class="muted small">${esc(t.opdrachtgever||"Geen opdrachtgever")} · ${esc(t.syncStatus||"lokaal")}</div></div>`).join(""):'<div class="empty">Nog geen diensten.</div>';
}
$("startDienst").addEventListener("click",startTrip);$("eindDienst").addEventListener("click",endTrip);$("addStop").addEventListener("click",addStop);
$("saveSettings").addEventListener("click",()=>{settings.endpoint=$("endpoint").value.trim();settings.token=$("syncToken").value.trim();localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));$("syncMessage").textContent="Instellingen lokaal opgeslagen. Test de koppeling voordat je de app gebruikt.";scheduleSync();});
$("syncNow").addEventListener("click",syncNow);
$("exportJson").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({exportedAt:nowIso(),...db},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ritregistratie-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);});
function loadSettingsUI(){$("endpoint").value=settings.endpoint||"";$("syncToken").value=settings.token||"";}
let syncTimer=null;function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(navigator.onLine)syncNow();},1200);}
async function syncNow(){
  if(!navigator.onLine){$("syncMessage").textContent="Offline. Gegevens blijven op dit toestel bewaard.";return;}
  if(!settings.endpoint||!settings.token){$("syncMessage").textContent="Nog niet geconfigureerd: vul de Apps Script-URL en toegangscode in.";setConnection();return;}
  if(!db.outbox.length){$("syncMessage").textContent="Geen wijzigingen om te synchroniseren.";setConnection();return;}
  $("syncMessage").textContent="Synchronisatie wordt geprobeerd…";
  const batch=db.outbox.slice(0,20);
  try{
    const response=await fetch(settings.endpoint,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({token:settings.token,events:batch}),redirect:"follow"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const result=await response.json();
    if(!result||result.ok!==true)throw new Error(result?.error||"De server heeft de synchronisatie niet bevestigd.");
    const sent=new Set(batch.map(x=>x.eventId));db.outbox=db.outbox.filter(x=>!sent.has(x.eventId));
    batch.forEach(e=>{const t=db.trips.find(t=>t.id===e.record.id);if(t)t.syncStatus="gesynchroniseerd";});
    localStorage.setItem(STORE_KEY,JSON.stringify(db));$("syncMessage").textContent=`Gesynchroniseerd: ${batch.length} wijziging(en).`;
    setConnection();renderOverview();if(db.outbox.length)scheduleSync();
}catch(err){
  console.error("Synchronisatiefout:", err);
  $("syncMessage").textContent =
    "Synchronisatiefout: " + String(err.message || err);
  setConnection();
}
window.addEventListener("online",()=>{setConnection();syncNow();});window.addEventListener("offline",setConnection);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
loadSettingsUI();if(!$("dienstDatum").value)$("dienstDatum").value=new Date().toISOString().slice(0,10);renderAll();
