function StatistiekenScherm({onClose,allUsers,allTeams,myTeamIds}) {
  const [periode,setPeriode]=useState("week"); // week | maand | kwartaal | jaar
  const [allTasks,setAllTasks]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    async function laad(){
      setLoading(true);
      const {data}=await supabase.from("tasks").select("*");
      setAllTasks(data||[]);
      setLoading(false);
    }
    laad();
  },[]);

  function getPeriodeStart() {
    const now=new Date();
    if(periode==="week"){const d=new Date(now);d.setDate(now.getDate()-((now.getDay()+6)%7));d.setHours(0,0,0,0);return d;}
    if(periode==="maand"){return new Date(now.getFullYear(),now.getMonth(),1);}
    if(periode==="kwartaal"){const q=Math.floor(now.getMonth()/3);return new Date(now.getFullYear(),q*3,1);}
    if(periode==="jaar"){return new Date(now.getFullYear(),0,1);}
    return new Date(0);
  }

  const periodeStart=getPeriodeStart();
  const periodeLabel={"week":"Deze week","maand":"Deze maand","kwartaal":"Dit kwartaal","jaar":"Dit jaar"};

  const periodeTaken=allTasks.filter(t=>{
    if(!t.week_monday) return false;
    return new Date(t.week_monday)>=periodeStart;
  });

  const userStats=allUsers.map(u=>{
    const uid=String(u.id);
    const eigen=periodeTaken.filter(t=>{
      if(!t.user_id) return true;
      return String(t.user_id).split(",").includes(uid);
    });
    const gedaan=eigen.filter(t=>t.done).length;
    const totaal=eigen.length;
    return {user:u,totaal,gedaan,open:totaal-gedaan,pct:totaal>0?Math.round(gedaan/totaal*100):0};
  }).sort((a,b)=>b.gedaan-a.gedaan);

  const totaalAlle=periodeTaken.length;
  const gedaanAlle=periodeTaken.filter(t=>t.done).length;

  function getWeeklyData() {
    const weeks=[];
    for(let i=7;i>=0;i--){
      const mon=new Date(); mon.setDate(mon.getDate()-((mon.getDay()+6)%7)-i*7);
      const monStr=mon.toISOString().split("T")[0];
      const weekTaken=allTasks.filter(t=>t.week_monday===monStr);
      weeks.push({label:`W${getWeekNumber(mon)}`,gedaan:weekTaken.filter(t=>t.done).length,open:weekTaken.filter(t=>!t.done).length,totaal:weekTaken.length});
    }
    return weeks;
  }
  const weeklyData=getWeeklyData();
  const maxVal=Math.max(...weeklyData.map(w=>w.totaal),1);

  const periodes=[{k:"week",l:"Week"},{k:"maand",l:"Maand"},{k:"kwartaal",l:"Kwartaal"},{k:"jaar",l:"Jaar"}];

  return (
    <Modal title="📊 Statistieken" onClose={onClose} maxWidth={580}>
        <div style={{display:"flex",gap:6,marginBottom:20,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
          {periodes.map(p=>(
            <button key={p.k} onClick={()=>setPeriode(p.k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:periode===p.k?"rgba(255,255,255,0.15)":"transparent",color:periode===p.k?"#fff":"rgba(255,255,255,0.45)",transition:"all 0.15s"}}>{p.l}</button>
          ))}
        </div>
        {loading&&<div style={{display:"flex",justifyContent:"center",padding:40}}><div className="spinner"/></div>}
        {!loading&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
              {[
                {label:"Totaal",value:totaalAlle,icon:"📋",color:"#7c7cff"},
                {label:"Gedaan",value:gedaanAlle,icon:"✅",color:"#4ECDC4"},
                {label:"Open",value:totaalAlle-gedaanAlle,icon:"⏳",color:"#FF6B6B"},
              ].map(s=>(
                <div key={s.label} style={{background:s.color+"15",border:`1px solid ${s.color}33`,borderRadius:14,padding:"14px",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:28,fontWeight:900,fontFamily:"'Space Mono',monospace",color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,opacity:0.6,marginTop:2,fontWeight:700}}>{s.label}</div>
                  <div style={{fontSize:10,opacity:0.35,marginTop:1}}>{periodeLabel[periode]}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:20}}>
              <p style={{fontSize:11,fontWeight:700,opacity:0.5,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Per persoon</p>
              {userStats.map(s=>(
                <div key={s.user.id} style={{background:"rgba(255,255,255,0.04)",borderLeft:`4px solid ${s.user.color}`,borderRadius:12,padding:"12px 16px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:s.user.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,flexShrink:0}}>{s.user.username[0].toUpperCase()}</div>
                    <span style={{fontWeight:700,fontSize:14,flex:1}}>{s.user.username}</span>
                    <span style={{fontSize:12,color:"#4ECDC4",fontWeight:700}}>{s.gedaan}/{s.totaal}</span>
                    <span style={{fontSize:12,color:s.pct>=75?"#4ECDC4":s.pct>=50?"#FFD93D":"#FF6B6B",fontWeight:900}}>{s.pct}%</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.08)",borderRadius:6,height:6,overflow:"hidden"}}>
                    <div style={{width:`${s.pct}%`,height:"100%",background:s.user.color,borderRadius:6,transition:"width 0.5s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p style={{fontSize:11,fontWeight:700,opacity:0.5,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Afgelopen 8 weken</p>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:100}}>
                {weeklyData.map((w,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:"100%",display:"flex",flexDirection:"column",gap:2,height:80,justifyContent:"flex-end"}}>
                      <div style={{width:"100%",background:"#4ECDC4",borderRadius:"4px 4px 0 0",height:`${(w.gedaan/maxVal)*80}px`,transition:"height 0.4s ease",minHeight:w.gedaan>0?3:0}}/>
                      <div style={{width:"100%",background:"rgba(255,107,107,0.4)",height:`${(w.open/maxVal)*80}px`,transition:"height 0.4s ease",minHeight:w.open>0?2:0}}/>
                    </div>
                    <div style={{fontSize:9,opacity:0.4,fontWeight:700}}>{w.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:16,marginTop:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"#4ECDC4"}}/><span style={{fontSize:11,opacity:0.6}}>Gedaan</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"rgba(255,107,107,0.4)"}}/><span style={{fontSize:11,opacity:0.6}}>Open</span></div>
              </div>
            </div>
          </div>
        )}
    </Modal>
  );
}
