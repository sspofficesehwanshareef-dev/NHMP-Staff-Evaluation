import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid,Legend} from 'recharts';
import './style.css';

const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=url&&key&&!url.includes('YOUR-PROJECT')?createClient(url,key):null;
const units=['LHQ / SP Office','Beat-01 Petaro','Beat-02 Sann','Beat-03 Sehwan'];
const ratings=[{label:'Excellent',score:4},{label:'Good',score:3},{label:'Average',score:2},{label:'Poor',score:1}];
const demoStaff=[
 {id:'s1',name:'Muhammad Ali',designation:'H/Cook',unit:units[0]},
 {id:'s2',name:'Ghulam Mustafa',designation:'Driver',unit:units[1]},
 {id:'s3',name:'Abdul Sattar',designation:'Sweeper',unit:units[2]},
 {id:'s4',name:'Rashid Hussain',designation:'H/Cook',unit:units[3]}
];
const demoOfficers=[
 {id:'o1',name:'Demo Officer LHQ',unit:units[0],role:'officer'},
 {id:'o2',name:'Demo Officer Petaro',unit:units[1],role:'officer'},
 {id:'o3',name:'Demo Officer Sann',unit:units[2],role:'officer'},
 {id:'o4',name:'Demo Officer Sehwan',unit:units[3],role:'officer'}
];
function App(){
 const [tab,setTab]=useState('dashboard'),[role,setRole]=useState('sp'),[unit,setUnit]=useState(units[0]);
 const [staff,setStaff]=useState(()=>JSON.parse(localStorage.getItem('nhmp_staff')||'null')||demoStaff);
 const [officers,setOfficers]=useState(()=>JSON.parse(localStorage.getItem('nhmp_officers')||'null')||demoOfficers);
 const [votes,setVotes]=useState(()=>JSON.parse(localStorage.getItem('nhmp_votes')||'[]'));
 const [round,setRound]=useState(()=>JSON.parse(localStorage.getItem('nhmp_round')||'null')||{month:'November 2026',start:'2026-11-25',end:'2026-12-03',status:'Scheduled'});
 const [who,setWho]=useState('o1'),[newName,setNewName]=useState(''),[newDesig,setNewDesig]=useState(''),[newUnit,setNewUnit]=useState(units[0]);
 const [dateStart,setDateStart]=useState(round.start),[dateEnd,setDateEnd]=useState(round.end),[month,setMonth]=useState(round.month);
 const [notice,setNotice]=useState('Demo mode: changes are saved in this browser only.');
 useEffect(()=>{localStorage.setItem('nhmp_staff',JSON.stringify(staff))},[staff]);
 useEffect(()=>{localStorage.setItem('nhmp_officers',JSON.stringify(officers))},[officers]);
 useEffect(()=>{localStorage.setItem('nhmp_votes',JSON.stringify(votes))},[votes]);
 useEffect(()=>{localStorage.setItem('nhmp_round',JSON.stringify(round))},[round]);
 const currentOfficer=officers.find(x=>x.id===who)||officers[0];
 const myStaff=staff.filter(s=>s.unit===currentOfficer?.unit);
 const myVotes=votes.filter(v=>v.officerId===who&&v.month===round.month);
 const report=useMemo(()=>staff.map(s=>{
   const relevant=votes.filter(v=>v.staffId===s.id&&v.month===round.month);
   const counts=ratings.map(r=>({name:r.label,count:relevant.filter(v=>v.score===r.score).length}));
   const avg=relevant.length?relevant.reduce((a,b)=>a+b.score,0)/relevant.length:0;
   return {name:s.name,unit:s.unit,average:avg?avg.toFixed(2):'—',votes:relevant.length,Excellent:counts[0].count,Good:counts[1].count,Average:counts[2].count,Poor:counts[3].count};
 }),[staff,votes,round.month]);
 const cast=(staffId,score)=>{const existing=votes.find(v=>v.staffId===staffId&&v.officerId===who&&v.month===round.month);
   if(existing)setVotes(votes.map(v=>v===existing?{...v,score}:v));
   else setVotes([...votes,{staffId,officerId:who,officerName:currentOfficer.name,unit:currentOfficer.unit,month:round.month,score}]);
 };
 const addStaff=()=>{if(!newName.trim()||!newDesig.trim())return;setStaff([...staff,{id:crypto.randomUUID(),name:newName.trim(),designation:newDesig.trim(),unit:newUnit}]);setNewName('');setNewDesig('');setNotice('Staff member added.')};
 const saveSchedule=()=>{setRound({...round,month,start:dateStart,end:dateEnd,status:'Scheduled'});setNotice('Schedule saved. In production, a server scheduler must open and close voting on these dates.')};
 const exportCsv=()=>{const rows=[['Staff','Unit','Excellent','Good','Average','Poor','Votes','Average score'],...report.map(r=>[r.name,r.unit,r.Excellent,r.Good,r.Average,r.Poor,r.votes,r.average])];const csv=rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='NHMP-performance-'+round.month.replaceAll(' ','-')+'.csv';a.click();URL.revokeObjectURL(a.href)};
 const nav=[['dashboard','Dashboard'],['vote','Voting portal'],['staff','Staff register'],['officers','Officer register'],['schedule','Schedule'],['reports','Reports']];
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brandmark">N</div><div><b>NHMP</b><small>Staff Evaluation</small></div></div><div className="navlabel">WORKSPACE</div>{nav.map(([id,label])=><button key={id} className={'nav '+(tab===id?'active':'')} onClick={()=>setTab(id)}>{label}</button>)}<div className="sidebottom"><span className="dot"></span> {supabase?'Connected to Supabase':'Local demo mode'}</div></aside>
 <main className="main"><header><div><div className="eyebrow">NATIONAL HIGHWAYS & MOTORWAY POLICE</div><h1>{nav.find(n=>n[0]===tab)?.[1]}</h1></div><div className="headercontrols"><select value={role} onChange={e=>setRole(e.target.value)}><option value="sp">SP / Admin view</option><option value="officer">Officer view</option></select><span className="avatar">{role==='sp'?'SP':'OF'}</span></div></header>
 <div className="notice">{notice}</div>
 {tab==='dashboard'&&<><section className="welcome"><div><span className="pill">MONTHLY EVALUATION</span><h2>{round.month}</h2><p>Performance overview across four administrative units.</p></div><div className="roundstatus">{round.status}<small>{round.start} → {round.end}</small></div></section><section className="stats"><div className="stat"><span>Class-IV staff</span><b>{staff.length}</b><small>Registered employees</small></div><div className="stat"><span>Eligible officers</span><b>{officers.length}</b><small>Voting register</small></div><div className="stat"><span>Votes received</span><b>{votes.filter(v=>v.month===round.month).length}</b><small>Current evaluation</small></div><div className="stat"><span>Units</span><b>4</b><small>Separate voting scopes</small></div></section><section className="panel"><div className="panelhead"><div><h3>Unit-wise staff overview</h3><p>Employees assigned to each unit</p></div><button className="outline" onClick={()=>setTab('reports')}>View reports →</button></div><div className="unitgrid">{units.map(u=><div className="unitcard" key={u}><span>{u}</span><b>{staff.filter(s=>s.unit===u).length}</b><small>Staff members</small></div>)}</div></section><section className="panel"><div className="panelhead"><div><h3>Evaluation rules</h3><p>Current configured workflow</p></div></div><div className="rulegrid"><span>Vote visibility<strong>Officer-identifiable to SP/Admin</strong></span><span>Remarks<strong>Disabled</strong></span><span>Transfer scoring<strong>Weighted by days served</strong></span><span>Schedule<strong>Fixed start/end dates</strong></span></div></section></>}
 {tab==='vote'&&<section className="panel"><div className="panelhead"><div><h3>Private voting portal</h3><p>Officer can evaluate only staff assigned to the officer's unit.</p></div><span className="pill">{currentOfficer?.unit}</span></div><label className="fieldlabel">Demo officer identity</label><select value={who} onChange={e=>setWho(e.target.value)}>{officers.map(o=><option value={o.id} key={o.id}>{o.name} — {o.unit}</option>)}</select><div className="votelist">{myStaff.map(s=>{const v=myVotes.find(x=>x.staffId===s.id);return <div className="voteitem" key={s.id}><div><b>{s.name}</b><small>{s.designation} · {s.unit}</small></div><div className="ratingbuttons">{ratings.map(r=><button key={r.score} className={'rating '+(v?.score===r.score?'chosen':'')} onClick={()=>cast(s.id,r.score)}>{r.label}</button>)}</div></div>})}{!myStaff.length&&<p>No staff are assigned to this unit.</p>}</div><p className="muted">A voter can change their rating until voting closes. In this demo, votes are stored in this browser.</p></section>}
 {tab==='staff'&&<section className="panel"><div className="panelhead"><div><h3>Class-IV staff register</h3><p>Maintain current posting assignment. Production version will retain dated posting history.</p></div></div><div className="formrow"><input placeholder="Employee name" value={newName} onChange={e=>setNewName(e.target.value)}/><input placeholder="Designation" value={newDesig} onChange={e=>setNewDesig(e.target.value)}/><select value={newUnit} onChange={e=>setNewUnit(e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select><button onClick={addStaff}>Add staff</button></div><div className="tablewrap"><table><thead><tr><th>Name</th><th>Designation</th><th>Unit</th><th></th></tr></thead><tbody>{staff.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.designation}</td><td>{s.unit}</td><td><button className="textbtn" onClick={()=>setStaff(staff.filter(x=>x.id!==s.id))}>Remove</button></td></tr>)}</tbody></table></div></section>}
 {tab==='officers'&&<section className="panel"><div className="panelhead"><div><h3>Eligible voting officers</h3><p>Each officer is restricted to the assigned unit.</p></div></div><div className="tablewrap"><table><thead><tr><th>Officer</th><th>Assigned unit</th><th>Role</th></tr></thead><tbody>{officers.map(o=><tr key={o.id}><td>{o.name}</td><td>{o.unit}</td><td><span className="pill">Voter</span></td></tr>)}</tbody></table></div><p className="muted">Officer accounts and credentials must be created by the administrator in the secured production system.</p></section>}
 {tab==='schedule'&&<section className="panel narrow"><div className="panelhead"><div><h3>Monthly voting schedule</h3><p>Choose fixed opening and closing dates.</p></div></div><label className="fieldlabel">Evaluation month</label><input value={month} onChange={e=>setMonth(e.target.value)} placeholder="e.g. December 2026"/><label className="fieldlabel">Voting start date</label><input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)}/><label className="fieldlabel">Voting closing date</label><input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)}/><button onClick={saveSchedule}>Save schedule</button><p className="muted">Important: browser-only demo cannot start or close voting while nobody is using the app. Production scheduling requires a server-side scheduled function.</p></section>}
 {tab==='reports'&&<><section className="panel"><div className="panelhead"><div><h3>Staff performance summary</h3><p>Ratings are visible to SP/Admin with the identity of the voting officer.</p></div><button onClick={exportCsv}>Export CSV</button></div><div className="tablewrap"><table><thead><tr><th>Employee</th><th>Unit</th><th>Excellent</th><th>Good</th><th>Average</th><th>Poor</th><th>Votes</th><th>Score / 4</th></tr></thead><tbody>{report.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.unit}</td><td>{r.Excellent}</td><td>{r.Good}</td><td>{r.Average}</td><td>{r.Poor}</td><td>{r.votes}</td><td><b>{r.average}</b></td></tr>)}</tbody></table></div></section><section className="panel"><div className="panelhead"><div><h3>Rating distribution</h3><p>Number of votes per employee</p></div></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={report}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Excellent" stackId="a" fill="#18865c"/><Bar dataKey="Good" stackId="a" fill="#3978bd"/><Bar dataKey="Average" stackId="a" fill="#e5a23b"/><Bar dataKey="Poor" stackId="a" fill="#c94b4b"/></BarChart></ResponsiveContainer></div></section><section className="panel"><h3>Officer-wise vote audit</h3><p className="muted">SP/Admin only. This demo displays the officer identity attached to each vote.</p><div className="tablewrap"><table><thead><tr><th>Employee</th><th>Unit</th><th>Officer</th><th>Rating</th><th>Month</th></tr></thead><tbody>{votes.filter(v=>v.month===round.month).map((v,i)=><tr key={i}><td>{staff.find(s=>s.id===v.staffId)?.name||'Removed staff'}</td><td>{v.unit}</td><td>{v.officerName}</td><td>{ratings.find(r=>r.score===v.score)?.label}</td><td>{v.month}</td></tr>)}</tbody></table></div></section></>}
 <footer>NHMP Staff Performance Evaluation · Prototype v1.0</footer></main></div>
}
createRoot(document.getElementById('root')).render(<App/>);
