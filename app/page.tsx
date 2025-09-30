"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  date: string; company: string; title: string; url: string;
  status: string; followupDue: string; applyEmail: string; notes: string;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<""|"saved"|"applied">("");

  useEffect(() => {
    fetch("/api/apps").then(r => r.json()).then(d => setRows(d.items || []));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const okStatus = status ? r.status === status : true;
      const inText = (r.company + " " + r.title).toLowerCase().includes(q.toLowerCase());
      return okStatus && inText;
    });
  }, [rows, q, status]);

  return (
    <main style={{maxWidth: 1000, margin: "40px auto", padding: 16, fontFamily:"Inter, system-ui, sans-serif"}}>
      <h1 style={{fontSize: 28, marginBottom: 12}}>Toronto-JobBot Dashboard</h1>
      <div style={{display:"flex", gap: 8, marginBottom: 16}}>
        <input placeholder="Search company or title..." value={q} onChange={e=>setQ(e.target.value)}
               style={{flex:1, padding:8, border:"1px solid #ccc", borderRadius:8}}/>
        <select value={status} onChange={e=>setStatus(e.target.value as any)}
                style={{padding:8, border:"1px solid #ccc", borderRadius:8}}>
          <option value="">All</option>
          <option value="saved">Saved</option>
          <option value="applied">Applied</option>
        </select>
      </div>
      <div style={{overflowX:"auto", border:"1px solid #eee", borderRadius:8}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead style={{background:"#fafafa"}}>
            <tr>
              {["date","company","title","status","followupDue","url"].map(h=>(
                <th key={h} style={{textAlign:"left", padding:10, borderBottom:"1px solid #eee"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f2f2f2"}}>
                <td style={{padding:10}}>{r.date?.slice(0,10)}</td>
                <td style={{padding:10}}>{r.company}</td>
                <td style={{padding:10}}>{r.title}</td>
                <td style={{padding:10}}>{r.status}</td>
                <td style={{padding:10}}>{r.followupDue}</td>
                <td style={{padding:10}}>
                  {r.url ? <a href={r.url} target="_blank">open</a> : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{marginTop:12, color:"#666"}}>Showing {filtered.length} of {rows.length}</p>
    </main>
  );
}
