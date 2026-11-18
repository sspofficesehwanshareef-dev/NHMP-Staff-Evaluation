
import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {
  BarChart,Bar,XAxis,YAxis,Tooltip,
  ResponsiveContainer,CartesianGrid,Legend
} from 'recharts';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url,key) : null;

const units = [
  'LHQ / SP Office',
  'Beat-01 Petaro',
  'Beat-02 Sann',
  'Beat-03 Sehwan'
];

const ratings = [
  {label:'Excellent',score:4},
  {label:'Good',score:3},
  {label:'Average',score:2},
  {label:'Poor',score:1}
];

const demoStaff = [
  {id:'s1',name:'Muhammad Ali',designation:'H/Cook',unit:units[0]},
  {id:'s2',name:'Ghulam Mustafa',designation:'Driver',unit:units[1]},
  {id:'s3',name:'Abdul Sattar',designation:'Sweeper',unit:units[2]},
  {id:'s4',name:'Rashid Hussain',designation:'H/Cook',unit:units[3]}
];

function App(){

  // Authentication states
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [profileLoading,setProfileLoading] = useState(false);
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [loginError,setLoginError] = useState('');
  const [loginBusy,setLoginBusy] = useState(false);

  // Existing application states
  const [tab,setTab] = useState('dashboard');

  const [staff,setStaff] = useState(
    ()=>JSON.parse(localStorage.getItem('nhmp_staff')||'null')||demoStaff
  );

  const [votes,setVotes] = useState(
    ()=>JSON.parse(localStorage.getItem('nhmp_votes')||'[]')
  );

  const [round,setRound] = useState(
    ()=>JSON.parse(localStorage.getItem('nhmp_round')||'null')||{
      month:'November 2026',
      start:'2026-11-25',
      end:'2026-12-03',
      status:'Scheduled'
    }
  );

  const [newName,setNewName] = useState('');
  const [newDesig,setNewDesig] = useState('');
  const [newUnit,setNewUnit] = useState(units[0]);

  const [dateStart,setDateStart] = useState(round.start);
  const [dateEnd,setDateEnd] = useState(round.end);
  const [month,setMonth] = useState(round.month);

  const [notice,setNotice] = useState(
    'Demo data is stored in this browser only.'
  );

  // Check whether a user is already signed in
  useEffect(()=>{
    if(!supabase){
      setLoginError('Supabase configuration is missing.');
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({data,error})=>{
      if(!mounted)return;

      if(error)setLoginError(error.message);

      setSession(data.session);
      setAuthLoading(false);
    });

    const {data:{subscription}} =
      supabase.auth.onAuthStateChange((_event,nextSession)=>{
        if(mounted){
          setSession(nextSession);
          setProfile(null);
        }
      });

    return ()=>{
      mounted=false;
      subscription.unsubscribe();
    };
  },[]);

  // Load the signed-in user's profile and assigned unit
  useEffect(()=>{
    if(!session){
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async()=>{
      setProfileLoading(true);
      setLoginError('');

      const {data,error} = await supabase
        .from('profiles')
        .select('id,full_name,role,unit_id,active')
        .eq('id',session.user.id)
        .single();

      if(!active)return;

      if(error){
        setLoginError(
          'Your account profile could not be loaded. Contact the administrator.'
        );
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if(data.active===false){
        setLoginError('Your account is inactive. Contact the administrator.');
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if(data.role!=='admin' && data.role!=='officer'){
        setLoginError('Your account does not have an authorized role.');
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      let unitName = '';

      if(data.unit_id){
        const {data:unitData,error:unitError} = await supabase
          .from('units')
          .select('id,name')
          .eq('id',data.unit_id)
          .single();

        if(!active)return;

        if(unitError){
          setLoginError('Your assigned unit could not be identified.');
          setProfile(null);
          setProfileLoading(false);
          return;
        }

        unitName = unitData.name;
      }

      if(data.role==='officer' && !unitName){
        setLoginError('No unit is assigned to your officer account.');
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfile({...data,unit_name:unitName});
      setProfileLoading(false);
    };

    loadProfile();

    return ()=>{active=false};
  },[session]);

  // Login function
  const handleLogin = async(e)=>{
    e.preventDefault();

    if(!supabase){
      setLoginError('Supabase is not configured.');
      return;
    }

    setLoginBusy(true);
    setLoginError('');

    const {error} = await supabase.auth.signInWithPassword({
      email:loginEmail.trim(),
      password:loginPassword
    });

    if(error)setLoginError(error.message);

    setLoginBusy(false);
  };

  // Logout function
  const handleLogout = async()=>{
    const {error} = await supabase.auth.signOut();

    if(error){
      setLoginError(error.message);
      return;
    }

    setProfile(null);
    setSession(null);
    setLoginPassword('');
    setTab('dashboard');
  };

  // Save existing demo information in this browser
  useEffect(()=>{
    localStorage.setItem('nhmp_staff',JSON.stringify(staff));
  },[staff]);

  useEffect(()=>{
    localStorage.setItem('nhmp_votes',JSON.stringify(votes));
  },[votes]);

  useEffect(()=>{
    localStorage.setItem('nhmp_round',JSON.stringify(round));
  },[round]);

  // Determine the logged-in user's role
  const isAdmin = profile?.role==='admin';
  const isOfficer = profile?.role==='officer';

  const currentOfficer = isOfficer ? {
    id:profile.id,
    name:profile.full_name,
    unit:profile.unit_name,
    role:'officer'
  } : null;

  const myStaff = isOfficer
    ? staff.filter(s=>s.unit===profile.unit_name)
    : [];

  const myVotes = votes.filter(
    v=>v.officerId===profile?.id && v.month===round.month
  );

  // Performance report using demo votes
  const report = useMemo(()=>staff.map(s=>{
    const relevant = votes.filter(
      v=>v.staffId===s.id && v.month===round.month
    );

    const counts = ratings.map(r=>({
      name:r.label,
      count:relevant.filter(v=>v.score===r.score).length
    }));

    const avg = relevant.length
      ? relevant.reduce((a,b)=>a+b.score,0)/relevant.length
      : 0;

    return {
      name:s.name,
      unit:s.unit,
      average:avg?avg.toFixed(2):'—',
      votes:relevant.length,
      Excellent:counts[0].count,
      Good:counts[1].count,
      Average:counts[2].count,
      Poor:counts[3].count
    };
  }),[staff,votes,round.month]);

  // Demo voting function - not yet connected to database
  const cast = (staffId,score)=>{
    if(!isOfficer)return;

    const existing = votes.find(
      v=>v.staffId===staffId &&
      v.officerId===profile.id &&
      v.month===round.month
    );

    if(existing){
      setVotes(votes.map(v=>v===existing?{...v,score}:v));
    }else{
      setVotes([...votes,{
        staffId,
        officerId:profile.id,
        officerName:profile.full_name,
        unit:profile.unit_name,
        month:round.month,
        score
      }]);
    }
  };

  // Add demo staff member
  const addStaff = ()=>{
    if(!newName.trim()||!newDesig.trim())return;

    setStaff([...staff,{
      id:crypto.randomUUID(),
      name:newName.trim(),
      designation:newDesig.trim(),
      unit:newUnit
    }]);

    setNewName('');
    setNewDesig('');
    setNotice('Demo staff member added.');
  };

  // Save demo schedule
  const saveSchedule = ()=>{
    if(!month.trim()||!dateStart||!dateEnd||dateEnd<dateStart){
      setNotice('Please enter a valid evaluation month and date range.');
      return;
    }

    setRound({
      ...round,
      month,
      start:dateStart,
      end:dateEnd,
      status:'Scheduled'
    });

    setNotice('Demo schedule saved in this browser.');
  };

  // Export demo report
  const exportCsv = ()=>{
    const rows = [
      ['Staff','Unit','Excellent','Good','Average','Poor','Votes','Average score'],
      ...report.map(r=>[
        r.name,r.unit,r.Excellent,r.Good,r.Average,r.Poor,r.votes,r.average
      ])
    ];

    const csv = rows.map(r=>
      r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')
    ).join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([csv],{type:'text/csv'})
    );
    a.download = 'NHMP-performance-'+round.month.replaceAll(' ','-')+'.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Navigation according to the authenticated role
  const allNav = [
    ['dashboard','Dashboard'],
    ['vote','Voting portal'],
    ['staff','Staff register'],
    ['schedule','Schedule'],
    ['reports','Reports']
  ];

  const nav = isAdmin
    ? allNav
    : allNav.filter(([id])=>['dashboard','vote'].includes(id));

  // Loading screen
  if(authLoading || (session && profileLoading)){
    return (
      <div style={{padding:'60px',textAlign:'center'}}>
        <h2>NHMP Staff Evaluation</h2>
        <p>Checking your account...</p>
      </div>
    );
  }

  // Login screen
  if(!session){
    return (
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'#f3f6f8',
        padding:'20px'
      }}>
        <form onSubmit={handleLogin} style={{
          background:'#fff',
          padding:'35px',
          borderRadius:'12px',
          width:'100%',
          maxWidth:'400px',
          boxShadow:'0 5px 25px #00000012'
        }}>
          <h2 style={{color:'#145c43'}}>NHMP</h2>
          <h3>Staff Evaluation System</h3>
          <p>Sign in using your authorized account.</p>

          <label>Email address</label>
          <input
            type="email"
            required
            value={loginEmail}
            onChange={e=>setLoginEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width:'100%',
              padding:'12px',
              margin:'8px 0 18px',
              boxSizing:'border-box'
            }}
          />

          <label>Password</label>
          <input
            type="password"
            required
            value={loginPassword}
            onChange={e=>setLoginPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width:'100%',
              padding:'12px',
              margin:'8px 0 18px',
              boxSizing:'border-box'
            }}
          />

          {loginError && (
            <p style={{color:'red'}}>{loginError}</p>
          )}

          <button
            type="submit"
            disabled={loginBusy}
            style={{
              width:'100%',
              padding:'13px',
              cursor:'pointer'
            }}
          >
            {loginBusy?'Signing in...':'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  // Profile validation screen
  if(!profile){
    return (
      <div style={{padding:'40px',textAlign:'center'}}>
        <h2>Account profile unavailable</h2>
        <p>{loginError}</p>
        <button onClick={handleLogout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="shell">

      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark">N</div>
          <div>
            <b>NHMP</b>
            <small>Staff Evaluation</small>
          </div>
        </div>

        <div className="navlabel">WORKSPACE</div>

        {nav.map(([id,label])=>(
          <button
            key={id}
            className={'nav '+(tab===id?'active':'')}
            onClick={()=>setTab(id)}
          >
            {label}
          </button>
        ))}

        <div className="sidebottom">
          <span className="dot"></span> Authenticated with Supabase
        </div>
      </aside>

      <main className="main">

        <header>
          <div>
            <div className="eyebrow">
              NATIONAL HIGHWAYS & MOTORWAY POLICE
            </div>
            <h1>{nav.find(n=>n[0]===tab)?.[1]||'Dashboard'}</h1>
          </div>

          <div className="headercontrols">
            <span className="pill">
              {isAdmin?'SP / Admin':'Officer'}
            </span>
            <span className="avatar">
              {isAdmin?'SP':'OF'}
            </span>
            <button onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <div className="notice">
          {notice}
        </div>

        {tab==='dashboard'&&(
          <>
            <section className="welcome">
              <div>
                <span className="pill">MONTHLY EVALUATION</span>
                <h2>{round.month}</h2>
                <p>
                  Performance overview across four administrative units.
                </p>
                <p>
                  Signed in as: <b>{profile.full_name}</b>
                </p>
                {isOfficer&&<p>Assigned unit: <b>{profile.unit_name}</b></p>}
              </div>

              <div className="roundstatus">
                {round.status}
                <small>{round.start} → {round.end}</small>
              </div>
            </section>

            <section className="stats">
              <div className="stat">
                <span>Class-IV staff</span>
                <b>{staff.length}</b>
                <small>Demo employee records</small>
              </div>

              <div className="stat">
                <span>Evaluation role</span>
                <b>{isAdmin?'Admin':'Officer'}</b>
                <small>Authenticated account</small>
              </div>

              <div className="stat">
                <span>Votes received</span>
                <b>{isAdmin
                  ?votes.filter(v=>v.month===round.month).length
                  :myVotes.length}
                </b>
                <small>Demo votes in this browser</small>
              </div>

              <div className="stat">
                <span>Units</span>
                <b>4</b>
                <small>Separate voting scopes</small>
              </div>
            </section>

            {isAdmin&&(
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h3>Unit-wise staff overview</h3>
                    <p>Demo employees assigned to each unit</p>
                  </div>
                  <button
                    className="outline"
                    onClick={()=>setTab('reports')}
                  >
                    View reports →
                  </button>
                </div>

                <div className="unitgrid">
                  {units.map(u=>(
                    <div className="unitcard" key={u}>
                      <span>{u}</span>
                      <b>{staff.filter(s=>s.unit===u).length}</b>
                      <small>Staff members</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panelhead">
                <div>
                  <h3>Evaluation rules</h3>
                  <p>Planned application workflow</p>
                </div>
              </div>

              <div className="rulegrid">
                <span>
                  Vote visibility
                  <strong>Officer-identifiable to SP/Admin</strong>
                </span>
                <span>
                  Remarks
                  <strong>Disabled</strong>
                </span>
                <span>
                  Transfer scoring
                  <strong>Weighted by days served</strong>
                </span>
                <span>
                  Schedule
                  <strong>Fixed start/end dates</strong>
                </span>
              </div>
            </section>
          </>
        )}

        {tab==='vote'&&isOfficer&&(
          <section className="panel">
            <div className="panelhead">
              <div>
                <h3>Private voting portal</h3>
                <p>
                  You can evaluate demo staff assigned to your unit.
                </p>
              </div>
              <span className="pill">{profile.unit_name}</span>
            </div>

            <p>
              Signed-in officer: <b>{profile.full_name}</b>
            </p>

            <div className="votelist">
              {myStaff.map(s=>{
                const v = myVotes.find(x=>x.staffId===s.id);

                return (
                  <div className="voteitem" key={s.id}>
                    <div>
                      <b>{s.name}</b>
                      <small>{s.designation} · {s.unit}</small>
                    </div>

                    <div className="ratingbuttons">
                      {ratings.map(r=>(
                        <button
                          key={r.score}
                          className={'rating '+(
                            v?.score===r.score?'chosen':''
                          )}
                          onClick={()=>cast(s.id,r.score)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!myStaff.length&&(
                <p>
                  No demo staff are assigned to your unit.
                </p>
              )}
            </div>

            <p className="muted">
              This is still a browser-only demonstration. Votes are not
              yet saved to Supabase.
            </p>
          </section>
        )}

        {tab==='staff'&&isAdmin&&(
          <section className="panel">
            <div className="panelhead">
              <div>
                <h3>Class-IV staff register</h3>
                <p>
                  Demo register. Database-backed posting history
                  will be implemented later.
                </p>
              </div>
            </div>

            <div className="formrow">
              <input
                placeholder="Employee name"
                value={newName}
                onChange={e=>setNewName(e.target.value)}
              />

              <input
                placeholder="Designation"
                value={newDesig}
                onChange={e=>setNewDesig(e.target.value)}
              />

              <select
                value={newUnit}
                onChange={e=>setNewUnit(e.target.value)}
              >
                {units.map(u=>(
                  <option key={u}>{u}</option>
                ))}
              </select>

              <button onClick={addStaff}>Add staff</button>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Unit</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map(s=>(
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.designation}</td>
                      <td>{s.unit}</td>
                      <td>
                        <button
                          className="textbtn"
                          onClick={()=>
                            setStaff(staff.filter(x=>x.id!==s.id))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab==='schedule'&&isAdmin&&(
          <section className="panel narrow">
            <div className="panelhead">
              <div>
                <h3>Monthly voting schedule</h3>
                <p>Demo schedule settings</p>
              </div>
            </div>

            <label className="fieldlabel">Evaluation month</label>
            <input
              value={month}
              onChange={e=>setMonth(e.target.value)}
              placeholder="e.g. December 2026"
            />

            <label className="fieldlabel">Voting start date</label>
            <input
              type="date"
              value={dateStart}
              onChange={e=>setDateStart(e.target.value)}
            />

            <label className="fieldlabel">Voting closing date</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e=>setDateEnd(e.target.value)}
            />

            <button onClick={saveSchedule}>Save schedule</button>

            <p className="muted">
              This schedule is currently stored in this browser only.
              Automatic voting control will be implemented later.
            </p>
          </section>
        )}

        {tab==='reports'&&isAdmin&&(
          <>
            <section className="panel">
              <div className="panelhead">
                <div>
                  <h3>Staff performance summary</h3>
                  <p>Demo ratings and vote totals</p>
                </div>
                <button onClick={exportCsv}>Export CSV</button>
              </div>

              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Unit</th>
                      <th>Excellent</th>
                      <th>Good</th>
                      <th>Average</th>
                      <th>Poor</th>
                      <th>Votes</th>
                      <th>Score / 4</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.map(r=>(
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{r.unit}</td>
                        <td>{r.Excellent}</td>
                        <td>{r.Good}</td>
                        <td>{r.Average}</td>
                        <td>{r.Poor}</td>
                        <td>{r.votes}</td>
                        <td><b>{r.average}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panelhead">
                <div>
                  <h3>Rating distribution</h3>
                  <p>Number of demo votes per employee</p>
                </div>
              </div>

              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="name"/>
                    <YAxis allowDecimals={false}/>
                    <Tooltip/>
                    <Legend/>
                    <Bar
                      dataKey="Excellent"
                      stackId="a"
                      fill="#18865c"
                    />
                    <Bar
                      dataKey="Good"
                      stackId="a"
                      fill="#3978bd"
                    />
                    <Bar
                      dataKey="Average"
                      stackId="a"
                      fill="#e5a23b"
                    />
                    <Bar
                      dataKey="Poor"
                      stackId="a"
                      fill="#c94b4b"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h3>Officer-wise vote audit</h3>
              <p className="muted">
                Demo audit information. Production audit will use
                database records.
              </p>

              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Unit</th>
                      <th>Officer</th>
                      <th>Rating</th>
                      <th>Month</th>
                    </tr>
                  </thead>

                  <tbody>
                    {votes.filter(v=>v.month===round.month).map((v,i)=>(
                      <tr key={i}>
                        <td>
                          {staff.find(s=>s.id===v.staffId)?.name||'Removed staff'}
                        </td>
                        <td>{v.unit}</td>
                        <td>{v.officerName}</td>
                        <td>
                          {ratings.find(r=>r.score===v.score)?.label}
                        </td>
                        <td>{v.month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer>
          NHMP Staff Performance Evaluation · Prototype v1.1
        </footer>

      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
