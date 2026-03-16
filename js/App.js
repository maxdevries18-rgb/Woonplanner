// ── Hoofd App ─────────────────────────────────────────────────────────────────
function App() {
  const [currentUser,setCurrentUser]=useState(null);
  const [allUsers,setAllUsers]=useState([]);
  const [allTeams,setAllTeams]=useState([]);
  const [myTeamIds,setMyTeamIds]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [appError,setAppError]=useState(null);
  const [view,setView]=useState("week");
  const [selectedDay,setSelectedDay]=useState(()=>{const d=new Date().getDay();return d===0?6:d-1;});
  const [showModal,setShowModal]=useState(false);
  const [showMenu,setShowMenu]=useState(false);
  const [showBeheer,setShowBeheer]=useState(false);
  const [beheerTab,setBeheerTab]=useState("teams");
  const [showStats,setShowStats]=useState(false);
  const [notification,setNotification]=useState(null);
  const [filterUser,setFilterUser]=useState("all");
  const [filterTeam,setFilterTeam]=useState("all");
  const [filterDone,setFilterDone]=useState("all");
  const [saving,setSaving]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [categories,setCategories]=useState(()=>{try{const s=localStorage.getItem("woonplanner_categories");return s?JSON.parse(s):DEFAULT_CATEGORIES;}catch(e){return DEFAULT_CATEGORIES;}});
  const [showLabelManager,setShowLabelManager]=useState(false);
  const [newLabel,setNewLabel]=useState({label:"",icon:"🏷️"});
  const [editingTask,setEditingTask]=useState(null);
  const [form,setForm]=useState({title:"",userIds:[],teamIds:[],category:DEFAULT_CATEGORIES[0].id,dayIndex:0,deadline:"hele_dag",notes:"",recurrenceType:"none",recurrenceDay:null});
  const [weekOffset,setWeekOffset]=useState(0);
  const [holidays,setHolidays]=useState({});
  const [pendingCount,setPendingCount]=useState(0);
  const [theme,setTheme]=useState(()=>{try{const s=localStorage.getItem("woonplanner_theme");return s?JSON.parse(s):THEME_COLORS[0];}catch(e){return THEME_COLORS[0];}});
  const [searchQuery,setSearchQuery]=useState("");

  useEffect(()=>{
    document.documentElement.style.setProperty("--bg-color", theme.color);
    document.documentElement.style.setProperty("--bg-gradient", theme.gradient);
    document.documentElement.style.setProperty("--panel-bg", theme.panel);
    localStorage.setItem("woonplanner_theme", JSON.stringify(theme));
  },[theme]);

  const weekDates=getWeekDates(weekOffset);
  const todayIndex=weekOffset===0?(()=>{const d=new Date().getDay();return d===0?6:d-1;})():-1;
  const currentMonday=weekDates[0].toISOString().split("T")[0];

  useEffect(()=>{
    async function herstel(){
      const sid=localStorage.getItem("woonplanner_user_id");
      if(sid){const {data}=await supabase.from("users").select("*").eq("id",parseInt(sid)).single();if(data)setCurrentUser(data);}
      setLoading(false);
    }
    herstel();
  },[]);

  const loadAll=useCallback(async()=>{
    if(!currentUser) return;
    try{
      const [r1,r2,r3,r4,r5]=await Promise.all([
        supabase.from("users").select("*").order("created_at"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("team_members").select("*").eq("user_id",currentUser.id).eq("status","approved"),
        supabase.from("tasks").select("*").order("created_at",{ascending:true}),
        supabase.from("task_teams").select("*"),
      ]);
      setAllUsers(r1.data||[]);
      setAllTeams(r2.data||[]);
      const myIds=(r3.data||[]).map(m=>m.team_id);
      setMyTeamIds(myIds);
      const me=(r1.data||[]).find(u=>u.id===currentUser.id);
      if(me) setCurrentUser(me);
      const map={};
      (r5.data||[]).forEach(tt=>{if(!map[tt.task_id])map[tt.task_id]=[];map[tt.task_id].push(tt.team_id);});
      const allNorm=(r4.data||[]).filter(t=>{
        const tTeams=map[t.id]||[];
        if(tTeams.length>0) return tTeams.some(tid=>myIds.includes(tid));
        return true;
      }).map(t=>normalizeTask(t,map[t.id]||[]));

      const recurring=allNorm.filter(t=>t.recurrenceType&&t.recurrenceType!=="none");
      const virtual=[];
      recurring.forEach(t=>{
        if(recurringTaskBelongsToWeek(t,currentMonday)){
          let di=t.dayIndex;
          if(t.recurrenceType==="monthly"||t.recurrenceType==="monthly_last"){
            for(let i=0;i<7;i++){
              const d=new Date(weekDates[0]); d.setDate(weekDates[0].getDate()+i);
              if(t.recurrenceType==="monthly"&&d.getDate()===t.recurrenceDay){di=i;break;}
              if(t.recurrenceType==="monthly_last"){
                const dayOfWeek=(d.getDay()+6)%7;
                if(dayOfWeek===t.dayIndex){const nw=new Date(d);nw.setDate(d.getDate()+7);if(nw.getMonth()!==d.getMonth()){di=i;break;}}
              }
            }
          }
          virtual.push({...t,id:`rec_${t.id}_${currentMonday}`,weekMonday:currentMonday,dayIndex:di,done:false,isVirtual:true,originalId:t.id});
        }
      });
      setTasks([...allNorm,...virtual]);
      setAppError(null);
    }catch(e){setAppError("Verbinding mislukt");}
  },[currentUser?.id,currentMonday]);

  useEffect(()=>{loadAll();},[loadAll]);
  useEffect(()=>{if(!currentUser)return;const iv=setInterval(loadAll,30000);return()=>clearInterval(iv);},[currentUser,loadAll]);
  useEffect(()=>{try{localStorage.setItem("woonplanner_categories",JSON.stringify(categories));}catch(e){};},[categories]);

  useEffect(()=>{
    async function laadHolidays(){
      const jaar=new Date().getFullYear();const res={};
      for(const j of[jaar,jaar+1]){
        try{
          const cached=localStorage.getItem(`holidays_NL_${j}`);
          if(cached) Object.assign(res,JSON.parse(cached));
          else{const r=await fetch(`https://date.nager.at/api/v3/PublicHolidays/${j}/NL`);const data=await r.json();const jd={};data.forEach(h=>{jd[h.date]=h.localName;});localStorage.setItem(`holidays_NL_${j}`,JSON.stringify(jd));Object.assign(res,jd);}
        }catch(e){}
      }
      setHolidays(res);
    }
    laadHolidays();
  },[]);

  useEffect(()=>{
    async function checkPending(){
      if(!currentUser) return;
      const {data}=await supabase.from("team_members").select("*");
      const members=data||[];
      const myAdminTeams=members.filter(m=>m.user_id===currentUser.id&&m.role==="admin"&&m.status==="approved").map(m=>m.team_id);
      setPendingCount(members.filter(m=>m.status==="pending"&&myAdminTeams.includes(m.team_id)).length);
    }
    checkPending();
    const iv=setInterval(checkPending,30000);
    return()=>clearInterval(iv);
  },[currentUser]);

  function holidayFor(date){return holidays[date.toISOString().split("T")[0]]||null;}
  async function refresh(){setRefreshing(true);await loadAll();setTimeout(()=>setRefreshing(false),500);}
  const myApprovedTeams=allTeams.filter(t=>myTeamIds.includes(t.id));

  const filtered=useMemo(()=>tasks.filter(t=>{
    const matchWeek=t.weekMonday===currentMonday;
    const matchDone=filterDone==="all"||(filterDone==="done"&&t.done)||(filterDone==="open"&&!t.done);
    const matchUser=filterUser==="all"||t.userIds===null||(t.userIds||[]).includes(parseInt(filterUser));
    const matchTeam=filterTeam==="all"?true:(t.teamIds||[]).includes(parseInt(filterTeam));
    const matchSearch=searchQuery.trim()===""||t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchWeek&&matchDone&&matchUser&&matchTeam&&matchSearch;
  }),[tasks,currentMonday,filterDone,filterUser,filterTeam,searchQuery]);

  function showNotif(title,body){setNotification({title,body});setTimeout(()=>setNotification(null),3000);}

  async function saveTask(){
    if(!form.title.trim()) return;
    if(!currentUser.can_create_tasks&&!currentUser.is_admin&&!editingTask) return showNotif("❌ Geen recht","Je mag geen taken aanmaken");
    setSaving(true);
    const user_id=form.userIds.length===0?null:form.userIds.join(",");
    const recDay=form.recurrenceType==="monthly"
      ? weekDates[form.dayIndex].getDate()
      : form.recurrenceType==="monthly_last"||form.recurrenceType==="weekly"||form.recurrenceType==="biweekly"
        ? form.dayIndex : null;
    try{
      if(editingTask&&!editingTask.isVirtual){
        await supabase.from("tasks").update({title:form.title,user_id,category:form.category,day_index:form.dayIndex,deadline:form.deadline||"",notes:form.notes||"",recurrence_type:form.recurrenceType==="none"?null:form.recurrenceType,recurrence_day:form.recurrenceType==="none"?null:recDay}).eq("id",editingTask.id);
        await supabase.from("task_teams").delete().eq("task_id",editingTask.id);
        if(form.teamIds.length>0) await supabase.from("task_teams").insert(form.teamIds.map(tid=>({task_id:editingTask.id,team_id:tid})));
        showNotif("✏️ Bijgewerkt!",form.title);
      } else {
        const targetId=editingTask?.isVirtual?editingTask.originalId:null;
        if(targetId){
          await supabase.from("tasks").update({title:form.title,user_id,category:form.category,deadline:form.deadline||"",notes:form.notes||""}).eq("id",targetId);
          showNotif("✏️ Bijgewerkt!",form.title);
        } else {
          const {data,error}=await supabase.from("tasks").insert([{title:form.title,user_id,category:form.category,day_index:form.dayIndex,done:false,deadline:form.deadline||"",week_monday:currentMonday,notes:form.notes||"",recurrence_type:form.recurrenceType==="none"?null:form.recurrenceType,recurrence_day:form.recurrenceType==="none"?null:recDay}]).select().single();
          if(error) throw error;
          if(form.teamIds.length>0) await supabase.from("task_teams").insert(form.teamIds.map(tid=>({task_id:data.id,team_id:tid})));
          showNotif("🎉 Toegevoegd!",form.title);
        }
      }
      setShowModal(false); setEditingTask(null);
      setForm(f=>({...f,title:"",userIds:[],teamIds:[],dayIndex:selectedDay,deadline:"hele_dag",notes:"",recurrenceType:"none"}));
      await loadAll();
    }catch(e){showNotif("❌ Mislukt","Kon taak niet opslaan");}
    finally{setSaving(false);}
  }

  async function toggleDone(id,cur){
    if(String(id).startsWith("rec_")){
      const vTask=tasks.find(t=>t.id===id);
      if(!vTask) return;
      const user_id=vTask.userIds===null?null:vTask.userIds.join(",");
      const {data,error}=await supabase.from("tasks").insert([{title:vTask.title,user_id,category:vTask.category,day_index:vTask.dayIndex,done:true,deadline:vTask.deadline||"",week_monday:currentMonday,notes:vTask.notes||""}]).select().single();
      if(!error){await loadAll();showNotif("✅ Afgevinkt!","");}
      return;
    }
    setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!cur}:t));
    try{
      await supabase.from("tasks").update({done:!cur}).eq("id",id);
      if(!cur) showNotif("✅ Afgevinkt!","");
    }catch(e){setTasks(prev=>prev.map(t=>t.id===id?{...t,done:cur}:t));}
  }

  async function deleteTask(id){
    let targetId = id;
    if(String(id).startsWith("rec_")){
      const vTask=tasks.find(t=>t.id===id);
      if(vTask && vTask.originalId) {
        if(!window.confirm("Wil je de hele reeks van deze herhalende taak verwijderen?")) return;
        targetId = vTask.originalId;
      }
    }
    
    setTasks(prev=>prev.filter(t=>t.id!==id && t.originalId!==targetId));
    try{
      await supabase.from("task_teams").delete().eq("task_id",targetId);
      await supabase.from("tasks").delete().eq("id",targetId);
      showNotif("🗑️ Taak (en reeks) verwijderd","");
      await loadAll();
    }catch(e){showNotif("❌ Mislukt","");loadAll();}
  }

  function openModal(dayIndex){
    if(!currentUser.can_create_tasks&&!currentUser.is_admin) return showNotif("❌ Geen recht","Je mag geen taken aanmaken");
    setEditingTask(null);
    setForm({title:"",userIds:[],teamIds:[],category:categories[0]?.id||"household",dayIndex,deadline:"hele_dag",notes:"",recurrenceType:"none",recurrenceDay:null});
    setShowModal(true);
  }
  function openEditModal(task){
    // Als het een virtuele taak is, bewerk het origineel
    let taskToEdit = task;
    if(task.isVirtual && task.originalId){
      const original = tasks.find(t => t.id === task.originalId);
      if(original) {
        taskToEdit = original;
      } else {
        // Als het origineel niet in de huidige lijst staat (bijv. andere week),
        // moeten we het eigenlijk ophalen, maar we kunnen ook de data van de virtuele taak gebruiken
        // met het originele ID.
        taskToEdit = {...task, id: task.originalId, isVirtual: false};
      }
    }
    
    setEditingTask(taskToEdit);
    setForm({
      title:taskToEdit.title,
      userIds:taskToEdit.userIds||[],
      teamIds:taskToEdit.teamIds||[],
      category:taskToEdit.category,
      dayIndex:taskToEdit.dayIndex,
      deadline:taskToEdit.deadline||"hele_dag",
      notes:taskToEdit.notes||"",
      recurrenceType:taskToEdit.recurrenceType||"none",
      recurrenceDay:taskToEdit.recurrenceDay
    });
    setShowModal(true);
  }
  function addLabel(){if(!newLabel.label.trim())return;setCategories(prev=>[...prev,{id:"custom_"+Date.now(),label:newLabel.label.trim(),icon:newLabel.icon}]);setNewLabel({label:"",icon:"🏷️"});}
  function deleteLabel(id){setCategories(prev=>prev.filter(c=>c.id!==id));}
  function tasksByDay(i){return filtered.filter(t=>t.dayIndex===i);}

  const closeTaskModal = useCallback(() => {
    if (form.title.trim() && !window.confirm("Je hebt nog onopgeslagen tekst. Weet je zeker dat je wilt sluiten?")) {
      return;
    }
    setShowModal(false);
    setEditingTask(null);
  }, [form.title]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (showModal) closeTaskModal();
        else if (showMenu) setShowMenu(false);
        else if (showBeheer) setShowBeheer(false);
        else if (showStats) setShowStats(false);
        else if (showLabelManager) setShowLabelManager(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showModal, showMenu, showBeheer, showStats, showLabelManager, closeTaskModal]);

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><div className="spinner"/></div>;
  if(!currentUser) return <LoginScreen onLogin={u=>setCurrentUser(u)}/>;
  if(appError) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16,padding:32,textAlign:"center"}}>
      <div style={{fontSize:48}}>⚠️</div>
      <p style={{color:"#FF6B6B",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:18}}>Database niet bereikbaar</p>
      <button onClick={loadAll} style={{background:"#FF6B6B",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",cursor:"pointer",fontWeight:700}}>Opnieuw</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#f0f0f0",paddingBottom:"calc(80px + env(safe-area-inset-bottom))"}}>
      {notification&&(
        <div className="notif" style={{position:"fixed",top:"calc(20px + env(safe-area-inset-top))",right:20,zIndex:9999,background:"linear-gradient(135deg,#2d2d5e,#3d3d7e)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"14px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:280}}>
          <div style={{fontWeight:700,fontSize:14}}>{notification.title}</div>
          {notification.body&&<div style={{fontSize:12,opacity:0.7,marginTop:2}}>{notification.body}</div>}
        </div>
      )}
      {showMenu&&<HamburgerMenu currentUser={currentUser} pendingCount={pendingCount} theme={theme} onThemeChange={setTheme}
        onOpenBeheer={(tab)=>{setBeheerTab(tab);setShowBeheer(true);}}
        onOpenLabels={()=>setShowLabelManager(true)}
        onOpenStats={()=>setShowStats(true)}
        onOpenBoodschappen={()=>setView("boodschappen")}
        onWissel={()=>{localStorage.removeItem("woonplanner_user_id");setCurrentUser(null);}}
        onClose={()=>setShowMenu(false)}
      />}
      {showBeheer&&<BeheerScherm currentUser={currentUser} initialTab={beheerTab} onClose={()=>{setShowBeheer(false);loadAll();}} showNotif={showNotif}/>}
      {showStats&&<StatistiekenScherm onClose={()=>setShowStats(false)} allUsers={allUsers} allTeams={allTeams} myTeamIds={myTeamIds}/>}
      <div style={{paddingTop:"calc(14px + env(safe-area-inset-top))",paddingBottom:10,paddingLeft:16,paddingRight:16,background:theme.color+"f7",borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <button onClick={()=>setShowMenu(true)} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:18,position:"relative",flexShrink:0}}>
                ☰
                {pendingCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#FF6B6B",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{pendingCount}</span>}
              </button>
              <h1 style={{fontSize:18,fontWeight:900,letterSpacing:-1,fontFamily:"'Space Mono',monospace"}}>🏠 WoonPlanner</h1>
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",justify:"flex-end"}}>
              {[{id:"all",username:"Allen",color:"#888"},...allUsers].map(u=>{
                const active=String(filterUser)===String(u.id);
                return <button key={u.id} onClick={()=>setFilterUser(String(u.id))} style={{background:active?u.color:"rgba(255,255,255,0.06)",color:"#fff",border:"none",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",opacity:active?1:0.5}}>{u.username}</button>;
              })}
              <div style={{width:1,height:16,background:"rgba(255,255,255,0.1)",flexShrink:0}}/>
              <div style={{width:26,height:26,borderRadius:"50%",background:currentUser.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0}}>{currentUser.username[0].toUpperCase()}</div>
              {currentUser.is_admin&&<span style={{fontSize:10,color:"#FFD93D"}}>👑</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
            <button onClick={()=>setFilterTeam("all")} style={{background:filterTeam==="all"?"rgba(255,255,255,0.14)":"rgba(255,255,255,0.04)",border:filterTeam==="all"?"1px solid rgba(255,255,255,0.22)":"1px solid transparent",borderRadius:20,padding:"3px 11px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Alle teams</button>
            {myApprovedTeams.map(t=>{const tc=t.color||"#7c7cff";const active=String(filterTeam)===String(t.id);return <button key={t.id} onClick={()=>setFilterTeam(String(t.id))} style={{background:active?tc+"33":"rgba(255,255,255,0.04)",border:active?`1px solid ${tc}66`:"1px solid transparent",borderRadius:20,padding:"3px 11px",color:active?tc:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>👥 {t.name}</button>;})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:3,background:"rgba(255,255,255,0.05)",borderRadius:12,padding:3}}>
              {[{id:"week",label:"📅 Week"},{id:"day",label:"🌤 Dag"},{id:"tasks",label:"📋 Taken"},{id:"boodschappen",label:"🛒 Lijst"}].map(v=>(
                <button key={v.id} onClick={()=>setView(v.id)} style={{background:view===v.id?"rgba(255,255,255,0.15)":"transparent",color:view===v.id?"#fff":"rgba(255,255,255,0.5)",border:"none",borderRadius:8,padding:"5px 13px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{v.label}</button>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,width:26,height:26,color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <span style={{fontSize:11,fontWeight:700,color:weekOffset===0?"#4ECDC4":"rgba(255,255,255,0.6)",whiteSpace:"nowrap"}}>
                {weekOffset===0?"Deze week":weekOffset===1?"Volgende week":weekOffset===-1?"Vorige week":`Week ${getWeekNumber(weekDates[0])}`}
                {" "}<span style={{opacity:0.4,fontWeight:400}}>({formatDate(weekDates[0])} – {formatDate(weekDates[6])})</span>
              </span>
              <button onClick={()=>setWeekOffset(o=>o+1)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,width:26,height:26,color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
              {weekOffset!==0&&<button onClick={()=>setWeekOffset(0)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"2px 7px",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:11,fontWeight:700}}>Nu</button>}
              <button onClick={refresh} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,animation:refreshing?"spin 0.5s linear":"none"}}>🔄</button>
              <span style={{fontSize:11,color:"#4ECDC4"}}>●</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px"}}>
        {view==="week"&&(
          <div className="week-grid slide-in">
            {DAYS.map((day,i)=>{
              const hol=holidayFor(weekDates[i]);
              return (
                <div key={i} className="day-col week-day-col" onClick={()=>{setSelectedDay(i);setView("day");}} style={{background:hol?"rgba(255,211,61,0.07)":i===todayIndex?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.03)",borderRadius:16,padding:"12px",border:hol?"1px solid rgba(255,211,61,0.25)":i===todayIndex?"1px solid rgba(255,255,255,0.2)":"1px solid rgba(255,255,255,0.05)",cursor:"pointer",minHeight:160}}>
                  <div className="day-inner">
                    <div className="day-date" style={{marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,opacity:0.5,textTransform:"uppercase",letterSpacing:1}}>{day}</div>
                      <div style={{fontSize:20,fontWeight:900,fontFamily:"'Space Mono',monospace",color:i===todayIndex?"#FF6B6B":hol?"#FFD93D":"inherit"}}>{weekDates[i].getDate()}</div>
                      {hol&&<div style={{fontSize:9,color:"#FFD93D",fontWeight:700,marginTop:2,lineHeight:1.2}}>{hol}</div>}
                    </div>
                    <div className="day-tasks" style={{display:"flex",flexDirection:"column",gap:4}}>
                      {tasksByDay(i).slice(0,5).map(t=>{
                        const hasRealUser=t.userIds!==null&&(t.userIds||[]).length>0;
                        const fu=hasRealUser?(allUsers.find(u=>u.id==t.userIds?.[0])||{color:"#888"}):{color:"#888"};
                        const ft=t.teamIds?.length?allTeams.find(tm=>tm.id==t.teamIds[0]):null;
                        const clr=hasRealUser?fu.color:(ft?.color||"#888");
                        const ct=categories.find(c=>c.id===t.category)||{icon:"🏷️"};
                        return <div key={t.id} style={{background:clr+"22",borderLeft:`3px solid ${clr}`,borderRadius:"0 6px 6px 0",padding:"3px 6px",fontSize:11,fontWeight:600,opacity:t.done?0.4:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",color:"#f0f0f0"}}>{ct.icon} {t.title}{t.isRecurring?" 🔁":""}</div>;
                      })}
                      {tasksByDay(i).length>5&&<div style={{fontSize:10,opacity:0.4}}>+{tasksByDay(i).length-5} meer</div>}
                      {tasksByDay(i).length===0&&!hol&&<div style={{fontSize:11,opacity:0.25,fontStyle:"italic"}}>Vrij</div>}
                      {tasksByDay(i).length===0&&hol&&<div style={{fontSize:11,color:"#FFD93D",opacity:0.6,fontStyle:"italic"}}>Feestdag 🎉</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {view==="day"&&(
          <div className="slide-in">
            <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              {DAYS.map((d,i)=><button key={i} onClick={()=>setSelectedDay(i)} style={{background:selectedDay===i?(i===todayIndex?"#FF6B6B":"rgba(255,255,255,0.15)"):"rgba(255,255,255,0.04)",border:"none",borderRadius:12,padding:"7px 14px",color:selectedDay===i?"#fff":"rgba(255,255,255,0.5)",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>{d} {weekDates[i].getDate()}</button>)}
            </div>
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:holidayFor(weekDates[selectedDay])?6:14,fontFamily:"'Space Mono',monospace"}}>
              {DAYS_FULL[selectedDay]} <span style={{opacity:0.4,fontWeight:400,fontSize:14}}>{formatDate(weekDates[selectedDay])}</span>
            </h2>
            {holidayFor(weekDates[selectedDay])&&<div style={{background:"rgba(255,211,61,0.12)",border:"1px solid rgba(255,211,61,0.3)",borderRadius:10,padding:"7px 14px",marginBottom:14,display:"inline-flex",alignItems:"center",gap:8}}><span>🎉</span><span style={{color:"#FFD93D",fontWeight:700,fontSize:13}}>{holidayFor(weekDates[selectedDay])}</span></div>}
            {tasksByDay(selectedDay).length===0
              ?<div style={{textAlign:"center",padding:"60px 20px",opacity:0.3}}><div style={{fontSize:48,marginBottom:12}}>😴</div><div style={{fontSize:16,fontWeight:600}}>Niks gepland!</div></div>
              :<div style={{display:"flex",flexDirection:"column",gap:10}}>{tasksByDay(selectedDay).sort((a,b)=>{
                  if(a.deadline==="hele_dag"&&b.deadline!=="hele_dag") return -1;
                  if(a.deadline!=="hele_dag"&&b.deadline==="hele_dag") return 1;
                  return a.deadline.localeCompare(b.deadline);
                }).map(t=><TaskCard key={t.id} task={t} onToggle={toggleDone} onDelete={deleteTask} onEdit={openEditModal} categories={categories} allUsers={allUsers} allTeams={allTeams} currentUser={currentUser}/>)}</div>
            }
          </div>
        )}
        {view==="tasks"&&(
          <div className="slide-in">
            <div style={{marginBottom:20}}>
              <input placeholder="🔍 Zoek op taaktitel..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"13px 18px",color:"#fff",fontSize:16,outline:"none"}}/>
            </div>
            {categories.map(c=>{
              const ct=filtered.filter(t=>t.category===c.id);
              if(!ct.length) return null;
              return (
                <div key={c.id} style={{marginBottom:24}}>
                  <h3 style={{fontSize:13,fontWeight:800,marginBottom:10,opacity:0.7,letterSpacing:1,textTransform:"uppercase"}}>{c.icon} {c.label} <span style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"2px 8px",fontSize:11,marginLeft:6}}>{ct.length}</span></h3>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {ct.sort((a,b)=>a.dayIndex-b.dayIndex).map(t=><TaskCard key={t.id} task={t} onToggle={toggleDone} onDelete={deleteTask} onEdit={openEditModal} showDay categories={categories} allUsers={allUsers} allTeams={allTeams} currentUser={currentUser}/>)}
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",opacity:0.3}}><div style={{fontSize:48,marginBottom:12}}>📭</div><div style={{fontSize:16,fontWeight:600}}>Geen taken gevonden</div></div>}
          </div>
        )}
        {view==="boodschappen"&&(
          <BoodschappenScherm currentUser={currentUser} myTeamIds={myTeamIds} allTeams={allTeams} showNotif={showNotif} isView={true}/>
        )}
        <div style={{marginTop:24,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[
            {key:"all",label:"Totaal",value:tasks.filter(t=>t.weekMonday===currentMonday&&!t.isVirtual).length,icon:"📋",color:"#7c7cff"},
            {key:"done",label:"Gedaan",value:tasks.filter(t=>t.weekMonday===currentMonday&&t.done&&!t.isVirtual).length,icon:"✅",color:"#4ECDC4"},
            {key:"open",label:"Open",value:tasks.filter(t=>t.weekMonday===currentMonday&&!t.done&&!t.isVirtual).length,icon:"⏳",color:"#FF6B6B"},
          ].map(s=>(
            <div key={s.key} onClick={()=>setFilterDone(s.key)} style={{background:filterDone===s.key?s.color+"22":"rgba(255,255,255,0.04)",borderRadius:14,padding:"14px 16px",textAlign:"center",cursor:"pointer",border:filterDone===s.key?`1px solid ${s.color}55`:"1px solid rgba(255,255,255,0.06)",transition:"all 0.2s"}}>
              <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:26,fontWeight:900,fontFamily:"'Space Mono',monospace",color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,opacity:filterDone===s.key?0.9:0.5,marginTop:2,fontWeight:700}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn-pulse" onClick={()=>openModal(selectedDay)} style={{position:"fixed",bottom:"calc(28px + env(safe-area-inset-bottom))",right:24,background:`linear-gradient(135deg,${currentUser.color},${currentUser.color}bb)`,color:"#fff",border:"none",borderRadius:"50%",width:60,height:60,fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>+</button>
      {showModal&&(
        <Modal title={editingTask?"✏️ Taak wijzigen":"➕ Nieuwe taak"} onClose={closeTaskModal} maxWidth={500}>
            <input placeholder="Wat moet er gebeuren?" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&saveTask()} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"13px 15px",color:"#fff",fontSize:16,marginBottom:14,outline:"none"}}/>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:8}}>Voor wie</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>setForm(f=>({...f,userIds:[]}))} style={{background:form.userIds.length===0?"#888":"rgba(255,255,255,0.06)",color:"#fff",border:form.userIds.length===0?"1px solid #aaa":"1px solid transparent",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:form.userIds.length===0?1:0.5}}>👥 Iedereen</button>
                {allUsers.map(u=>{const active=form.userIds.includes(u.id);return <button key={u.id} onClick={()=>setForm(f=>({...f,userIds:active?f.userIds.filter(id=>id!==u.id):[...f.userIds,u.id]}))} style={{background:active?u.color:"rgba(255,255,255,0.06)",color:"#fff",border:active?`1px solid ${u.color}`:"1px solid transparent",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:active?1:0.5}}>{u.username[0].toUpperCase()} {u.username}{active?" ✓":""}</button>;})}
              </div>
            </div>
            {myApprovedTeams.length>0&&(
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:8}}>Koppel aan team (optioneel)</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {myApprovedTeams.map(team=>{const active=form.teamIds.includes(team.id);const tc=team.color||"#7c7cff";return <button key={team.id} onClick={()=>setForm(f=>({...f,teamIds:active?f.teamIds.filter(id=>id!==team.id):[...f.teamIds,team.id]}))} style={{background:active?tc+"33":"rgba(255,255,255,0.06)",color:active?tc:"rgba(255,255,255,0.55)",border:active?`1px solid ${tc}`:"1px solid transparent",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>👥 {team.name}{active?" ✓":""}</button>;})}
                </div>
                {form.teamIds.length>0&&<p style={{fontSize:11,opacity:0.35,marginTop:5}}>Alleen teamleden kunnen deze taak zien</p>}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Tijdstip</label>
                <select value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} style={{width:"100%",background:"#2a2a5a",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"9px 11px",color:"#fff",fontSize:13,outline:"none",cursor:"pointer"}}>
                  {TIME_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Dag</label>
                <select value={form.dayIndex} onChange={e=>setForm(f=>({...f,dayIndex:parseInt(e.target.value)}))} style={{width:"100%",background:"#2a2a5a",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"9px 11px",color:"#fff",fontSize:13,outline:"none",cursor:"pointer"}}>
                  {DAYS.map((d,i)=><option key={i} value={i}>{d} {weekDates[i].getDate()}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>🔁 Herhaling</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RECURRENCE_OPTIONS.map(r=>(
                  <button key={r.value} onClick={()=>setForm(f=>({...f,recurrenceType:r.value}))} style={{background:form.recurrenceType===r.value?"rgba(255,211,61,0.2)":"rgba(255,255,255,0.05)",color:form.recurrenceType===r.value?"#FFD93D":"rgba(255,255,255,0.55)",border:form.recurrenceType===r.value?"1px solid rgba(255,211,61,0.4)":"1px solid transparent",borderRadius:10,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{r.label}</button>
                ))}
              </div>
              {form.recurrenceType!=="none"&&<p style={{fontSize:11,opacity:0.35,marginTop:6}}>🔁 Wordt elke week opnieuw aangemaakt op basis van de gekozen dag</p>}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Label</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {categories.map(c=><button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{background:form.category===c.id?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.05)",color:"#fff",border:form.category===c.id?"1px solid rgba(255,255,255,0.3)":"1px solid transparent",borderRadius:10,padding:"7px 11px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{c.icon} {c.label}</button>)}
              </div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:10,opacity:0.5,fontWeight:700,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>📝 Notitie (optioneel)</label>
              <textarea placeholder="Extra informatie, aanwijzingen..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:16,outline:"none",resize:"vertical",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}/>
            </div>
            <button onClick={saveTask} disabled={saving} style={{width:"100%",padding:"15px",background:saving?"rgba(255,255,255,0.1)":`linear-gradient(135deg,${currentUser.color},${currentUser.color}bb)`,color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer"}}>{saving?"Opslaan...":editingTask?"Wijzigingen opslaan ✓":"Taak toevoegen 🚀"}</button>
        </Modal>
      )}
      {showLabelManager&&(
        <Modal title="🏷️ Labels beheren" onClose={()=>setShowLabelManager(false)} maxWidth={500}>
            <p style={{fontSize:12,opacity:0.4,marginBottom:18}}>Maak je eigen labels aan</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {categories.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"11px 14px"}}>
                  <span style={{fontSize:14,fontWeight:600}}>{c.icon} {c.label}</span>
                  <button onClick={()=>deleteLabel(c.id)} style={{background:"rgba(255,100,100,0.15)",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:"#FF6B6B",fontSize:12,fontWeight:700}}>Verwijder</button>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:18}}>
              <input placeholder="Naam van label..." value={newLabel.label} onChange={e=>setNewLabel(l=>({...l,label:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addLabel()} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,outline:"none",marginBottom:12}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                {LABEL_ICONS.map(icon=><button key={icon} onClick={()=>setNewLabel(l=>({...l,icon}))} style={{width:34,height:34,borderRadius:8,fontSize:17,background:newLabel.icon===icon?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)",border:newLabel.icon===icon?"1px solid rgba(255,255,255,0.4)":"1px solid transparent",cursor:"pointer"}}>{icon}</button>)}
              </div>
              <button onClick={addLabel} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#4ECDC4,#2ecc71)",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer"}}>+ Label toevoegen</button>
            </div>
        </Modal>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
