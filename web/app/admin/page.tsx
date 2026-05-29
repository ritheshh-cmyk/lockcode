"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  verifyAdminPassword,
  fetchAllLicenses,
  createLicense,
  revokeLicense,
  resetLicense,
  deleteLicense,
  terminateLicense,
  updateLicense,
  updateLanguage,
  fetchPoolKeys,
  fetchFreePoolKeys,
  addPoolKeys,
  markPoolKeysUsed,
  setPoolKeyUsed,
  removePoolKey,
  clearPoolKeys,
  testAllPoolKeys,
  testPoolKeys,
  testSinglePoolKey,
  updatePoolKeyLabel,
  type License,
  type PoolKey,
} from "./actions";

// --------------------------------------------------------------------------------
// Admin Dashboard — Premium License Management
// --------------------------------------------------------------------------------

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword]           = useState("");
  const [authError, setAuthError]         = useState("");
  const [authLoading, setAuthLoading]     = useState(false);

  if (!authenticated) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center font-sans overflow-hidden relative">

        {/* Nebula background blobs */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-primary-container rounded-full mix-blend-screen opacity-5 portal-glow [animation:var(--animate-nebula)]" />
          <div className="absolute bottom-[20%] right-[30%] w-80 h-80 bg-secondary rounded-full mix-blend-screen opacity-5 portal-glow [animation:var(--animate-nebula)] [animation-delay:-10s]" />
        </div>

        {/* Main Container */}
        <main className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center [animation:var(--animate-entrance)]">

          {/* System Identifier */}
          <div className="text-center mb-16">
            <h1
              className="text-primary tracking-widest opacity-80 uppercase"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 18, letterSpacing: "0.3em", fontWeight: 500 }}
            >
              titan&nbsp; agent
            </h1>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mt-2 font-medium">
              Secure Access Gateway
            </p>
          </div>

          {/* Portal ring */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true);
              const ok = await verifyAdminPassword(password);
              setPassword(""); // always clear after attempt
              if (ok) { setAuthenticated(true); setAuthError(""); }
              else     { setAuthError("ACCESS DENIED"); }
              setAuthLoading(false);
            }}
          >
            <div className="relative w-80 h-80 flex items-center justify-center">

              {/* Outer rings */}
              <div className="absolute inset-0 border border-outline rounded-full portal-ring opacity-50 [animation:var(--animate-portal-pulse)]" />
              <div className="absolute inset-4 border border-outline-variant rounded-full opacity-30 [animation:var(--animate-portal-pulse)] [animation-delay:-2s]" />

              {/* Core card */}
              <div className="relative z-20 w-full max-w-[240px] flex flex-col items-center bg-surface-container/40 backdrop-blur-md p-8 rounded-full shadow-2xl border border-outline/50 aspect-square justify-center">
                <div className="w-full text-center space-y-6">

                  {/* Status indicator */}
                  <div className="flex items-center justify-center gap-2 text-on-surface-variant mb-4">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${authError ? "bg-error" : "bg-warning"} [animation:var(--animate-indicator)]`}
                    />
                    <span className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
                      {authError ? "rejected" : "password"}
                    </span>
                  </div>

                  {/* Password input */}
                  <div className="relative w-full">
                    <input
                      id="access_key"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="ACCESS_KEY"
                      className="w-full bg-transparent text-on-surface text-center placeholder-on-surface-variant/40 border-b border-outline outline-none focus:border-primary transition-all duration-150 py-3 tracking-widest px-2"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, letterSpacing: "0.08em" }}
                    />
                    {authError && (
                      <p className="text-error text-[10px] uppercase tracking-widest mt-2 text-center">
                        {authError}
                      </p>
                    )}
                  </div>

                  {/* Fingerprint submit button */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    title="Initialize Pulse"
                    className="w-12 h-12 rounded-full bg-surface-container-high border border-outline flex items-center justify-center mx-auto hover:border-primary hover:text-primary transition-all duration-150 group relative disabled:opacity-40 cursor-pointer"
                  >
                    <div className="absolute inset-0 rounded-full bg-primary-container opacity-0 group-hover:opacity-10 transition-opacity duration-150 blur-sm" />
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <span
                        className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors duration-150"
                        style={{ fontSize: 22, fontVariationSettings: '"FILL" 1' }}
                      >
                        fingerprint
                      </span>
                    )}
                  </button>

                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">
                    Initialize Pulse
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p
              className="text-on-surface-variant/40 tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10 }}
            >
              SYS.OP.v4.2.1 // DEEP.SPACE.NODE
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <Dashboard onLogout={() => setAuthenticated(false)} />;
}



type Page = "overview"|"keyvault"|"audit"|"api"|"support"|"security"|"apikeypool"|"docs";

function StatCard({label,value,delta,deltaLabel,color,icon,cls}:{label:string;value:number|string;delta:string;deltaLabel:string;color:"success"|"error"|"warning";icon:string;cls?:string}) {
  const c={success:{t:"text-success",b:"bg-success/10",bar:"bg-success"},error:{t:"text-error",b:"bg-error/10",bar:"bg-error"},warning:{t:"text-warning",b:"bg-warning/10",bar:"bg-warning"}}[color];
  return (
    <div className={`bg-surface-container border border-outline/20 p-5 rounded-xl relative overflow-hidden hover-lift cursor-default ${cls||""}`}>
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${c.bar}`}/>
      <div className="flex justify-between items-start">
        <div><p className="text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-widest">{label}</p>
          <h3 className="text-5xl font-light text-on-surface leading-tight">{value}</h3></div>
        <div className={`w-10 h-10 rounded-full ${c.b} flex items-center justify-center ${c.t}`}>
          <span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>{icon}</span></div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`${c.t} text-xs font-semibold`}>{delta}</span>
        <span className="text-on-surface-variant text-xs">{deltaLabel}</span>
      </div>
    </div>
  );
}

function NavLink({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 py-3 px-4 rounded-r-lg transition-all duration-200 text-left cursor-pointer ${
      active?"bg-secondary-container/20 text-primary border-r-4 border-primary font-semibold"
            :"text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-r-4 border-transparent"}`}>
      <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:active?"'FILL' 1":"'FILL' 0"}}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      {active&&<span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary nav-active-bar"/>}
    </button>
  );
}

function OverviewPage({licenses,loading,loadLicenses,onEdit,onRevoke,onTerminate,onReset,onDelete,actionLoading}:{
  licenses:License[];loading:boolean;loadLicenses:()=>Promise<void>;onEdit:(l:License)=>void;
  onRevoke:(id:string)=>void;onTerminate:(id:string)=>void;onReset:(id:string)=>void;onDelete:(id:string)=>void;actionLoading:string|null}) {
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState<"all"|"active"|"expired"|"revoked">("all");
  const [statFilter,setStatFilter]=useState<""|"active"|"expired"|"missing">("");
  const [currentPage,setCurrentPage]=useState(1);
  const [pageSize,setPageSize]=useState<number|"all">(10);
  const [copiedKey,setCopiedKey]=useState<string|null>(null);

  function getStatus(lic:License){
    if(!lic.is_active) return {label:"Revoked",cls:"bg-error/10 border-error/20 text-error",dot:"bg-error",key:"revoked"};
    if(new Date(lic.expires_at)<new Date()) return {label:"Expired",cls:"bg-warning/10 border-warning/20 text-warning",dot:"bg-warning",key:"expired"};
    return {label:"Active",cls:"bg-success/10 border-success/20 text-success",dot:"bg-success",key:"active"};
  }
  function timeAgo(d:string|null){if(!d)return"—";const ts=new Date(d).getTime();if(isNaN(ts))return"—";const h=Math.floor((Date.now()-ts)/3600000);return h<24?h+"h ago":Math.floor(h/24)+"d ago";}

  const active=licenses.filter(l=>l.is_active&&new Date(l.expires_at)>=new Date()).length;
  const expired=licenses.filter(l=>l.is_active&&new Date(l.expires_at)<new Date()).length;
  const missing=licenses.filter(l=>!l.gemini_key).length;

  const filtered=licenses.filter(lic=>{
    const s=getStatus(lic);
    if(statFilter==="active"&&s.key!=="active") return false;
    if(statFilter==="expired"&&s.key!=="expired") return false;
    if(statFilter==="missing"&&lic.gemini_key) return false;
    if(statusFilter!=="all"&&s.key!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return lic.reg_key.includes(q)||(lic.label||"").toLowerCase().includes(q)||(lic.machine_id||"").toLowerCase().includes(q)||(lic.language||"").toLowerCase().includes(q)||(lic.model||"").toLowerCase().includes(q);}
    return true;
  });
  const totalFiltered=filtered.length;
  const safePageSize=pageSize==="all"?Math.max(1,totalFiltered):pageSize as number;
  const totalPages=Math.max(1,Math.ceil(totalFiltered/safePageSize));
  const paginated=pageSize==="all"?filtered:filtered.slice((currentPage-1)*safePageSize,currentPage*safePageSize);

  useEffect(()=>{setCurrentPage(1);},[search,statusFilter,statFilter,pageSize]);

  function handleStatCardClick(key:"active"|"expired"|"missing"){
    setStatFilter(prev=>prev===key?"":key);
    setStatusFilter("all"); setSearch("");
  }
  function copyKey(k:string){navigator.clipboard.writeText(k);setCopiedKey(k);setTimeout(()=>setCopiedKey(null),1500);}
  function exportCSV(){
    const headers=["Key","Label","API Key","Machine ID","Model","Language","Status","Expires","Created"];
    const rows=filtered.map(lic=>[
      lic.reg_key,lic.label||"",lic.gemini_key||"",lic.machine_id||"",lic.model||"gemini",lic.language||"Java",
      getStatus(lic).label,new Date(lic.expires_at).toLocaleString(),lic.created_at?new Date(lic.created_at).toLocaleString():""
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    const csv=[headers.join(","),...rows].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`licenses_export_${Date.now()}.csv`;a.click();
    URL.revokeObjectURL(url);
  }

  const statCards=[
    {key:"active" as const,label:"Active Licenses",value:active,delta:"+12%",deltaLabel:"from last month",color:"success" as const,icon:"check_circle",glow:"34,197,94"},
    {key:"expired" as const,label:"Expired",value:expired,delta:`+${expired}`,deltaLabel:"requiring attention",color:"error" as const,icon:"running_with_errors",glow:"239,68,68"},
    {key:"missing" as const,label:"Missing Gemini Keys",value:missing,delta:"Critical",deltaLabel:"AI integrations paused",color:"warning" as const,icon:"warning",glow:"234,179,8"},
  ];

  return (
    <div className="page-enter">
      <div className="grid grid-cols-3 gap-2 mb-4 md:mb-6">
        {statCards.map((sc,i)=>{
          const isActive=statFilter===sc.key;
          const c={success:{t:"text-success",b:"bg-success/10",bar:"bg-success"},error:{t:"text-error",b:"bg-error/10",bar:"bg-error"},warning:{t:"text-warning",b:"bg-warning/10",bar:"bg-warning"}}[sc.color];
          return(
            <div key={sc.key} onClick={()=>handleStatCardClick(sc.key)}
              className={`bg-surface-container border rounded-xl relative overflow-hidden cursor-pointer transition-all duration-200 p-3 md:p-5 stagger-${i+1} ${isActive?`border-${sc.color==='success'?'success':sc.color==='error'?'error':'warning'}/50 shadow-lg`:"border-outline/20"}`}
              style={isActive?{boxShadow:`0 0 24px rgba(${sc.glow},0.18)`}:{}}>
              <div className={`absolute bottom-0 left-0 right-0 ${isActive?"h-[3px]":"h-[2px]"} ${c.bar} transition-all duration-200`}/>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-semibold text-on-surface-variant mb-0.5 sm:mb-1 uppercase tracking-widest leading-tight">{sc.label}</p>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-light text-on-surface leading-tight">{loading?"...":sc.value}</h3>
                </div>
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full ${c.b} flex items-center justify-center ${c.t} flex-shrink-0 ${isActive?"scale-110":""}`}>
                  <span className="material-symbols-outlined text-[16px] sm:text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>{sc.icon}</span>
                </div>
              </div>
              <div className="mt-2 md:mt-4 flex items-center gap-1 md:gap-2">
                <span className={`${c.t} text-[10px] sm:text-xs font-semibold`}>{sc.delta}</span>
                <span className="text-on-surface-variant text-[10px] sm:text-xs hidden sm:block">{sc.deltaLabel}</span>
                {isActive&&<span className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${c.b} ${c.t} border border-current/20`}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden shadow-2xl stagger-4">
        {/* Table toolbar */}
        <div className="p-3 md:p-5 border-b border-outline/20 bg-surface-container-low space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base md:text-xl font-semibold text-on-surface">Licensing Ledger</h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(statFilter||statusFilter!=="all"||search)&&(
                <button onClick={()=>{setStatFilter("");setStatusFilter("all");setSearch("");}}
                  className="flex items-center gap-1 px-2 py-1.5 border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[13px]">filter_alt_off</span><span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <button onClick={exportCSV}
                className="flex items-center gap-1 px-2 py-1.5 border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">download</span><span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[120px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[15px]">search</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                className="w-full bg-surface-container border border-outline/50 rounded-lg py-1.5 pl-8 pr-3 text-xs text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"/>
            </div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-surface-container border border-outline/50 rounded-lg py-1.5 px-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <select value={String(pageSize)} onChange={e=>setPageSize(e.target.value==="all"?"all":Number(e.target.value))}
              className="bg-surface-container border border-outline/50 rounded-lg py-1.5 px-2 text-xs text-on-surface focus:outline-none cursor-pointer">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">All</option>
            </select>
          </div>
          {statFilter&&<p className="text-xs text-on-surface-variant">Filtered: <span className="font-bold text-primary">{statFilter}</span> &mdash; {totalFiltered} result{totalFiltered!==1?"s":""}.</p>}
        </div>

        {/* Mobile card list (xs–sm) */}
        <div className="sm:hidden divide-y divide-outline/10">
          {loading?(
            <div className="py-12 flex items-center justify-center gap-2 text-on-surface-variant">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Loading...
            </div>
          ):paginated.length===0?(
            <p className="py-12 text-center text-on-surface-variant text-sm">{search||statusFilter!=="all"||statFilter?"No matches.":"No licenses yet."}</p>
          ):paginated.map((lic)=>{
            const s=getStatus(lic); const busy=actionLoading===lic.id;
            return (
              <div key={lic.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20 break-all">{lic.reg_key}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1 flex-shrink-0 ${s.cls}`}>
                    <span className={`w-1 h-1 rounded-full ${s.dot}`}/>{s.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div><span className="text-on-surface-variant">Label: </span><span className="text-on-surface font-medium">{lic.label||<span className="italic text-on-surface-variant/40">—</span>}</span></div>
                  <div><span className="text-on-surface-variant">Language: </span>
                    <select value={lic.language||"Java"} onChange={async e=>{await updateLanguage(lic.id,e.target.value); await loadLicenses();}} className="bg-transparent border-none text-on-surface focus:ring-0 cursor-pointer p-0 outline-none text-xs font-medium">
                      {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}
                    </select>
                  </div>
                  <div><span className="text-on-surface-variant">API Key: </span>
                    {lic.gemini_key
                      ?<span className="text-tertiary font-mono">{lic.gemini_key.slice(0,10)}…</span>
                      :<span className="text-warning">Not set</span>}
                  </div>
                  <div><span className="text-on-surface-variant">Created: </span><span className="text-on-surface">{timeAgo(lic.created_at||null)}</span></div>
                  {lic.machine_id&&<div className="col-span-2"><span className="text-on-surface-variant">Machine: </span><span className="font-mono text-on-surface">{lic.machine_id.slice(0,20)}…</span></div>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button disabled={busy} onClick={()=>onEdit(lic)} className="flex-1 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>Edit
                  </button>
                  {lic.is_active&&<button disabled={busy} onClick={()=>onRevoke(lic.id)} className="flex-1 py-2 text-xs font-semibold text-warning border border-warning/30 rounded-lg hover:bg-warning/10 transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">block</span>Revoke
                  </button>}
                  {lic.machine_id&&<button disabled={busy} onClick={()=>onReset(lic.id)} className="py-2 px-3 text-xs font-semibold text-tertiary border border-tertiary/30 rounded-lg hover:bg-tertiary/10 transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                  </button>}
                  <button disabled={busy} onClick={()=>onDelete(lic.id)} className="py-2 px-3 text-xs font-semibold text-error border border-error/30 rounded-lg hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-[680px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-high/50 text-on-surface-variant">
                <tr>{["Key","Label","API Key","Machine","Lang","Status","Created","Actions"].map(h=>(
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider${h==="Actions"?" text-right":""}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {loading?<tr><td colSpan={8} className="px-4 py-16 text-center text-on-surface-variant">
                  <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Loading...</div>
                </td></tr>
                :paginated.length===0?<tr><td colSpan={8} className="px-4 py-16 text-center text-on-surface-variant">{search||statusFilter!=="all"||statFilter?"No licenses match your filters.":"No licenses yet."}</td></tr>
                :paginated.map((lic,i)=>{const s=getStatus(lic);const busy=actionLoading===lic.id;return(
                  <tr key={lic.id} className="hover:bg-surface-container-high/30 transition-colors group" style={{animationDelay:`${i*0.03}s`}}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[12px] tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{lic.reg_key}</span>
                        <button onClick={()=>copyKey(lic.reg_key)} className="p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 cursor-pointer hover:scale-110 transition-all">
                          <span className="material-symbols-outlined text-[13px]" style={{fontVariationSettings:copiedKey===lic.reg_key?"'FILL' 1":"'FILL' 0",color:copiedKey===lic.reg_key?"var(--color-success)":undefined}}>{copiedKey===lic.reg_key?"check_circle":"content_copy"}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface font-medium text-sm max-w-[100px] truncate">{lic.label||<span className="text-on-surface-variant/40 italic text-xs">—</span>}</td>
                    <td className="px-4 py-3">{lic.gemini_key
                      ?<span className="font-mono text-[12px] text-tertiary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tertiary"/>{lic.gemini_key.slice(0,12)}…</span>
                      :<span className="font-mono text-[12px] text-warning flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>Not set</span>}</td>
                    <td className="px-4 py-3">{lic.machine_id?<span className="font-mono text-xs text-on-surface truncate max-w-[80px] block" title={lic.machine_id}>{lic.machine_id.slice(0,12)}…</span>:<span className="text-on-surface-variant/50 italic text-xs">Unbound</span>}</td>
                    <td className="px-4 py-3">
                      <select value={lic.language||"Java"} onChange={async e=>{await updateLanguage(lic.id,e.target.value); await loadLicenses();}} className="bg-transparent border-none text-xs text-on-surface-variant focus:ring-0 cursor-pointer hover:text-on-surface p-0 outline-none">
                        {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}</select>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1 w-fit ${s.cls}`}><span className={`w-1 h-1 rounded-full ${s.dot}`}/>{s.label}</span></td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs opacity-60">{timeAgo(lic.created_at||null)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                        <button disabled={busy} onClick={()=>onEdit(lic)} title="Edit" className="p-1.5 hover:text-primary transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        {lic.is_active&&<button disabled={busy} onClick={()=>onRevoke(lic.id)} title="Revoke" className="p-1.5 hover:text-warning transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">block</span></button>}
                        <button disabled={busy} onClick={()=>onTerminate(lic.id)} title="Terminate" className="p-1.5 hover:text-error transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">timer_off</span></button>
                        {lic.machine_id&&<button disabled={busy} onClick={()=>onReset(lic.id)} title="Reset" className="p-1.5 hover:text-tertiary transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">restart_alt</span></button>}
                        <button disabled={busy} onClick={()=>onDelete(lic.id)} title="Delete" className="p-1.5 hover:text-error transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </td>
                  </tr>);})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="p-3 md:p-4 border-t border-outline/10 flex flex-col sm:flex-row items-center justify-between gap-2 bg-surface-container-low text-on-surface-variant">
          <p className="text-xs font-medium">
            {pageSize==="all"
              ?`All ${totalFiltered} entries`
              :`${Math.min((currentPage-1)*safePageSize+1,totalFiltered)}–${Math.min(currentPage*safePageSize,totalFiltered)} of ${totalFiltered}`}
            {totalFiltered!==licenses.length&&` (filtered)`}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1||pageSize==="all"}
              className="p-2 border border-outline/30 rounded hover:bg-surface-variant disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            {pageSize!=="all"&&totalPages>1&&Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const pg=totalPages<=5?i+1:currentPage<=3?i+1:currentPage>=totalPages-2?totalPages-4+i:currentPage-2+i;
              return <button key={pg} onClick={()=>setCurrentPage(pg)}
                className={`w-7 h-7 text-xs rounded border transition-colors cursor-pointer ${pg===currentPage?"bg-primary text-on-primary border-primary":"border-outline/30 hover:bg-surface-variant"}`}>{pg}</button>;
            })}
            <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage>=totalPages||pageSize==="all"}
              className="p-2 border border-outline/30 rounded hover:bg-surface-variant disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyVaultPage({licenses,loading,onEdit,onRevoke,onTerminate,onReset,onDelete,actionLoading}:{
  licenses:License[];loading:boolean;onEdit:(l:License)=>void;onRevoke:(id:string)=>void;
  onTerminate:(id:string)=>void;onReset:(id:string)=>void;onDelete:(id:string)=>void;actionLoading:string|null}) {
  const [search,setSearch]=useState("");
  const [copiedKey,setCopiedKey]=useState<string|null>(null);
  const filtered=licenses.filter(l=>l.reg_key.includes(search)||(l.label||"").toLowerCase().includes(search.toLowerCase()));
  function statusColor(lic:License){
    if(!lic.is_active) return "border-error/30 text-error";
    if(new Date(lic.expires_at)<new Date()) return "border-warning/30 text-warning";
    return "border-success/30 text-success";
  }
  function statusLabel(lic:License){if(!lic.is_active)return"Revoked";if(new Date(lic.expires_at)<new Date())return"Expired";return"Active";}
  function copyKey(k:string){navigator.clipboard.writeText(k);setCopiedKey(k);setTimeout(()=>setCopiedKey(null),1500);}
  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 stagger-1">
        <h2 className="text-2xl font-bold text-on-surface">Key Vault</h2>
        <div className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search keys…"
            className="bg-surface-container border border-outline/50 rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors w-64"/></div>
      </div>
      {loading?<div className="flex items-center justify-center h-64 text-on-surface-variant gap-2">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Loading vault…</div>
      :<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length===0?<p className="col-span-3 text-center text-on-surface-variant py-16">No keys found.</p>
        :filtered.map((lic,i)=>(
          <div key={lic.id} className="bg-surface-container border border-outline/20 rounded-xl p-5 hover-lift flex flex-col gap-3" style={{animationDelay:`${i*0.04}s`}}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <span className={`font-mono text-[13px] tracking-wider px-2.5 py-1 rounded border bg-primary/10 text-primary border-primary/20 break-all`}>{lic.reg_key}</span>
                <button onClick={()=>copyKey(lic.reg_key)} className="p-1 text-on-surface-variant cursor-pointer hover:scale-110 transition-all">
                  <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:copiedKey===lic.reg_key?"'FILL' 1":"'FILL' 0",color:copiedKey===lic.reg_key?"var(--color-success)":undefined}}>{copiedKey===lic.reg_key?"check_circle":"content_copy"}</span>
                </button>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor(lic)}`}>{statusLabel(lic)}</span>
            </div>
            <p className="text-sm font-medium text-on-surface">{lic.label||<span className="text-on-surface-variant/40 italic text-xs">No label</span>}</p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">language</span>{lic.language||"Java"}
              <span className="ml-auto material-symbols-outlined text-[16px]">schedule</span>
              {new Date(lic.expires_at).toLocaleDateString()}</div>
            {lic.gemini_key?<div className="flex items-center gap-1.5 text-xs text-tertiary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"/>{lic.gemini_key.slice(0,16)}…</div>
            :<div className="flex items-center gap-1.5 text-xs text-warning">
              <span className="material-symbols-outlined text-[14px]">warning</span>No Gemini key</div>}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-outline/10">
              <button onClick={()=>onEdit(lic)} className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[15px]">edit</span>Edit</button>
              {lic.is_active&&<button onClick={()=>onRevoke(lic.id)} disabled={actionLoading===lic.id} className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[15px]">block</span>Revoke</button>}
              <button onClick={()=>onTerminate(lic.id)} disabled={actionLoading===lic.id} className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[15px]">timer_off</span>End</button>
              {lic.machine_id&&<button onClick={()=>onReset(lic.id)} disabled={actionLoading===lic.id} className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold text-tertiary hover:bg-tertiary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>Reset</button>}
              <button onClick={()=>onDelete(lic.id)} disabled={actionLoading===lic.id} className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[15px]">delete</span>Del</button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

function AuditLogsPage({licenses,loading}:{licenses:License[];loading:boolean}) {
  const events=licenses.flatMap(l=>[
    {time:l.created_at||"",action:"Key Created",key:l.reg_key,detail:l.label||"No label",icon:"add_circle",color:"text-success"},
    ...(l.machine_id?[{time:l.created_at||"",action:"Machine Locked",key:l.reg_key,detail:`MAC: ${l.machine_id.slice(0,12)}…`,icon:"lock",color:"text-primary"}]:[]),
    ...(!l.is_active?[{time:l.expires_at,action:"License Revoked",key:l.reg_key,detail:"Manually revoked",icon:"block",color:"text-error"}]:[]),
    ...(new Date(l.expires_at)<new Date()&&l.is_active?[{time:l.expires_at,action:"License Expired",key:l.reg_key,detail:"Trial period ended",icon:"schedule",color:"text-warning"}]:[]),
  ]).sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime()).slice(0,50);
  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 stagger-1">
        <h2 className="text-2xl font-bold text-on-surface">Audit Logs</h2>
        <span className="text-xs text-on-surface-variant">{events.length} recent events</span>
      </div>
      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden stagger-2">
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-high/50 text-on-surface-variant">
            <tr>{["Time","Action","License Key","Detail"].map(h=><th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-outline/10">
            {loading?<tr><td colSpan={4} className="px-5 py-12 text-center text-on-surface-variant">Loading logs…</td></tr>
            :events.length===0?<tr><td colSpan={4} className="px-5 py-12 text-center text-on-surface-variant">No events recorded.</td></tr>
            :events.map((ev,i)=>(
              <tr key={i} className="hover:bg-surface-container-high/30 transition-colors">
                <td className="px-5 py-3.5 text-xs text-on-surface-variant opacity-60 whitespace-nowrap">{new Date(ev.time).toLocaleString()}</td>
                <td className="px-5 py-3.5"><div className={`flex items-center gap-2 text-sm font-medium ${ev.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{ev.icon}</span>{ev.action}</div></td>
                <td className="px-5 py-3.5"><span className="font-mono text-[13px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{ev.key}</span></td>
                <td className="px-5 py-3.5 text-sm text-on-surface-variant">{ev.detail}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

function APIAccessPage() {
  const endpoints=[
    {method:"GET",path:"/api/licenses",desc:"Fetch all active licenses"},
    {method:"POST",path:"/api/licenses",desc:"Create a new license key"},
    {method:"PATCH",path:"/api/licenses/:id/revoke",desc:"Revoke a license by ID"},
    {method:"PATCH",path:"/api/licenses/:id/reset",desc:"Reset machine lock for a license"},
    {method:"DELETE",path:"/api/licenses/:id",desc:"Permanently delete a license"},
    {method:"POST",path:"/api/licenses/:id/rotate",desc:"Update Gemini API key for a license"},
  ];
  const mc={GET:"text-success bg-success/10 border-success/20",POST:"text-primary bg-primary/10 border-primary/20",PATCH:"text-warning bg-warning/10 border-warning/20",DELETE:"text-error bg-error/10 border-error/20"};
  return (
    <div className="page-enter">
      <div className="mb-6 stagger-1">
        <h2 className="text-2xl font-bold text-on-surface mb-1">API Access</h2>
        <p className="text-sm text-on-surface-variant">Supabase REST endpoints powering the TITAN license system.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-2">
        {[{label:"Base URL",value:"supabase.co/rest/v1",icon:"dns"},{label:"Auth",value:"Service Role Key",icon:"vpn_key"},{label:"Status",value:"Operational",icon:"check_circle"}].map(item=>(
          <div key={item.label} className="bg-surface-container border border-outline/20 rounded-xl p-5 hover-lift">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider">{item.label}</span></div>
            <p className="font-mono text-sm text-primary">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden stagger-3">
        <div className="p-5 border-b border-outline/20 bg-surface-container-low"><h3 className="text-base font-bold text-on-surface">Endpoints</h3></div>
        <div className="divide-y divide-outline/10">
          {endpoints.map((ep,i)=>(
            <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-high/30 transition-colors">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border w-16 text-center ${mc[ep.method as keyof typeof mc]}`}>{ep.method}</span>
              <code className="font-mono text-sm text-on-surface flex-1">{ep.path}</code>
              <span className="text-xs text-on-surface-variant hidden md:block">{ep.desc}</span>
              <button onClick={()=>navigator.clipboard.writeText(ep.path)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">content_copy</span></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportPage() {
  const [open,setOpen]=useState<number|null>(0);
  const faqs=[
    {q:"How do I create a license?",a:"Click the 'Add Key' button in the top header. Enter an 8-digit registration key, optional label, Gemini API key, target language, and trial duration. The key is immediately active upon creation."},
    {q:"What happens when a license expires?",a:"The TITAN client will block access and prompt the user to re-activate. The license remains in your ledger and can be viewed in Key Vault or Audit Logs."},
    {q:"How does machine locking work?",a:"On first activation, the user's MAC address is bound to the license. Subsequent activations on a different machine are rejected. Use 'Reset Machine' in the actions menu to unlock."},
    {q:"Can I change the Gemini API key?",a:"Yes — click the edit (pencil) icon next to any license in the Overview table. The new key is delivered to the client on next activation via encrypted stdin pipe."},
    {q:"What does 'Revoke' do?",a:"Revoke sets is_active=false in the database. The TITAN client will fail license verification on its next check. This action cannot be undone — you must delete and recreate the key."},
    {q:"How is the key delivered securely?",a:"Keys are never written to disk. The launcher pipes them via stdin directly into TITAN's process memory, which is wiped on emergency exit (Alt+T) using ctypes zero-fill."},
  ];
  return (
    <div className="page-enter">
      <div className="mb-6 stagger-1"><h2 className="text-2xl font-bold text-on-surface mb-1">Support & FAQ</h2>
        <p className="text-sm text-on-surface-variant">Common questions about the TITAN license management system.</p></div>
      <div className="space-y-3 stagger-2">
        {faqs.map((faq,i)=>(
          <div key={i} className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden hover-lift">
            <button onClick={()=>setOpen(open===i?null:i)} className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-surface-container-high/30 transition-colors">
              <span className="font-semibold text-sm text-on-surface">{faq.q}</span>
              <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${open===i?"rotate-180":""}`}>expand_more</span>
            </button>
            {open===i&&<div className="px-6 pb-5 text-sm text-on-surface-variant leading-relaxed border-t border-outline/10 pt-4">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityPage() {
  const checks=[
    {label:"Stdin-only key delivery",desc:"API keys piped via stdin, never written to disk",ok:true},
    {label:"RAM wipe on exit",desc:"Alt+T overwrites credential globals before os._exit()",ok:true},
    {label:"Watchdog restart",desc:"Launcher auto-restarts TITAN on crash, re-pipes keys",ok:true},
    {label:"Capture exclusion",desc:"HUD excluded from screen capture via WDA_EXCLUDEFROMCAPTURE",ok:true},
    {label:"Machine binding",desc:"MAC address locked per license on first activation",ok:true},
    {label:"No INI files",desc:"Language/keys stored in memory only, not gemini.ini at runtime",ok:true},
    {label:"win32gui only",desc:"No UIAutomation — uses Win32 API only to avoid anti-cheat detection",ok:true},
  ];
  return (
    <div className="page-enter">
      <div className="mb-6 stagger-1"><h2 className="text-2xl font-bold text-on-surface mb-1">Security Posture</h2>
        <p className="text-sm text-on-surface-variant">TITAN hardening checklist — all mitigations applied in the current build.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-2">
        {checks.map((c,i)=>(
          <div key={i} className="bg-surface-container border border-outline/20 rounded-xl p-5 hover-lift flex items-start gap-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.ok?"bg-success/10 text-success":"bg-error/10 text-error"}`}>
              <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>{c.ok?"verified":"cancel"}</span></div>
            <div><p className="text-sm font-semibold text-on-surface">{c.label}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{c.desc}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-surface-container border border-outline/20 rounded-xl p-6 stagger-3">
        <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">shield</span>Admin Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">Auth Method</p><p className="text-on-surface font-mono">8-digit PIN + Supabase RPC</p></div>
          <div><p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">Session</p><p className="text-on-surface font-mono">3-hour memory cache</p></div>
          <div><p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">Transport</p><p className="text-on-surface font-mono">HTTPS / TLS 1.3</p></div>
          <div><p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">Data at rest</p><p className="text-on-surface font-mono">Supabase RLS + AES-256</p></div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>("overview");
  const [showModal, setShowModal] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<License | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{message:string;type:"success"|"error"}|null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try { setLicenses(await fetchAllLicenses()); }
    catch { showToast("Failed to load","error"); }
    setLoading(false);
  }, []);
  useEffect(() => { loadLicenses(); }, [loadLicenses]);

  function showToast(message:string, type:"success"|"error") {
    setToast({message,type}); setTimeout(()=>setToast(null),3500);
  }
  async function handleRevoke(id:string) {
    setActionLoading(id);
    try { await revokeLicense(id); showToast("License revoked","success"); await loadLicenses(); }
    catch { showToast("Revoke failed","error"); }
    setActionLoading(null);
  }
  async function handleTerminate(id:string) {
    if (!window.confirm("Terminate this license immediately? This expires and revokes it right now.")) return;
    setActionLoading(id);
    try { await terminateLicense(id); showToast("License terminated","success"); await loadLicenses(); }
    catch { showToast("Terminate failed","error"); }
    setActionLoading(null);
  }
  async function handleReset(id:string) {
    setActionLoading(id);
    try { await resetLicense(id); showToast("Machine reset","success"); await loadLicenses(); }
    catch { showToast("Reset failed","error"); }
    setActionLoading(null);
  }
  async function handleDelete(id:string) {
    setActionLoading(id);
    try { await deleteLicense(id); showToast("Deleted","success"); await loadLicenses(); }
    catch { showToast("Delete failed","error"); }
    setActionLoading(null);
  }

  const nav: {id:Page;icon:string;label:string}[] = [
    {id:"overview",icon:"dashboard",label:"Overview"},
    {id:"keyvault",icon:"vpn_key",label:"Key Vault"},
    {id:"apikeypool",icon:"dataset",label:"API Key Pool"},
    {id:"audit",icon:"history",label:"Audit Logs"},
    {id:"api",icon:"api",label:"API Access"},
    {id:"support",icon:"help_outline",label:"Support"},
    {id:"docs",icon:"schema",label:"Ecosystem"},
  ];

  function navigate(p:Page) {
    if (p === "docs") { router.push("/docs"); return; }
    setPage(p);
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      {toast&&(
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-xl [animation:var(--animate-fade-in)] ${
          toast.type==="success"?"bg-success/10 border-success/20 text-success":"bg-error/10 border-error/20 text-error"}`}>
          {toast.message}
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center px-3 md:px-6 py-3 w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline/30 shadow-sm gap-2 md:gap-3">
        {/* Mobile hamburger */}
        <button onClick={()=>setMobileNavOpen(o=>!o)} className="lg:hidden p-2 text-on-surface-variant hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex-shrink-0">
          <span className="material-symbols-outlined">{mobileNavOpen?"close":"menu"}</span>
        </button>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-primary to-secondary-container rounded-lg flex items-center justify-center" style={{boxShadow:"0 0 15px rgba(181,196,255,0.3)"}}>
            <span className="material-symbols-outlined text-on-primary text-[18px] md:text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>lock</span>
          </div>
          <h1 className="text-sm md:text-lg font-bold text-primary tracking-tight">TITAN</h1>
        </div>
        {/* Current page breadcrumb on mobile */}
        <span className="lg:hidden text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-semibold ml-1 truncate min-w-0 flex-shrink">{page}</span>
        <div className="flex-1"/>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={()=>setShowModal(true)} className="bg-primary text-on-primary px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-bold flex items-center gap-1 md:gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0" style={{boxShadow:"0 0 20px rgba(181,196,255,0.2)"}}>
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">add</span><span className="hidden sm:inline">Add Key</span>
          </button>
        </div>
      </header>

      {/* Mobile slide-in nav drawer */}
      {mobileNavOpen&&(
        <div className="lg:hidden fixed inset-0 z-40" onClick={()=>setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline/20 flex flex-col pt-[57px] pb-24 z-50" onClick={e=>e.stopPropagation()}>
            <div className="px-4 py-4 mb-2">
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline/10">
                <div className="w-9 h-9 rounded-lg bg-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>admin_panel_settings</span>
                </div>
                <div><p className="text-xs font-bold text-on-surface leading-none">Admin Console</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">TITAN v4 Stable</p></div>
              </div>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {[...nav,{id:"security" as Page,icon:"shield",label:"Security"}].map(n=>(
                <NavLink key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={()=>{navigate(n.id);setMobileNavOpen(false);}}/>
              ))}
            </nav>
            <div className="px-2 border-t border-outline/10 pt-3">
              <button onClick={()=>{onLogout();setMobileNavOpen(false);}} className="w-full flex items-center gap-3 py-3 px-4 text-error/80 hover:bg-error-container/10 transition-colors rounded-r-lg cursor-pointer border-r-4 border-transparent">
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-[57px] h-[calc(100vh-57px)] flex-col pb-4 z-40 bg-surface-container-lowest border-r border-outline/20 w-56 xl:w-64 hidden lg:flex overflow-y-auto">
          <div className="px-3 xl:px-4 py-4 xl:py-6 mb-1">
            <div className="flex items-center gap-2 xl:gap-3 p-2.5 xl:p-3 bg-surface-container-low rounded-xl border border-outline/10">
              <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg bg-surface-variant flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>admin_panel_settings</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-surface leading-none truncate">Admin Console</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">TITAN v4 — Stable</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {nav.map(n=><NavLink key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={()=>navigate(n.id)}/>)}
          </nav>
          <div className="px-2 space-y-0.5 border-t border-outline/10 pt-3 mt-3">
            <NavLink icon="shield" label="Security" active={page==="security"} onClick={()=>navigate("security")}/>
            <button onClick={onLogout} className="w-full flex items-center gap-3 py-2.5 px-4 text-error/80 hover:bg-error-container/10 transition-colors rounded-r-lg cursor-pointer border-r-4 border-transparent">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-xs font-semibold uppercase tracking-wider">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full lg:ml-56 xl:ml-64 min-w-0 p-3 sm:p-4 md:p-6 pt-4 md:pt-6 pb-24 lg:pb-6">
          {page==="overview"&&<OverviewPage licenses={licenses} loading={loading} loadLicenses={loadLicenses} onEdit={setRotateTarget} onRevoke={handleRevoke} onTerminate={handleTerminate} onReset={handleReset} onDelete={handleDelete} actionLoading={actionLoading}/>}
          {page==="keyvault"&&<KeyVaultPage licenses={licenses} loading={loading} onEdit={setRotateTarget} onRevoke={handleRevoke} onTerminate={handleTerminate} onReset={handleReset} onDelete={handleDelete} actionLoading={actionLoading}/>}
          {page==="apikeypool"&&<APIKeyPoolPage/>}
          {page==="audit"&&<AuditLogsPage licenses={licenses} loading={loading}/>}
          {page==="api"&&<APIAccessPage/>}
          {page==="support"&&<SupportPage/>}
          {page==="security"&&<SecurityPage/>}
        </main>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline/20 flex items-center justify-around px-1 py-1">
        {[
          {id:"overview" as Page,icon:"dashboard",label:"Overview"},
          {id:"keyvault" as Page,icon:"vpn_key",label:"Vault"},
          {id:"audit" as Page,icon:"history",label:"Audit"},
          {id:"apikeypool" as Page,icon:"dataset",label:"Pool"},
          {id:"security" as Page,icon:"shield",label:"Security"},
        ].map(n=>(
          <button key={n.id} onClick={()=>navigate(n.id)} className={`flex flex-col items-center gap-0.5 py-1.5 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer flex-1 max-w-[72px] ${
            page===n.id?"text-primary bg-primary/10":"text-on-surface-variant"}`}>
            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:page===n.id?"'FILL' 1":"'FILL' 0"}}>{n.icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{n.label}</span>
          </button>
        ))}
      </nav>

      {showModal&&<AddKeyModal onClose={()=>setShowModal(false)} onCreated={()=>{setShowModal(false);showToast("License created!","success");loadLicenses();}}/>}
      {rotateTarget&&<EditKeyModal license={rotateTarget} onClose={()=>setRotateTarget(null)} onSaved={()=>{setRotateTarget(null);showToast("License updated!","success");loadLicenses();}}/>}
    </div>
  );
}

// --- Add Key Modal ---
function AddKeyModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) {
  const [regKey,setRegKey]=useState(""); const [label,setLabel]=useState("");
  const [geminiKey,setGeminiKey]=useState(""); const [language,setLanguage]=useState("Java");
  const [model,setModel]=useState("gemini");
  const [trialDays,setTrialDays]=useState(0); const [trialHours,setTrialHours]=useState(0);
  const [creating,setCreating]=useState(false); const [createdKey,setCreatedKey]=useState(""); const [error,setError]=useState("");
  const [autoAssigned,setAutoAssigned]=useState<PoolKey[]>([]);
  const [allPoolKeys,setAllPoolKeys]=useState<PoolKey[]>([]);
  const [showPoolPicker,setShowPoolPicker]=useState(false);
  const [loadingPool,setLoadingPool]=useState(true);

  useEffect(()=>{
    // On mount: fetch up to 3 free keys and pre-fill the geminiKey field
    setLoadingPool(true);
    Promise.all([
      fetchFreePoolKeys(3),
      fetchPoolKeys()
    ]).then(([freeKeys, poolKeys])=>{
      if (freeKeys.length > 0) {
        setAutoAssigned(freeKeys);
        setGeminiKey(freeKeys.map(k => k.key).join(","));
      }
      setAllPoolKeys(poolKeys);
    }).catch(()=>{}).finally(()=>setLoadingPool(false));
  },[]);

  const inp="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors text-sm";
  async function handleCreate() {
    if (regKey.length!==8){setError("Key must be exactly 8 digits");return;}
    if (trialDays<=0&&trialHours<=0){setError("Set at least 1 day or 1 hour");return;}
    setCreating(true);setError("");
    try{
      const r=await createLicense(regKey,label,trialDays,trialHours,geminiKey,language,model);
      // Mark selected pool keys as used — combine autoAssigned and allPoolKeys to support manual search
      const currentKeys = new Set(geminiKey.split(",").map(k => k.trim()).filter(Boolean));
      const combinedPool = [...autoAssigned, ...allPoolKeys];
      const uniqueKeysMap = new Map<string, string>(); // key -> id
      combinedPool.forEach(k => { uniqueKeysMap.set(k.key, k.id); });
      const assignedIds: string[] = [];
      currentKeys.forEach(kStr => {
        const id = uniqueKeysMap.get(kStr);
        if (id) { assignedIds.push(id); }
      });
      if (assignedIds.length > 0) { await markPoolKeysUsed(assignedIds); }
      setCreatedKey(r.reg_key);
    }
    catch(e){setError(e instanceof Error?e.message:"Failed to create");}
    setCreating(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="bg-surface-container-low border border-outline/30 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 w-full sm:max-w-md shadow-2xl page-enter max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        {!createdKey?(
          <>
            <h2 className="text-lg font-bold mb-1 text-on-surface">Add License Key</h2>
            <p className="text-on-surface-variant text-sm mb-5">Create a new hardware-locked license</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Registration Key (8 digits)</label>
                <input type="text" value={regKey} onChange={e=>setRegKey(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="12345678" maxLength={8} autoFocus
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-primary placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 text-center font-mono text-lg tracking-[0.3em]"/>
                <p className="text-xs text-on-surface-variant/40 mt-1 text-center">{regKey.length}/8</p>
              </div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Customer Label</label><input type="text" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. John Doe" className={inp}/></div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Provider API Key</label>
                {/* Auto-assigned pool keys badge */}
                {loadingPool ? (
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
                    <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>
                    <span>Fetching keys from pool…</span>
                  </div>
                ) : autoAssigned.length > 0 ? (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-success/5 border border-success/20 rounded-lg">
                    <span className="material-symbols-outlined text-success text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                    <span className="text-xs text-success font-semibold">
                      {autoAssigned.length} key{autoAssigned.length > 1 ? "s" : ""} auto-assigned from pool
                      {autoAssigned.length < 3 && <span className="font-normal text-success/70"> (only {autoAssigned.length} available)</span>}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-warning/5 border border-warning/20 rounded-lg">
                    <span className="material-symbols-outlined text-warning text-[16px]">warning</span>
                    <span className="text-xs text-warning">No free keys in pool — enter manually or add keys to pool first</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIza...,AIza...,AIza... (comma-separated or one key)" rows={2}
                    className="flex-1 px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-tertiary placeholder-on-surface-variant/40 focus:outline-none focus:border-tertiary/40 text-sm font-mono resize-none"/>
                  <button type="button" onClick={()=>setShowPoolPicker(p=>!p)} title="Assign from Pool"
                    className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 self-start ${showPoolPicker?"bg-primary/10 text-primary border-primary/40":"bg-surface-container border-outline/50 text-on-surface-variant hover:text-primary hover:border-primary/50"}`}>
                    <span className="material-symbols-outlined text-[17px]">dataset</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant/50 mt-1">
                  {geminiKey.split(",").filter(k=>k.trim()).length} key{geminiKey.split(",").filter(k=>k.trim()).length!==1?"s":""} assigned. Supports up to 3 comma-separated keys for automatic rotation.
                </p>
                {showPoolPicker&&(
                  <div className="mt-2 bg-surface-container-low border border-outline/30 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {allPoolKeys.filter(k=>!k.used).length===0
                      ?<p className="text-xs text-on-surface-variant p-3 text-center italic">No available keys in pool.</p>
                      :allPoolKeys.filter(k=>!k.used).map(k=>(
                        <button key={k.id} type="button" onClick={()=>{
                          const existing = geminiKey.split(",").map(s=>s.trim()).filter(Boolean);
                          if (!existing.includes(k.key) && existing.length < 3) {
                            setGeminiKey([...existing, k.key].join(","));
                          } else if (existing.includes(k.key)) {
                            // Already included — do nothing
                          } else {
                            existing[existing.length-1] = k.key;
                            setGeminiKey(existing.join(","));
                          }
                          setShowPoolPicker(false);
                        }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors cursor-pointer text-left">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            k.status==="active"?"bg-success":k.status==="rate_limited"?"bg-warning":"bg-outline"
                          }`}/>
                          <span className="font-mono text-xs text-tertiary flex-1 truncate">{k.key.slice(0,24)}&hellip;</span>
                          {k.label&&<span className="text-[10px] text-on-surface-variant">{k.label}</span>}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Model</label>
                <select value={model} onChange={e=>setModel(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
                  <option value="gemini" className="bg-surface">Gemini (gemini-2.5-flash)</option>
                  <option value="meta/llama-3.3-70b-instruct" className="bg-surface">Llama 3.3 70B — Fast ~2s (NIM)</option>
                </select></div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Language</label>
                <select value={language} onChange={e=>setLanguage(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
                  {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Duration</label>
                <div className="flex gap-3">
                  <div className="flex-1"><input type="number" value={trialDays} onChange={e=>setTrialDays(Number(e.target.value))} min={0} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Days</p></div>
                  <div className="flex-1"><input type="number" value={trialHours} onChange={e=>setTrialHours(Number(e.target.value))} min={0} max={23} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Hours</p></div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={()=>{setTrialDays(1); setTrialHours(0);}} className="flex-1 py-1.5 bg-surface-container border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all cursor-pointer">1-Day Trial</button>
                  <button type="button" onClick={()=>{setTrialDays(2); setTrialHours(0);}} className="flex-1 py-1.5 bg-surface-container border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all cursor-pointer">2-Day Trial</button>
                </div>
              </div>
              {error&&<p className="text-error text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline/50 rounded-lg text-sm text-on-surface-variant transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={creating||regKey.length!==8} className="flex-1 py-2.5 bg-primary text-on-primary hover:brightness-110 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40">
                {creating?"Creating...":"Add Key"}</button>
            </div>
          </>
        ):(
          <div className="text-center py-2 page-enter">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-success text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span></div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Key Created</h2>
            <p className="text-on-surface-variant text-sm mb-5">Share this key with the customer</p>
            <div className="flex items-center gap-2 bg-surface-container border border-outline/50 rounded-xl px-4 py-3 mb-5">
              <code className="flex-1 text-primary text-center font-mono text-lg tracking-[0.3em]">{createdKey}</code>
              <button onClick={()=>navigator.clipboard.writeText(createdKey)} className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer">Copy</button>
            </div>
            <button onClick={onCreated} className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline/50 rounded-lg text-sm text-on-surface-variant transition-colors cursor-pointer">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Edit Key Modal ---
function EditKeyModal({license,onClose,onSaved}:{license:License;onClose:()=>void;onSaved:()=>void}) {
  const [newLabel,setNewLabel]=useState(license.label||"");
  const [newGemini,setNewGemini]=useState(license.gemini_key||"");
  const [newModel,setNewModel]=useState(license.model||"gemini");
  const [newLanguage,setNewLanguage]=useState(license.language||"Java");
  const [addDays,setAddDays]=useState(0);
  const [addHours,setAddHours]=useState(0);
  const [deductDays,setDeductDays]=useState(0);
  const [deductHours,setDeductHours]=useState(0);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [editPoolKeys,setEditPoolKeys]=useState<PoolKey[]>([]);
  const [showEditPool,setShowEditPool]=useState(false);
  useEffect(()=>{fetchPoolKeys().then(setEditPoolKeys).catch(()=>{});},[]);
  
  const inp="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors text-sm";
  
  async function handleSave(){
    setSaving(true);setError("");
    try{
      await updateLicense(license.id,newLabel,newGemini,newLanguage,addDays,addHours,deductDays,deductHours,newModel);
      onSaved();
    }catch(e){setError(e instanceof Error?e.message:"Failed");}
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="bg-surface-container-low border border-outline/30 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 w-full sm:max-w-md shadow-2xl page-enter max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1 text-on-surface">Edit License</h2>
        <p className="text-on-surface-variant text-sm mb-5">
          <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{license.reg_key}</code>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Customer Label</label>
            <input type="text" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="e.g. John Doe" className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Provider API Key</label>
            <div className="flex gap-2">
              {/* Multi-key textarea for edit — supports comma-separated */}
              <textarea value={newGemini} onChange={e=>setNewGemini(e.target.value)} placeholder="AIza...,AIza...,AIza... (comma-separated)"
                rows={2}
                className="flex-1 px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-tertiary placeholder-on-surface-variant/40 focus:outline-none focus:border-tertiary/40 text-sm font-mono resize-none"/>
              <button type="button" onClick={()=>setShowEditPool(p=>!p)} title="Assign from Pool"
                className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 self-start ${showEditPool?"bg-primary/10 text-primary border-primary/40":"bg-surface-container border-outline/50 text-on-surface-variant hover:text-primary hover:border-primary/50"}`}>
                <span className="material-symbols-outlined text-[17px]">dataset</span>
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant/50 mt-1">
              {newGemini.split(",").filter(k=>k.trim()).length} key{newGemini.split(",").filter(k=>k.trim()).length!==1?"s":""} assigned.
            </p>
            {showEditPool&&(
              <div className="mt-2 bg-surface-container-low border border-outline/30 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {editPoolKeys.filter(k=>!k.used).length===0
                  ?<p className="text-xs text-on-surface-variant p-3 text-center italic">No available keys in pool.</p>
                  :editPoolKeys.filter(k=>!k.used).map(k=>(
                    <button key={k.id} type="button" onClick={()=>{
                      // Append key to existing multi-key string (up to 3 total)
                      const existing = newGemini.split(",").map(s=>s.trim()).filter(Boolean);
                      if (!existing.includes(k.key) && existing.length < 3) {
                        setNewGemini([...existing, k.key].join(","));
                      } else if (existing.includes(k.key)) {
                        // Already included — do nothing
                      } else {
                        // Already at 3 — replace last
                        existing[existing.length-1] = k.key;
                        setNewGemini(existing.join(","));
                      }
                      setShowEditPool(false);
                    }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors cursor-pointer text-left">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        k.status==="active"?"bg-success":k.status==="rate_limited"?"bg-warning":"bg-outline"
                      }`}/>
                      <span className="font-mono text-xs text-tertiary flex-1 truncate">{k.key.slice(0,24)}&hellip;</span>
                      {k.label&&<span className="text-[10px] text-on-surface-variant">{k.label}</span>}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Model</label>
            <select value={newModel} onChange={e=>setNewModel(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
              <option value="gemini" className="bg-surface">Gemini (gemini-2.5-flash)</option>
              <option value="meta/llama-3.3-70b-instruct" className="bg-surface">Llama 3.3 70B — Fast ~2s (NIM)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Language</label>
            <select value={newLanguage} onChange={e=>setNewLanguage(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
              {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Add Duration (Extend Trial)</label>
            <div className="flex gap-3">
              <div className="flex-1"><input type="number" value={addDays} onChange={e=>setAddDays(Number(e.target.value))} min={0} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Days</p></div>
              <div className="flex-1"><input type="number" value={addHours} onChange={e=>setAddHours(Number(e.target.value))} min={0} max={23} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Hours</p></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-error mb-1.5 uppercase tracking-wider">Deduct Time (Shorten Expiry)</label>
            <div className="flex gap-3">
              <div className="flex-1"><input type="number" value={deductDays} onChange={e=>setDeductDays(Number(e.target.value))} min={0} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Days</p></div>
              <div className="flex-1"><input type="number" value={deductHours} onChange={e=>setDeductHours(Number(e.target.value))} min={0} max={23} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Hours</p></div>
            </div>
          </div>
          {error&&<p className="text-error text-sm mt-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline/50 rounded-lg text-sm text-on-surface-variant transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-tertiary text-on-tertiary hover:brightness-110 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50">
            {saving?"Saving...":"Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}


// --- API Key Pool Page ---

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "Never";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins>1?"s":""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours>1?"s":""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays>1?"s":""} ago`;
}

function APIKeyPoolPage() {
  const [keys, setKeys] = useState<PoolKey[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState("");
  const [poolLabel, setPoolLabel] = useState("");
  const [poolToast, setPoolToast] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSingle, setTestingSingle] = useState<Record<string, boolean>>({});
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const loadKeys = useCallback(async () => {
    setPoolLoading(true);
    try { setKeys(await fetchPoolKeys()); } catch { showMsg("Failed to load pool"); }
    setPoolLoading(false);
  }, []);
  useEffect(() => { loadKeys(); }, [loadKeys]);

  function showMsg(msg: string) { setPoolToast(msg); setTimeout(() => setPoolToast(""), 3000); }

  async function handleTestAll() {
    if (!keys.length) { showMsg("No keys in pool to test"); return; }
    
    const oneHour = 60 * 60 * 1000;
    const toTestIds = keys.filter(k => !k.last_checked_at || (Date.now() - new Date(k.last_checked_at).getTime() > oneHour)).map(k => k.id);
    
    if (toTestIds.length === 0) {
      showMsg("All keys tested under 1 hour ago. Tick boxes and click 'Test Selected' to force test.");
      return;
    }

    setTesting(true);
    showMsg(`Testing ${toTestIds.length} key${toTestIds.length > 1 ? "s" : ""}… ${keys.length - toTestIds.length > 0 ? `(Skipped ${keys.length - toTestIds.length} recent)` : ""}`);
    try {
      const results = await testPoolKeys(toTestIds);
      await loadKeys();
      setSelectedKeys(new Set()); // clear selection after test
      const active = results.filter(r => r.status === "active").length;
      const limited = results.filter(r => r.status === "rate_limited").length;
      const invalid = results.filter(r => r.status === "invalid" || r.status === "error").length;
      showMsg(`✅ ${active} active  🟡 ${limited} limited  ❌ ${invalid} invalid`);
    } catch { showMsg("Test failed — check console"); }
    setTesting(false);
  }

  async function handleTestSelected() {
    if (selectedKeys.size === 0) return;
    setTesting(true);
    showMsg(`Force testing ${selectedKeys.size} key${selectedKeys.size > 1 ? "s" : ""}…`);
    try {
      const results = await testPoolKeys(Array.from(selectedKeys));
      await loadKeys();
      setSelectedKeys(new Set()); // clear selection after test
      const active = results.filter(r => r.status === "active").length;
      const limited = results.filter(r => r.status === "rate_limited").length;
      const invalid = results.filter(r => r.status === "invalid" || r.status === "error").length;
      showMsg(`✅ ${active} active  🟡 ${limited} limited  ❌ ${invalid} invalid`);
    } catch { showMsg("Test failed — check console"); }
    setTesting(false);
  }

  async function handleTestSingle(id: string) {
    const keyData = keys.find(k => k.id === id);
    if (keyData?.last_checked_at) {
      const diffMs = Date.now() - new Date(keyData.last_checked_at).getTime();
      if (diffMs < 60 * 60 * 1000) {
        showMsg("Tested under 1 hour ago. Tick the box and click 'Test Selected' to force test.");
        return;
      }
    }

    setTestingSingle(p => ({ ...p, [id]: true }));
    try {
      const res = await testSinglePoolKey(id);
      await loadKeys();
      if (res.success) showMsg("✅ Key is active!");
      else if (res.status === "rate_limited") showMsg("🟡 Quota exceeded");
      else showMsg(`❌ Test failed: ${res.status}`);
    } catch {
      showMsg("❌ Test failed");
      await loadKeys();
    }
    setTestingSingle(p => ({ ...p, [id]: false }));
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedKeys);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedKeys(next);
  }

  function toggleAllSelection() {
    if (selectedKeys.size === keys.length && keys.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(keys.map(k => k.id)));
    }
  }

  async function handleSaveLabel(id: string) {
    if (editingLabelId === id) {
      try {
        await updatePoolKeyLabel(id, editLabelValue);
        await loadKeys();
        showMsg("Label updated");
      } catch {
        showMsg("Failed to update label");
      }
      setEditingLabelId(null);
    }
  }

  async function handleAdd() {
    const lines = bulkInput.split(/[\n,;]+/).map(s=>s.trim()).filter(s=>s.startsWith("AIza") && s.length > 20);
    if (!lines.length) { showMsg("No valid Gemini keys found (must start with AIza)"); return; }
    setSaving(true);
    try {
      const added = await addPoolKeys(lines, poolLabel || undefined);
      setBulkInput(""); setPoolLabel("");
      showMsg(added > 0 ? `Added ${added} key${added>1?"s":""}` : "All keys already in pool");
      await loadKeys();
    } catch(e:unknown) { showMsg(e instanceof Error ? e.message : "Failed to add keys"); }
    setSaving(false);
  }

  async function toggleUsed(id:string, current:boolean) {
    try { await setPoolKeyUsed(id, !current); await loadKeys(); } catch { showMsg("Failed to update"); }
  }
  async function handleRemoveKey(id:string) {
    try { await removePoolKey(id); await loadKeys(); } catch { showMsg("Failed to remove"); }
  }
  function copyKey(key:string) { navigator.clipboard.writeText(key); showMsg("Copied!"); }

  const available = keys.filter(k=>!k.used).length;
  const usedCount = keys.filter(k=>k.used).length;

  return (
    <div className="page-enter">
      {poolToast&&<div className="fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-xl bg-success/10 border-success/20 text-success [animation:var(--animate-fade-in)]">{poolToast}</div>}
      {/* Header */}
      <div className="mb-4 md:mb-6 stagger-1">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-on-surface">API Key Pool</h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">Bulk-store Gemini API keys for rapid assignment</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline/20 rounded-xl">
              <span className="text-success text-xs font-bold">{available}</span>
              <span className="text-on-surface-variant text-xs">avail</span>
              <span className="text-outline-variant mx-0.5">&middot;</span>
              <span className="text-on-surface-variant text-xs">{usedCount} used</span>
            </div>
            {/* Test All Keys button */}
            <button onClick={handleTestAll} disabled={testing || keys.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/10 border border-tertiary/30 text-tertiary rounded-lg text-xs font-bold hover:bg-tertiary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {testing
                ? <><div className="w-3.5 h-3.5 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin"/>Testing…</>
                : <><span className="material-symbols-outlined text-[16px]">network_check</span>Test Unchecked</>}
            </button>
            {selectedKeys.size > 0 && (
              <button onClick={handleTestSelected} disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary border border-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {testing
                  ? <><div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"/>Testing…</>
                  : <><span className="material-symbols-outlined text-[16px]">rule_folder</span>Test Selected ({selectedKeys.size})</>}
              </button>
            )}
            {keys.length>0&&(confirmClear
              ?<div className="flex gap-2">
                 <button onClick={async()=>{try{await clearPoolKeys();await loadKeys();setConfirmClear(false);showMsg("Pool cleared");}catch{showMsg("Failed to clear");}}} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold cursor-pointer hover:brightness-110">Confirm</button>
                 <button onClick={()=>setConfirmClear(false)} className="px-3 py-1.5 border border-outline/30 rounded-lg text-xs text-on-surface-variant cursor-pointer">Cancel</button>
               </div>
              :<button onClick={()=>setConfirmClear(true)} className="px-3 py-1.5 border border-error/30 text-error rounded-lg text-xs font-semibold hover:bg-error/10 transition-colors cursor-pointer">Clear All</button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline/20 rounded-xl p-6 mb-6 stagger-2">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>Add Keys to Pool
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">API Keys (one per line, comma or semicolon separated)</label>
            <textarea value={bulkInput} onChange={e=>setBulkInput(e.target.value)} rows={5}
              placeholder={"AIzaSyAbc123...\nAIzaSyDef456...\nAIzaSyGhi789..."}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline/50 rounded-lg text-tertiary placeholder-on-surface-variant/30 focus:outline-none focus:border-tertiary/40 text-sm font-mono resize-none"/>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Optional Batch Label</label>
              <input value={poolLabel} onChange={e=>setPoolLabel(e.target.value)} placeholder="e.g. Batch-May-2026"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline/50 rounded-lg text-on-surface placeholder-on-surface-variant/30 focus:outline-none focus:border-primary/40 text-sm"/>
            </div>
            <button onClick={handleAdd} disabled={saving} className="mt-auto py-3 bg-primary text-on-primary rounded-lg text-sm font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50" style={{boxShadow:"0 0 20px rgba(181,196,255,0.2)"}}>
              <span className="material-symbols-outlined text-[18px]">upload</span>{saving?"Adding...":"Add to Pool"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden stagger-3">
        <div className="p-4 md:p-5 border-b border-outline/20 bg-surface-container-low flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={keys.length > 0 && selectedKeys.size === keys.length} onChange={toggleAllSelection} className="w-4 h-4 rounded bg-surface-container border-outline/50 text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
            <h3 className="text-base font-bold text-on-surface">Stored Keys ({keys.length})</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"/>Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning"/>Limited</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error"/>Invalid</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-outline"/>Unchecked</span>
          </div>
        </div>
        {poolLoading?(
          <div className="py-20 text-center text-on-surface-variant flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/><span>Loading from Supabase...</span>
          </div>
        ):keys.length===0?(
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-3 block text-outline-variant">key_off</span>
            <p className="text-sm">No keys in pool. Paste keys above to get started.</p>
          </div>
        ):(
          <div>
            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-outline/10">
              {keys.map((k) => {
                const health = k.status ?? null;
                const hCfg = health === "active"
                  ? { dot: "bg-success", cls: "text-success bg-success/10 border-success/20", label: "Active" }
                  : health === "rate_limited"
                  ? { dot: "bg-warning", cls: "text-warning bg-warning/10 border-warning/20", label: "Limited" }
                  : health === "invalid" || health === "error"
                  ? { dot: "bg-error", cls: "text-error bg-error/10 border-error/20", label: health === "invalid" ? "Invalid" : "Error" }
                  : { dot: "bg-outline", cls: "text-on-surface-variant bg-surface-variant border-outline/30", label: "Unchecked" };

                return (
                  <div key={k.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedKeys.has(k.id)} onChange={() => toggleSelection(k.id)} className="w-4 h-4 rounded bg-surface-container border-outline/50 text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                        <div className="font-mono text-sm text-tertiary break-all">{k.key.slice(0, 24)}…</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copyKey(k.key)} className="p-1.5 hover:text-primary transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
                        <button onClick={() => handleRemoveKey(k.id)} className="p-1.5 text-error transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${hCfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hCfg.dot} ${health === "active" ? "animate-pulse" : ""}`} />
                        {hCfg.label}
                      </span>
                      <button onClick={() => toggleUsed(k.id, k.used)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border cursor-pointer ${k.used ? "bg-outline/10 border-outline/30 text-on-surface-variant" : "bg-primary/10 border-primary/20 text-primary"}`}>
                        {k.used ? "Assigned" : "Free"}
                      </button>
                    </div>
                    {k.error_message && <p className="text-xs text-error/80 line-clamp-2">{k.error_message}</p>}
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline/10">
                      {editingLabelId === k.id ? (
                        <div className="flex gap-1 w-full">
                          <input autoFocus value={editLabelValue} onChange={e => setEditLabelValue(e.target.value)} onBlur={() => handleSaveLabel(k.id)} onKeyDown={e => e.key === "Enter" && handleSaveLabel(k.id)} className="flex-1 bg-background border border-primary/30 rounded px-2 py-1 text-xs text-on-surface focus:outline-none" />
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center w-full cursor-pointer group" onClick={() => { setEditingLabelId(k.id); setEditLabelValue(k.label || ""); }}>
                          <span className="text-sm text-on-surface-variant truncate flex-1">{k.label || <span className="italic opacity-40 text-xs">No label</span>}</span>
                          <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-on-surface-variant opacity-80 font-medium">
                        Last tested: <span className="opacity-70">{formatRelativeTime(k.last_checked_at)}</span>
                      </span>
                      <button onClick={() => handleTestSingle(k.id)} disabled={testingSingle[k.id]} className="px-3 py-1.5 bg-surface-container-highest border border-outline/20 text-on-surface rounded-lg text-xs font-semibold cursor-pointer hover:bg-surface-variant transition-colors disabled:opacity-50">
                        {testingSingle[k.id] ? "Testing…" : "Test Key"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-surface-container-high/50 text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 w-[40px]"><input type="checkbox" checked={keys.length > 0 && selectedKeys.size === keys.length} onChange={toggleAllSelection} className="w-4 h-4 rounded bg-surface-container border-outline/50 text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" /></th>
                    {["Health", "Assign", "API Key", "Label", "Checked", ""].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider${i === 5 ? " text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/10">
                  {keys.map((k) => {
                    const health = k.status ?? null;
                    const hCfg = health === "active"
                      ? { dot: "bg-success", cls: "text-success bg-success/10 border-success/20", label: "Active" }
                      : health === "rate_limited"
                      ? { dot: "bg-warning", cls: "text-warning bg-warning/10 border-warning/20", label: "Limited" }
                      : health === "invalid" || health === "error"
                      ? { dot: "bg-error", cls: "text-error bg-error/10 border-error/20", label: health === "invalid" ? "Invalid" : "Error" }
                      : { dot: "bg-outline", cls: "text-on-surface-variant bg-surface-variant border-outline/30", label: "Unchecked" };
                    return (
                      <tr key={k.id} className="hover:bg-surface-container-high/30 transition-colors group">
                        <td className="px-4 py-3"><input type="checkbox" checked={selectedKeys.has(k.id)} onChange={() => toggleSelection(k.id)} className="w-4 h-4 rounded bg-surface-container border-outline/50 text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" /></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 w-fit ${hCfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${hCfg.dot} ${health === "active" ? "animate-pulse" : ""}`} />
                            {hCfg.label}
                          </span>
                          {k.error_message && <p className="text-[10px] text-error/70 mt-0.5 max-w-[100px] truncate" title={k.error_message}>{k.error_message}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleUsed(k.id, k.used)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${k.used ? "bg-outline/10 border-outline/30 text-on-surface-variant" : "bg-primary/10 border-primary/20 text-primary"}`}>
                            {k.used ? "Assigned" : "Free"}
                          </button>
                        </td>
                        <td className="px-4 py-3"><span className="font-mono text-sm text-tertiary">{k.key.slice(0, 18)}…</span></td>
                        <td className="px-4 py-3">
                          {editingLabelId === k.id ? (
                            <input autoFocus value={editLabelValue} onChange={e => setEditLabelValue(e.target.value)} onBlur={() => handleSaveLabel(k.id)} onKeyDown={e => e.key === "Enter" && handleSaveLabel(k.id)} className="w-full bg-surface-container-low border border-primary/30 rounded px-2 py-1 text-xs text-on-surface focus:outline-none" />
                          ) : (
                            <div className="flex items-center gap-2 cursor-pointer group/label" onClick={() => { setEditingLabelId(k.id); setEditLabelValue(k.label || ""); }}>
                              <span className="text-sm text-on-surface-variant max-w-[120px] truncate">{k.label || <span className="italic opacity-40 text-xs">-</span>}</span>
                              <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/label:opacity-100 transition-opacity">edit</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">
                          <span className="opacity-80 font-medium">Last tested: </span><span className="opacity-60">{formatRelativeTime(k.last_checked_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-40 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleTestSingle(k.id)} disabled={testingSingle[k.id]} className="px-2 py-1 text-[11px] font-semibold bg-surface-container-highest border border-outline/20 rounded cursor-pointer hover:bg-surface-variant disabled:opacity-50">
                              {testingSingle[k.id] ? "Testing…" : "Test"}
                            </button>
                            <button onClick={() => copyKey(k.key)} title="Copy" className="p-1.5 hover:text-primary transition-colors cursor-pointer"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                            <button onClick={() => handleRemoveKey(k.id)} title="Remove" className="p-1.5 hover:text-error transition-colors cursor-pointer"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
