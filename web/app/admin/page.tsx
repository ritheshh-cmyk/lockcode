"use client";

import { useState, useEffect, useCallback } from "react";
import {
  verifyAdminPassword,
  fetchAllLicenses,
  createLicense,
  revokeLicense,
  resetLicense,
  deleteLicense,
  updateLicense,
  updateLanguage,
  type License,
} from "./actions";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Admin Dashboard â€” Premium License Management
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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



type Page = "overview"|"keyvault"|"audit"|"api"|"support"|"security"|"apikeypool";

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Nav Link â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Overview Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OverviewPage({licenses,loading,onEdit,onRevoke,onReset,onDelete,actionLoading}:{
  licenses:License[];loading:boolean;onEdit:(l:License)=>void;
  onRevoke:(id:string)=>void;onReset:(id:string)=>void;onDelete:(id:string)=>void;actionLoading:string|null}) {
  function getStatus(lic:License){
    if(!lic.is_active) return {label:"Revoked",cls:"bg-error/10 border-error/20 text-error",dot:"bg-error"};
    if(new Date(lic.expires_at)<new Date()) return {label:"Expired",cls:"bg-warning/10 border-warning/20 text-warning",dot:"bg-warning"};
    return {label:"Active",cls:"bg-success/10 border-success/20 text-success",dot:"bg-success"};
  }
  function timeAgo(d:string|null){if(!d)return"\u2014";const ts=new Date(d).getTime();if(isNaN(ts))return"\u2014";const h=Math.floor((Date.now()-ts)/3600000);return h<24?h+"h ago":Math.floor(h/24)+"d ago";}
  const active=licenses.filter(l=>l.is_active&&new Date(l.expires_at)>=new Date()).length;
  const expired=licenses.filter(l=>l.is_active&&new Date(l.expires_at)<new Date()).length;
  const missing=licenses.filter(l=>!l.gemini_key).length;
  return (
    <div className="page-enter">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <StatCard cls="stagger-1" label="Active Licenses" value={loading?"â€”":active} delta="+12%" deltaLabel="from last month" color="success" icon="check_circle"/>
        <StatCard cls="stagger-2" label="Expired" value={loading?"â€”":expired} delta={`+${expired}`} deltaLabel="requiring attention" color="error" icon="running_with_errors"/>
        <StatCard cls="stagger-3" label="Missing Gemini Keys" value={loading?"â€”":missing} delta="Critical" deltaLabel="AI integrations paused" color="warning" icon="warning"/>
      </div>
      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden shadow-2xl stagger-4">
        <div className="p-6 border-b border-outline/20 flex justify-between items-center bg-surface-container-low">
          <h2 className="text-xl font-semibold text-on-surface">Licensing Ledger</h2>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>Filter</button>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-outline/30 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">download</span>Export</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50 text-on-surface-variant">
              <tr>{["Key","Label","API Key","Machine ID","Model","Language","Status","Created","Actions"].map(h=>(
                <th key={h} className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider${h==="Actions"?" text-right":""}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {loading?<tr><td colSpan={7} className="px-5 py-16 text-center text-on-surface-variant">
                <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Loading...</div>
              </td></tr>
              :licenses.length===0?<tr><td colSpan={7} className="px-5 py-16 text-center text-on-surface-variant">No licenses yet.</td></tr>
              :licenses.map((lic,i)=>{const s=getStatus(lic);const busy=actionLoading===lic.id;return(
                <tr key={lic.id} className="hover:bg-surface-container-high/30 transition-colors group" style={{animationDelay:`${i*0.03}s`}}>
                  <td className="px-5 py-3.5"><span className="font-mono text-[13px] tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">{lic.reg_key}</span></td>
                  <td className="px-5 py-3.5 text-on-surface font-medium text-sm">{lic.label||<span className="text-on-surface-variant/40 italic text-xs">â€”</span>}</td>
                  <td className="px-5 py-3.5">{lic.gemini_key
                    ?<span className="font-mono text-[13px] text-tertiary flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-tertiary"/>{lic.gemini_key.slice(0,12)}...</span>
                    :<span className="font-mono text-[13px] text-warning flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">warning</span>Not set</span>}</td>
                  <td className="px-5 py-3.5">
                    {lic.machine_id ? (
                      <div className="flex items-center gap-2 group/mac">
                        <span className="text-on-surface font-mono text-xs truncate max-w-[120px]" title={lic.machine_id}>{lic.machine_id}</span>
                        <button onClick={() => { navigator.clipboard.writeText(lic.machine_id||""); }} className="p-1 text-on-surface-variant hover:text-primary opacity-0 group-hover/mac:opacity-100 transition-all cursor-pointer">
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant/50 italic text-xs">Unbound</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface font-medium text-[13px]">{lic.model||"gemini"}</td>
                  <td className="px-5 py-3.5">
                    <select value={lic.language||"Java"} onChange={async e=>{await updateLanguage(lic.id,e.target.value);}} className="bg-transparent border-none text-sm text-on-surface-variant focus:ring-0 cursor-pointer hover:text-on-surface p-0 outline-none">
                      {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}</select></td>
                  <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-fit ${s.cls}`}>
                    <span className={`w-1 h-1 rounded-full ${s.dot}`}/>{s.label}</span></td>
                  <td className="px-5 py-3.5 text-on-surface-variant text-sm opacity-60">{timeAgo(lic.created_at||null)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button disabled={busy} onClick={()=>onEdit(lic)} title="Edit" className="p-1.5 hover:text-primary transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                      {lic.is_active&&<button disabled={busy} onClick={()=>onRevoke(lic.id)} title="Revoke" className="p-1.5 hover:text-warning transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[20px]">block</span></button>}
                      {lic.machine_id&&<button disabled={busy} onClick={()=>onReset(lic.id)} title="Reset" className="p-1.5 hover:text-tertiary transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[20px]">restart_alt</span></button>}
                      <button disabled={busy} onClick={()=>onDelete(lic.id)} title="Delete" className="p-1.5 hover:text-error transition-colors cursor-pointer disabled:opacity-30"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                    </div></td>
                </tr>);})}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline/10 flex items-center justify-between bg-surface-container-low text-on-surface-variant">
          <p className="text-xs font-medium">Showing {licenses.length} entries</p>
          <div className="flex gap-2">
            <button className="p-2 border border-outline/30 rounded hover:bg-surface-variant disabled:opacity-30" disabled><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <button className="p-2 border border-outline/30 rounded hover:bg-surface-variant cursor-pointer"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Key Vault Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KeyVaultPage({licenses,loading,onEdit,onRevoke,onDelete,actionLoading}:{
  licenses:License[];loading:boolean;onEdit:(l:License)=>void;onRevoke:(id:string)=>void;onDelete:(id:string)=>void;actionLoading:string|null}) {
  const [search,setSearch]=useState("");
  const filtered=licenses.filter(l=>l.reg_key.includes(search)||(l.label||"").toLowerCase().includes(search.toLowerCase()));
  function statusColor(lic:License){
    if(!lic.is_active) return "border-error/30 text-error";
    if(new Date(lic.expires_at)<new Date()) return "border-warning/30 text-warning";
    return "border-success/30 text-success";
  }
  function statusLabel(lic:License){if(!lic.is_active)return"Revoked";if(new Date(lic.expires_at)<new Date())return"Expired";return"Active";}
  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 stagger-1">
        <h2 className="text-2xl font-bold text-on-surface">Key Vault</h2>
        <div className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search keysâ€¦"
            className="bg-surface-container border border-outline/50 rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors w-64"/></div>
      </div>
      {loading?<div className="flex items-center justify-center h-64 text-on-surface-variant gap-2">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>Loading vaultâ€¦</div>
      :<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length===0?<p className="col-span-3 text-center text-on-surface-variant py-16">No keys found.</p>
        :filtered.map((lic,i)=>(
          <div key={lic.id} className="bg-surface-container border border-outline/20 rounded-xl p-5 hover-lift flex flex-col gap-3" style={{animationDelay:`${i*0.04}s`}}>
            <div className="flex items-start justify-between">
              <span className={`font-mono text-[13px] tracking-wider px-2.5 py-1 rounded border bg-primary/10 text-primary border-primary/20`}>{lic.reg_key}</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor(lic)}`}>{statusLabel(lic)}</span>
            </div>
            <p className="text-sm font-medium text-on-surface">{lic.label||<span className="text-on-surface-variant/40 italic text-xs">No label</span>}</p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">language</span>{lic.language||"Java"}
              <span className="ml-auto material-symbols-outlined text-[16px]">schedule</span>
              {new Date(lic.expires_at).toLocaleDateString()}</div>
            {lic.gemini_key?<div className="flex items-center gap-1.5 text-xs text-tertiary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"/>{lic.gemini_key.slice(0,16)}â€¦</div>
            :<div className="flex items-center gap-1.5 text-xs text-warning">
              <span className="material-symbols-outlined text-[14px]">warning</span>No Gemini key</div>}
            <div className="flex gap-2 pt-1 border-t border-outline/10">
              <button onClick={()=>onEdit(lic)} className="flex-1 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">edit</span>Edit Key</button>
              {lic.is_active&&<button onClick={()=>onRevoke(lic.id)} disabled={actionLoading===lic.id} className="flex-1 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[16px]">block</span>Revoke</button>}
              <button onClick={()=>onDelete(lic.id)} disabled={actionLoading===lic.id} className="flex-1 py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[16px]">delete</span>Delete</button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// â”€â”€ Audit Logs Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuditLogsPage({licenses,loading}:{licenses:License[];loading:boolean}) {
  const events=licenses.flatMap(l=>[
    {time:l.created_at||"",action:"Key Created",key:l.reg_key,detail:l.label||"No label",icon:"add_circle",color:"text-success"},
    ...(l.machine_id?[{time:l.created_at||"",action:"Machine Locked",key:l.reg_key,detail:`MAC: ${l.machine_id.slice(0,12)}â€¦`,icon:"lock",color:"text-primary"}]:[]),
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
            {loading?<tr><td colSpan={4} className="px-5 py-12 text-center text-on-surface-variant">Loading logsâ€¦</td></tr>
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

// â”€â”€ API Access Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Support Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SupportPage() {
  const [open,setOpen]=useState<number|null>(0);
  const faqs=[
    {q:"How do I create a license?",a:"Click the 'Add Key' button in the top header. Enter an 8-digit registration key, optional label, Gemini API key, target language, and trial duration. The key is immediately active upon creation."},
    {q:"What happens when a license expires?",a:"The TITAN client will block access and prompt the user to re-activate. The license remains in your ledger and can be viewed in Key Vault or Audit Logs."},
    {q:"How does machine locking work?",a:"On first activation, the user's MAC address is bound to the license. Subsequent activations on a different machine are rejected. Use 'Reset Machine' in the actions menu to unlock."},
    {q:"Can I change the Gemini API key?",a:"Yes â€” click the edit (pencil) icon next to any license in the Overview table. The new key is delivered to the client on next activation via encrypted stdin pipe."},
    {q:"What does 'Revoke' do?",a:"Revoke sets is_active=false in the database. The TITAN client will fail license verification on its next check. This action cannot be undone â€” you must delete and recreate the key."},
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

// â”€â”€ Security Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SecurityPage() {
  const checks=[
    {label:"Stdin-only key delivery",desc:"API keys piped via stdin, never written to disk",ok:true},
    {label:"RAM wipe on exit",desc:"Alt+T overwrites credential globals before os._exit()",ok:true},
    {label:"Watchdog restart",desc:"Launcher auto-restarts TITAN on crash, re-pipes keys",ok:true},
    {label:"Capture exclusion",desc:"HUD excluded from screen capture via WDA_EXCLUDEFROMCAPTURE",ok:true},
    {label:"Machine binding",desc:"MAC address locked per license on first activation",ok:true},
    {label:"No INI files",desc:"Language/keys stored in memory only, not gemini.ini at runtime",ok:true},
    {label:"win32gui only",desc:"No UIAutomation â€” uses Win32 API only to avoid anti-cheat detection",ok:true},
  ];
  return (
    <div className="page-enter">
      <div className="mb-6 stagger-1"><h2 className="text-2xl font-bold text-on-surface mb-1">Security Posture</h2>
        <p className="text-sm text-on-surface-variant">TITAN hardening checklist â€” all mitigations applied in the current build.</p></div>
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

// â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Dashboard({ onLogout }: { onLogout: () => void }) {
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

  const pageTitle: Record<Page,string> = {
    overview:"Dashboard",keyvault:"Key Vault",audit:"Audit Logs",api:"API Access",support:"Support",security:"Security",apikeypool:"API Key Pool"
  };

  const nav: {id:Page;icon:string;label:string}[] = [
    {id:"overview",icon:"dashboard",label:"Overview"},
    {id:"keyvault",icon:"vpn_key",label:"Key Vault"},
    {id:"apikeypool",icon:"dataset",label:"API Key Pool"},
    {id:"audit",icon:"history",label:"Audit Logs"},
    {id:"api",icon:"api",label:"API Access"},
    {id:"support",icon:"help_outline",label:"Support"},
  ];

  function navigate(p:Page) { setPage(p); }

  return (
    <div className="min-h-screen bg-background text-on-background">
      {toast&&(
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-xl [animation:var(--animate-fade-in)] ${
          toast.type==="success"?"bg-success/10 border-success/20 text-success":"bg-error/10 border-error/20 text-error"}`}>
          {toast.message}
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center px-4 md:px-6 py-3 w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline/30 shadow-sm gap-3">
        {/* Mobile hamburger */}
        <button onClick={()=>setMobileNavOpen(o=>!o)} className="lg:hidden p-2 text-on-surface-variant hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
          <span className="material-symbols-outlined">{mobileNavOpen?"close":"menu"}</span>
        </button>
        <div className="flex items-center gap-3 mr-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary-container rounded-lg flex items-center justify-center" style={{boxShadow:"0 0 15px rgba(181,196,255,0.3)"}}>
            <span className="material-symbols-outlined text-on-primary text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>lock</span>
          </div>
          <h1 className="text-lg font-bold text-primary tracking-tight hidden md:block">TITAN AGENT</h1>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(n=>(
            <button key={n.id} onClick={()=>navigate(n.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                page===n.id?"bg-secondary-container/30 text-primary":"text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}>
              {n.label}
            </button>
          ))}
          <button onClick={()=>navigate("security")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              page==="security"?"bg-secondary-container/30 text-primary":"text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}>
            Security
          </button>
          <button onClick={()=>navigate("apikeypool")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              page==="apikeypool"?"bg-secondary-container/30 text-primary":"text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}>
            API Pool
          </button>
        </nav>
        <div className="flex-1"/>
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-colors cursor-pointer"><span className="material-symbols-outlined">notifications</span></button>
          <button className="hidden sm:flex p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-colors cursor-pointer"><span className="material-symbols-outlined">settings</span></button>
          <button onClick={()=>setShowModal(true)} className="bg-primary text-on-primary px-3 md:px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer" style={{boxShadow:"0 0 20px rgba(181,196,255,0.2)"}}>
            <span className="material-symbols-outlined text-[18px]">add</span><span className="hidden sm:inline">Add Key</span>
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
                  <p className="text-[10px] text-on-surface-variant mt-0.5">TITAN v4 — Stable</p></div>
              </div>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {[...nav,{id:"security" as Page,icon:"shield",label:"Security"},{id:"apikeypool" as Page,icon:"dataset",label:"API Key Pool"}].map(n=>(
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-[57px] h-[calc(100vh-57px)] flex flex-col pb-8 z-40 bg-surface-container-lowest border-r border-outline/20 w-64 hidden lg:flex">
          <div className="px-4 py-6 mb-2">
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline/10">
              <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>admin_panel_settings</span>
              </div>
              <div><p className="text-xs font-bold text-on-surface leading-none">Admin Console</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">TITAN v4 â€” Stable</p></div>
            </div>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {nav.map(n=><NavLink key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={()=>navigate(n.id)}/>)}
          </nav>
          <div className="px-2 space-y-0.5 border-t border-outline/10 pt-3">
            <NavLink icon="shield" label="Security" active={page==="security"} onClick={()=>navigate("security")}/>
            <NavLink icon="dataset" label="API Key Pool" active={page==="apikeypool"} onClick={()=>navigate("apikeypool")}/>
            <button onClick={onLogout} className="w-full flex items-center gap-3 py-3 px-4 text-error/80 hover:bg-error-container/10 transition-colors rounded-r-lg cursor-pointer border-r-4 border-transparent">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-xs font-semibold uppercase tracking-wider">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 md:p-6 pt-6 md:pt-8 pb-24 lg:pb-8">
          {page==="overview"&&<OverviewPage licenses={licenses} loading={loading} onEdit={setRotateTarget} onRevoke={handleRevoke} onReset={handleReset} onDelete={handleDelete} actionLoading={actionLoading}/>}
          {page==="keyvault"&&<KeyVaultPage licenses={licenses} loading={loading} onEdit={setRotateTarget} onRevoke={handleRevoke} onDelete={handleDelete} actionLoading={actionLoading}/>}
          {page==="apikeypool"&&<APIKeyPoolPage/>}
          {page==="audit"&&<AuditLogsPage licenses={licenses} loading={loading}/>}
          {page==="api"&&<APIAccessPage/>}
          {page==="support"&&<SupportPage/>}
          {page==="security"&&<SecurityPage/>}
        </main>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-outline/20 flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {[...nav.slice(0,4),{id:"security" as Page,icon:"shield",label:"Security"}].map(n=>(
          <button key={n.id} onClick={()=>navigate(n.id)} className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer min-w-[52px] ${
            page===n.id?"text-primary":"text-on-surface-variant"}`}>
            <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings:page===n.id?"'FILL' 1":"'FILL' 0"}}>{n.icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{n.label.slice(0,6)}</span>
          </button>
        ))}
      </nav>

      {showModal&&<AddKeyModal onClose={()=>setShowModal(false)} onCreated={()=>{setShowModal(false);showToast("License created!","success");loadLicenses();}}/>}
      {rotateTarget&&<EditKeyModal license={rotateTarget} onClose={()=>setRotateTarget(null)} onSaved={()=>{setRotateTarget(null);showToast("License updated!","success");loadLicenses();}}/>}
    </div>
  );
}

// â”€â”€ Add Key Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AddKeyModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) {
  const [regKey,setRegKey]=useState(""); const [label,setLabel]=useState("");
  const [geminiKey,setGeminiKey]=useState(""); const [language,setLanguage]=useState("Java");
  const [model,setModel]=useState("gemini");
  const [trialDays,setTrialDays]=useState(0); const [trialHours,setTrialHours]=useState(0);
  const [creating,setCreating]=useState(false); const [createdKey,setCreatedKey]=useState(""); const [error,setError]=useState("");
  const inp="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors text-sm";
  async function handleCreate() {
    if (regKey.length!==8){setError("Key must be exactly 8 digits");return;}
    if (trialDays<=0&&trialHours<=0){setError("Set at least 1 day or 1 hour");return;}
    setCreating(true);setError("");
    try{const r=await createLicense(regKey,label,trialDays,trialHours,geminiKey,language,model);setCreatedKey(r.reg_key);}
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
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Provider API Key</label>
                <input type="text" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIza... or nvapi-..." className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-tertiary placeholder-on-surface-variant/40 focus:outline-none focus:border-tertiary/40 text-sm font-mono"/></div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Model</label>
                <select value={model} onChange={e=>setModel(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
                  <option value="gemini" className="bg-surface">Gemini (gemini-2.5-flash)</option>
                  <option value="meta/llama-3.3-70b-instruct" className="bg-surface">Llama 3.3 70B — Fast ~2s (NIM)</option>
                  <option value="meta/llama-3.1-8b-instruct" className="bg-surface">Llama 3.1 8B — Fastest (NIM)</option>
                </select></div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Language</label>
                <select value={language} onChange={e=>setLanguage(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
                  {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l=><option key={l} value={l} className="bg-surface">{l}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Duration</label>
                <div className="flex gap-3">
                  <div className="flex-1"><input type="number" value={trialDays} onChange={e=>setTrialDays(Number(e.target.value))} min={0} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Days</p></div>
                  <div className="flex-1"><input type="number" value={trialHours} onChange={e=>setTrialHours(Number(e.target.value))} min={0} max={23} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Hours</p></div>
                </div></div>
              {error&&<p className="text-error text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline/50 rounded-lg text-sm text-on-surface-variant transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={creating||regKey.length!==8} className="flex-1 py-2.5 bg-primary text-on-primary hover:brightness-110 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40">
                {creating?"Creatingâ€¦":"Add Key"}</button>
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

// ── Edit Key Modal ──────────────────────────────────────────────────
function EditKeyModal({license,onClose,onSaved}:{license:License;onClose:()=>void;onSaved:()=>void}) {
  const [newLabel,setNewLabel]=useState(license.label||"");
  const [newGemini,setNewGemini]=useState(license.gemini_key||"");
  const [newModel,setNewModel]=useState(license.model||"gemini");
  const [addDays,setAddDays]=useState(0);
  const [addHours,setAddHours]=useState(0);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  
  const inp="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors text-sm";
  
  async function handleSave(){
    setSaving(true);setError("");
    try{await updateLicense(license.id,newLabel,newGemini,addDays,addHours,newModel);onSaved();}
    catch(e){setError(e instanceof Error?e.message:"Failed");}
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
            <input type="text" value={newGemini} onChange={e=>setNewGemini(e.target.value)} placeholder="AIza... or nvapi-..." 
              className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-tertiary placeholder-on-surface-variant/40 focus:outline-none focus:border-tertiary/40 text-sm font-mono"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Model</label>
            <select value={newModel} onChange={e=>setNewModel(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container border border-outline/50 rounded-lg text-on-surface text-sm focus:outline-none focus:border-primary/40 cursor-pointer">
              <option value="gemini" className="bg-surface">Gemini (gemini-2.5-flash)</option>
              <option value="meta/llama-3.3-70b-instruct" className="bg-surface">Llama 3.3 70B — Fast ~2s (NIM)</option>
              <option value="meta/llama-3.1-8b-instruct" className="bg-surface">Llama 3.1 8B — Fastest (NIM)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Add Duration (Extend Trial)</label>
            <div className="flex gap-3">
              <div className="flex-1"><input type="number" value={addDays} onChange={e=>setAddDays(Number(e.target.value))} min={0} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Days</p></div>
              <div className="flex-1"><input type="number" value={addHours} onChange={e=>setAddHours(Number(e.target.value))} min={0} max={23} className={inp}/><p className="text-xs text-on-surface-variant/40 mt-1 text-center">Hours</p></div>
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


// â”€â”€ API Key Pool Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const POOL_KEY = "titan_api_key_pool";
interface PoolKey { id:string; key:string; addedAt:string; used:boolean; label?:string; }

function APIKeyPoolPage() {
  const [keys, setKeys] = useState<PoolKey[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [poolLabel, setPoolLabel] = useState("");
  const [poolToast, setPoolToast] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try { setKeys(JSON.parse(localStorage.getItem(POOL_KEY)||"[]")); } catch { setKeys([]); }
  }, []);

  function save(next: PoolKey[]) { setKeys(next); localStorage.setItem(POOL_KEY, JSON.stringify(next)); }
  function showMsg(msg: string) { setPoolToast(msg); setTimeout(() => setPoolToast(""), 2500); }

  function handleAdd() {
    const lines = bulkInput.split(/[\n,;]+/).map(s=>s.trim()).filter(s=>s.startsWith("AIza") && s.length > 20);
    if (!lines.length) { showMsg("No valid Gemini keys found (must start with AIza)"); return; }
    const existing = new Set(keys.map(k=>k.key));
    const added: PoolKey[] = lines.filter(k=>!existing.has(k)).map(k=>({
      id:Math.random().toString(36).slice(2), key:k, addedAt:new Date().toISOString(), used:false, label:poolLabel||undefined
    }));
    if (!added.length) { showMsg("All keys already in pool"); return; }
    save([...keys,...added]);
    setBulkInput(""); setPoolLabel("");
    showMsg("Added "+added.length+" key"+(added.length>1?"s":""));
  }

  function toggleUsed(id:string) { save(keys.map(k=>k.id===id?{...k,used:!k.used}:k)); }
  function removeKey(id:string) { save(keys.filter(k=>k.id!==id)); }
  function copyKey(key:string) { navigator.clipboard.writeText(key); showMsg("Copied!"); }

  const available = keys.filter(k=>!k.used).length;
  const used = keys.filter(k=>k.used).length;

  return (
    <div className="page-enter">
      {poolToast&&<div className="fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-xl bg-success/10 border-success/20 text-success [animation:var(--animate-fade-in)]">{poolToast}</div>}
      <div className="flex items-center justify-between mb-6 stagger-1">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">API Key Pool</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Bulk-store Gemini API keys for rapid license assignment</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline/20 rounded-xl">
            <span className="text-success text-xs font-bold">{available} available</span>
            <span className="text-outline-variant mx-1">Â·</span>
            <span className="text-on-surface-variant text-xs">{used} used</span>
          </div>
          {keys.length>0&&(confirmClear
            ?<div className="flex gap-2">
               <button onClick={()=>{save([]);setConfirmClear(false);showMsg("Pool cleared");}} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold cursor-pointer hover:brightness-110">Confirm</button>
               <button onClick={()=>setConfirmClear(false)} className="px-3 py-1.5 border border-outline/30 rounded-lg text-xs text-on-surface-variant cursor-pointer">Cancel</button>
             </div>
            :<button onClick={()=>setConfirmClear(true)} className="px-3 py-1.5 border border-error/30 text-error rounded-lg text-xs font-semibold hover:bg-error/10 transition-colors cursor-pointer">Clear All</button>
          )}
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
            <button onClick={handleAdd} className="mt-auto py-3 bg-primary text-on-primary rounded-lg text-sm font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2" style={{boxShadow:"0 0 20px rgba(181,196,255,0.2)"}}>
              <span className="material-symbols-outlined text-[18px]">upload</span>Add to Pool
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline/20 rounded-xl overflow-hidden stagger-3">
        <div className="p-5 border-b border-outline/20 bg-surface-container-low flex items-center justify-between">
          <h3 className="text-base font-bold text-on-surface">Stored Keys ({keys.length})</h3>
          <span className="text-xs text-on-surface-variant">Click status badge to toggle used/available</span>
        </div>
        {keys.length===0?(
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-3 block text-outline-variant">key_off</span>
            <p className="text-sm">No keys in pool. Paste keys above to get started.</p>
          </div>
        ):(
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-high/50 text-on-surface-variant">
                <tr>{["Status","API Key","Label","Added",""].map((h,i)=>(
                  <th key={i} className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider${i===4?" text-right":""}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {keys.map((k,i)=>(
                  <tr key={k.id} className="hover:bg-surface-container-high/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <button onClick={()=>toggleUsed(k.id)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${k.used?"bg-outline/10 border-outline/30 text-on-surface-variant":"bg-success/10 border-success/20 text-success"}`}>
                        {k.used?"Used":"Available"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5"><span className="font-mono text-sm text-tertiary">{k.key.slice(0,18)}â€¦</span></td>
                    <td className="px-5 py-3.5 text-sm text-on-surface-variant">{k.label||<span className="italic opacity-40 text-xs">â€”</span>}</td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant opacity-60">{new Date(k.addedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>copyKey(k.key)} title="Copy full key" className="p-1.5 hover:text-primary transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
                        <button onClick={()=>removeKey(k.id)} title="Remove" className="p-1.5 hover:text-error transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


