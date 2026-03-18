function BeheerScherm({currentUser,onClose,showNotif,initialTab}) {
  const [tab,setTab]=useState(initialTab||"teams");
  const [teams,setTeams]=useState([]);
  const [allMembers,setAllMembers]=useState([]);
  const [allUsers,setAllUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [teamsMode,setTeamsMode]=useState("overview");
  const [newTeamName,setNewTeamName]=useState("");
  const [newTeamColor,setNewTeamColor]=useState(TEAM_COLORS[0]);
  const [zoekTerm,setZoekTerm]=useState("");
  const [zoekRes,setZoekRes]=useState([]);
  const [saving,setSaving]=useState(false);
  const [teamsError,setTeamsError]=useState("");
  const [selTeam,setSelTeam]=useState(null);

  useEffect(()=>{laadAlles();},[]);
  async function laadAlles(){
    setLoading(true);
    const [r1,r2,r3]=await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("team_members").select("*"),
      supabase.from("users").select("*").order("created_at"),
    ]);
    setTeams(r1.data||[]); setAllMembers(r2.data||[]); setAllUsers(r3.data||[]);
    setLoading(false);
  }
  const myM=allMembers.filter(m=>m.user_id===currentUser.id);
  const userById=id=>allUsers.find(u=>u.id===id);
  const teamById=id=>teams.find(t=>t.id===id);
  const membersOf=tid=>allMembers.filter(m=>m.team_id===tid);
  const allPendingRequests=allMembers.filter(m=>{
    const isAdmin=myM.some(mm=>mm.team_id===m.team_id&&mm.role==="admin");
    return m.status==="pending"&&isAdmin;
  });

  async function maakTeamAan(){
    if(!newTeamName.trim()) return setTeamsError("Vul een teamnaam in");
    if(!currentUser.can_create_teams&&!currentUser.is_admin) return setTeamsError("Je hebt geen recht om teams aan te maken");
    setSaving(true); setTeamsError("");
    const {data:b}=await supabase.from("teams").select("id").eq("name",newTeamName.trim()).single();
    if(b){setSaving(false);return setTeamsError("Naam al in gebruik");}
    const {data,error}=await supabase.from("teams").insert([{name:newTeamName.trim(),color:newTeamColor,created_by:currentUser.id}]).select().single();
    if(error){setSaving(false);return setTeamsError("Aanmaken mislukt: "+error.message);}
    await supabase.from("team_members").insert([{team_id:data.id,user_id:currentUser.id,role:"admin",status:"approved"}]);
    setNewTeamName(""); setSaving(false); setTeamsMode("overview"); laadAlles();
    showNotif("✅ Team aangemaakt!",newTeamName);
  }
  async function zoekTeams(){
    if(!zoekTerm.trim()) return;
    const {data}=await supabase.from("teams").select("*").ilike("name",`%${zoekTerm.trim()}%`);
    setZoekRes(data||[]);
  }
  async function vraagToegang(teamId){
    setSaving(true);
    const b=allMembers.find(m=>m.team_id===teamId&&m.user_id===currentUser.id);
    if(!b) await supabase.from("team_members").insert([{team_id:teamId,user_id:currentUser.id,role:"member",status:"pending"}]);
    setSaving(false); laadAlles(); showNotif("📨 Verzoek verstuurd!","Wacht op goedkeuring");
  }
  async function keurGoed(id){await supabase.from("team_members").update({status:"approved"}).eq("id",id);laadAlles();}
  async function weiger(id){await supabase.from("team_members").delete().eq("id",id);laadAlles();}
  async function verlaat(teamId){await supabase.from("team_members").delete().eq("team_id",teamId).eq("user_id",currentUser.id);laadAlles();}
  async function verwijderTeam(teamId){
    if(!currentUser.can_delete_teams&&!currentUser.is_admin) return showNotif("❌ Geen recht","Je mag geen teams verwijderen");
    await supabase.from("teams").delete().eq("id",teamId);
    setSelTeam(null); setTeamsMode("overview"); laadAlles(); showNotif("🗑️ Team verwijderd","");
  }
  async function voegLidToe(teamId,userId){
    const bestaand=allMembers.find(m=>m.team_id===teamId&&m.user_id===userId);
    if(bestaand) return;
    await supabase.from("team_members").insert([{team_id:teamId,user_id:userId,role:"member",status:"approved"}]);
    laadAlles(); showNotif("✅ Lid toegevoegd","");
  }
  async function updateRecht(userId,key,value){
    if(!currentUser.is_admin) return showNotif("❌ Geen recht","Alleen beheerders kunnen rechten aanpassen");
    const update={};update[key]=value;
    await supabase.from("users").update(update).eq("id",userId);
    setAllUsers(prev=>prev.map(u=>u.id===userId?{...u,[key]:value}:u));
  }
  async function toggleAdmin(userId,value){
    if(!currentUser.is_admin) return showNotif("❌ Geen recht","");
    await supabase.from("users").update({is_admin:value}).eq("id",userId);
    setAllUsers(prev=>prev.map(u=>u.id===userId?{...u,is_admin:value}:u));
  }
  async function verwijderGebruiker(userId){
    if(!currentUser.is_admin) return showNotif("❌ Geen recht","");
    if(userId===currentUser.id) return showNotif("❌ Niet mogelijk","Je kunt jezelf niet verwijderen");
    await supabase.from("team_members").delete().eq("user_id",userId);
    await supabase.from("users").delete().eq("id",userId);
    setAllUsers(prev=>prev.filter(u=>u.id!==userId));
    showNotif("🗑️ Gebruiker verwijderd","");
  }
  async function resetPin(userId){
    if(!currentUser.is_admin) return showNotif("❌ Geen recht","");
    await supabase.from("users").update({pin:null}).eq("id",userId);
    setAllUsers(prev=>prev.map(u=>u.id===userId?{...u,pin:null}:u));
    showNotif("🔓 PIN gereset","Gebruiker moet opnieuw een PIN instellen");
  }
  const hBtnStyle=(active)=>({padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:active?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)",color:active?"#fff":"rgba(255,255,255,0.5)",transition:"all 0.15s"});
  const sLabel={fontSize:11,fontWeight:700,opacity:0.5,letterSpacing:1,textTransform:"uppercase",marginBottom:10,display:"block"};

  return (
    <Modal title="⚙️ Beheer" onClose={onClose} maxWidth={560}>
        <div style={{display:"flex",gap:6,marginBottom:20,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
          <button style={hBtnStyle(tab==="teams")} onClick={()=>setTab("teams")}>
            👥 Teams {allPendingRequests.length>0&&<span style={{background:"#FF6B6B",color:"#fff",borderRadius:20,padding:"1px 6px",fontSize:10,marginLeft:4}}>{allPendingRequests.length}</span>}
          </button>
          {(currentUser.is_admin||currentUser.can_view_users)&&<button style={hBtnStyle(tab==="gebruikers")} onClick={()=>setTab("gebruikers")}>👤 Gebruikers</button>}
        </div>
        {loading&&<div style={{display:"flex",justifyContent:"center",padding:40}}><div className="spinner"/></div>}
        {!loading&&tab==="teams"&&(
          <div>
            {allPendingRequests.length>0&&(
              <div style={{marginBottom:20}}>
                <span style={sLabel}>🔔 Toegangsverzoeken ({allPendingRequests.length})</span>
                {allPendingRequests.map(m=>{
                  const u=userById(m.user_id);const t=teamById(m.team_id);
                  return (
                    <div key={m.id} style={{background:"rgba(255,211,61,0.08)",border:"1px solid rgba(255,211,61,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:u?.color||"#888",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,flexShrink:0}}>{u?.username?.[0]?.toUpperCase()||"?"}</div>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{u?.username||"?"}</div><div style={{fontSize:12,opacity:0.5}}>wil lid worden van <b>{t?.name||"?"}</b></div></div>
                      <button onClick={()=>keurGoed(m.id)} style={{background:"rgba(78,205,196,0.2)",border:"1px solid rgba(78,205,196,0.4)",borderRadius:8,padding:"5px 12px",color:"#4ECDC4",cursor:"pointer",fontSize:12,fontWeight:700}}>✓ Goedkeuren</button>
                      <button onClick={()=>weiger(m.id)} style={{background:"rgba(255,80,80,0.15)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:8,padding:"5px 10px",color:"#FF6B6B",cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            {teamsMode==="overview"&&(
              <div>
                <span style={sLabel}>Alle teams ({teams.length})</span>
                {teams.map(team=>{
                  const tc=team.color||"#7c7cff";
                  const approved=membersOf(team.id).filter(m=>m.status==="approved");
                  const pending=membersOf(team.id).filter(m=>m.status==="pending");
                  const isMember=myM.some(m=>m.team_id===team.id&&m.status==="approved");
                  const isTeamAdmin=myM.some(m=>m.team_id===team.id&&m.role==="admin");
                  const myMem=allMembers.find(m=>m.team_id===team.id&&m.user_id===currentUser.id);
                  return (
                    <div key={team.id} style={{background:tc+"11",border:`1px solid ${tc}33`,borderLeft:`4px solid ${tc}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:15}}>{team.name}</div>
                          <div style={{fontSize:12,opacity:0.5,marginTop:3,display:"flex",gap:8,flexWrap:"wrap"}}>
                            <span>👤 {approved.length} {approved.length===1?"lid":"leden"}</span>
                            {pending.length>0&&<span style={{color:"#FFD93D"}}>⏳ {pending.length} wachtend</span>}
                            {isMember&&<span style={{color:"#4ECDC4"}}>✓ Jij bent lid</span>}
                            {isTeamAdmin&&<span style={{color:"#FFD93D"}}>👑 Jij bent beheerder</span>}
                          </div>
                          <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
                            {approved.map(m=>{const u=userById(m.user_id);return u?(<div key={m.id} title={u.username+(m.role==="admin"?" (beheerder)":"")} style={{width:24,height:24,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,border:m.role==="admin"?"2px solid #FFD93D":"2px solid transparent"}}>{u.username[0].toUpperCase()}</div>):null;})}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                          {(isTeamAdmin||currentUser.is_admin)&&<button onClick={()=>{setSelTeam(team);setTeamsMode("beheer");}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",cursor:"pointer",fontSize:12}}>⚙️ Beheer</button>}
                          {isMember&&!isTeamAdmin&&<button onClick={()=>verlaat(team.id)} style={{background:"rgba(255,80,80,0.12)",border:"none",borderRadius:8,padding:"5px 10px",color:"#FF6B6B",cursor:"pointer",fontSize:12}}>Verlaten</button>}
                          {!isMember&&!myMem&&<button onClick={()=>vraagToegang(team.id)} disabled={saving} style={{background:"rgba(124,124,255,0.2)",border:"1px solid rgba(124,124,255,0.4)",borderRadius:8,padding:"5px 10px",color:"#7c7cff",cursor:"pointer",fontSize:12,fontWeight:700}}>Toegang vragen</button>}
                          {myMem?.status==="pending"&&<span style={{fontSize:12,color:"#FFD93D",padding:"5px 0"}}>⏳ Wacht</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {teams.length===0&&<p style={{color:"rgba(255,255,255,0.3)",fontSize:14,textAlign:"center",padding:"20px 0"}}>Nog geen teams aangemaakt</p>}
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  {(currentUser.can_create_teams||currentUser.is_admin)&&<button onClick={()=>setTeamsMode("nieuw")} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,#7c7cff,#5555cc)",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Nieuw team</button>}
                  <button onClick={()=>setTeamsMode("zoek")} style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.08)",color:"#fff",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}}>🔍 Zoeken</button>
                </div>
              </div>
            )}
            {teamsMode==="nieuw"&&(
              <div>
                <button onClick={()=>{setTeamsMode("overview");setTeamsError("");}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:13,marginBottom:16}}>← Terug</button>
                <input placeholder="Teamnaam..." value={newTeamName} onChange={e=>{setNewTeamName(e.target.value);setTeamsError("");}} onKeyDown={e=>e.key==="Enter"&&maakTeamAan()} autoFocus style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:16,marginBottom:16,outline:"none"}}/>
                <span style={sLabel}>Teamkleur</span>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
                  {TEAM_COLORS.map(c=><div key={c} onClick={()=>setNewTeamColor(c)} style={{width:32,height:32,borderRadius:8,background:c,cursor:"pointer",border:newTeamColor===c?"3px solid #fff":"3px solid transparent",transition:"all 0.15s"}}/>)}
                </div>
                {teamsError&&<p style={{color:"#FF6B6B",fontSize:13,marginBottom:12,fontWeight:600}}>⚠️ {teamsError}</p>}
                <button onClick={maakTeamAan} disabled={saving} style={{width:"100%",padding:"14px",background:saving?"rgba(255,255,255,0.1)":`linear-gradient(135deg,${newTeamColor},${newTeamColor}99)`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:saving?"not-allowed":"pointer"}}>{saving?"Aanmaken...":"Team aanmaken →"}</button>
              </div>
            )}
            {teamsMode==="zoek"&&(
              <div>
                <button onClick={()=>setTeamsMode("overview")} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:13,marginBottom:16}}>← Terug</button>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  <input placeholder="Zoek op teamnaam..." value={zoekTerm} onChange={e=>setZoekTerm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&zoekTeams()} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"12px 16px",color:"#fff",fontSize:15,outline:"none"}}/>
                  <button onClick={zoekTeams} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:12,padding:"12px 16px",color:"#fff",cursor:"pointer",fontWeight:700}}>Zoek</button>
                </div>
                {zoekRes.map(team=>{
                  const m=allMembers.find(m=>m.team_id===team.id&&m.user_id===currentUser.id);
                  const tc=team.color||"#7c7cff";
                  const cnt=membersOf(team.id).filter(m=>m.status==="approved").length;
                  return (
                    <div key={team.id} style={{background:tc+"11",border:`1px solid ${tc}33`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div><div style={{fontWeight:700,fontSize:14}}>{team.name}</div><div style={{fontSize:12,opacity:0.5}}>{cnt} {cnt===1?"lid":"leden"}</div></div>
                      {!m&&<button onClick={()=>vraagToegang(team.id)} disabled={saving} style={{background:"rgba(124,124,255,0.2)",border:"1px solid rgba(124,124,255,0.4)",borderRadius:8,padding:"7px 14px",color:"#7c7cff",cursor:"pointer",fontSize:13,fontWeight:700}}>Toegang vragen</button>}
                      {m?.status==="pending"&&<span style={{fontSize:12,color:"#FFD93D"}}>⏳ Wacht op goedkeuring</span>}
                      {m?.status==="approved"&&<span style={{fontSize:12,color:"#4ECDC4"}}>✓ Lid</span>}
                    </div>
                  );
                })}
                {zoekRes.length===0&&zoekTerm&&<p style={{color:"rgba(255,255,255,0.3)",fontSize:14,textAlign:"center",padding:20}}>Geen teams gevonden</p>}
              </div>
            )}
            {teamsMode==="beheer"&&selTeam&&(
              <div>
                <button onClick={()=>{setSelTeam(null);setTeamsMode("overview");}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:13,marginBottom:16}}>← Terug</button>
                <div style={{background:(selTeam.color||"#7c7cff")+"11",border:`1px solid ${selTeam.color||"#7c7cff"}33`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:16}}>{selTeam.name}</div>
                </div>
                <span style={sLabel}>Leden</span>
                {membersOf(selTeam.id).map(m=>{
                  const u=userById(m.user_id);
                  return (
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:u?.color||"#888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0}}>{u?.username?.[0]?.toUpperCase()||"?"}</div>
                      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{u?.username||"?"}</div><div style={{fontSize:11,opacity:0.5}}>{m.role==="admin"?"👑 Beheerder":"Lid"} · {m.status==="pending"?"⏳ Wacht":"✓ Actief"}</div></div>
                      {m.status==="pending"&&(<><button onClick={()=>keurGoed(m.id)} style={{background:"rgba(78,205,196,0.2)",border:"none",borderRadius:8,padding:"5px 10px",color:"#4ECDC4",cursor:"pointer",fontSize:12,fontWeight:700}}>✓</button><button onClick={()=>weiger(m.id)} style={{background:"rgba(255,80,80,0.15)",border:"none",borderRadius:8,padding:"5px 10px",color:"#FF6B6B",cursor:"pointer",fontSize:12}}>✕</button></>)}
                      {m.status==="approved"&&m.user_id!==currentUser.id&&<button onClick={()=>weiger(m.id)} style={{background:"rgba(255,80,80,0.12)",border:"none",borderRadius:8,padding:"5px 10px",color:"#FF6B6B",cursor:"pointer",fontSize:12}}>Verwijder</button>}
                    </div>
                  );
                })}
                {nietLedenOf(selTeam.id).map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0}}>{u.username[0].toUpperCase()}</div>
                    <span style={{flex:1,fontWeight:600,fontSize:14,opacity:0.8}}>{u.username}</span>
                    <button onClick={()=>voegLidToe(selTeam.id,u.id)} style={{background:"rgba(78,205,196,0.15)",border:"1px solid rgba(78,205,196,0.3)",borderRadius:8,padding:"5px 12px",color:"#4ECDC4",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Toevoegen</button>
                  </div>
                ))}
                {(currentUser.is_admin||currentUser.can_delete_teams)&&<button onClick={()=>verwijderTeam(selTeam.id)} style={{width:"100%",marginTop:16,padding:"12px",background:"rgba(255,80,80,0.12)",border:"1px solid rgba(255,80,80,0.25)",borderRadius:12,color:"#FF6B6B",cursor:"pointer",fontSize:14,fontWeight:700}}>Team verwijderen</button>}
              </div>
            )}
          </div>
        )}
        {!loading&&tab==="gebruikers"&&(
          <div>
            {!currentUser.is_admin&&<div style={{background:"rgba(255,211,61,0.1)",border:"1px solid rgba(255,211,61,0.25)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#FFD93D"}}>👁️ Je hebt leesrechten — alleen beheerders kunnen wijzigingen aanbrengen.</div>}
            {allUsers.map(user=>(
              <div key={user.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${user.color}`,borderRadius:14,padding:"16px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:user.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,flexShrink:0}}>{user.username[0].toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      {user.username}
                      {user.is_admin&&<span style={{fontSize:11,background:"rgba(255,211,61,0.2)",color:"#FFD93D",borderRadius:6,padding:"2px 8px",fontWeight:700}}>👑 Admin</span>}
                      {user.id===currentUser.id&&<span style={{fontSize:11,background:"rgba(78,205,196,0.15)",color:"#4ECDC4",borderRadius:6,padding:"2px 8px"}}>Jij</span>}
                    </div>
                  </div>
                  {currentUser.is_admin&&user.id!==currentUser.id&&(
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>resetPin(user.id)} style={{background:"rgba(255,211,61,0.12)",border:"1px solid rgba(255,211,61,0.25)",borderRadius:8,padding:"5px 10px",color:"#FFD93D",cursor:"pointer",fontSize:12,fontWeight:700}}>🔓 PIN reset</button>
                      <button onClick={()=>verwijderGebruiker(user.id)} style={{background:"rgba(255,80,80,0.12)",border:"1px solid rgba(255,80,80,0.25)",borderRadius:8,padding:"5px 10px",color:"#FF6B6B",cursor:"pointer",fontSize:12,fontWeight:700}}>Verwijder</button>
                    </div>
                  )}
                </div>
                {currentUser.is_admin&&user.id!==currentUser.id&&(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#FFD93D"}}>👑 Globale beheerder</span>
                    <Toggle value={!!user.is_admin} onChange={v=>toggleAdmin(user.id,v)}/>
                  </div>
                )}
                {currentUser.is_admin&&!user.is_admin&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {RECHTEN.map(r=>(
                      <div key={r.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:13,opacity:0.8}}>{r.label}</span>
                        <Toggle value={user[r.key]!==false} onChange={v=>updateRecht(user.id,r.key,v)}/>
                      </div>
                    ))}
                  </div>
                )}
                {!currentUser.is_admin&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {RECHTEN.map(r=>(
                      <span key={r.key} style={{fontSize:11,background:user[r.key]!==false?"rgba(78,205,196,0.15)":"rgba(255,80,80,0.1)",color:user[r.key]!==false?"#4ECDC4":"rgba(255,100,100,0.7)",borderRadius:6,padding:"3px 8px"}}>{user[r.key]!==false?"✓":"✕"} {r.label}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
  );
  function nietLedenOf(teamId){
    const memIds=membersOf(teamId).map(m=>m.user_id);
    return allUsers.filter(u=>!memIds.includes(u.id));
  }
}
