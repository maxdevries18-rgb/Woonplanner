function TaskCard({task,onToggle,onDelete,onEdit,showDay,categories,allUsers,allTeams,currentUser}) {
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [showNotes,setShowNotes]=useState(false);
  const taskUsers=(task.userIds===null?[{id:null,color:"#888",username:"Iedereen"}]:(task.userIds||[]).map(id=>allUsers.find(u=>u.id==id)).filter(Boolean));
  const taskTeams=(task.teamIds||[]).map(id=>allTeams.find(t=>t.id==id)).filter(Boolean);
  const hasRealUser=task.userIds!==null&&(task.userIds||[]).length>0;
  const pc=hasRealUser?(taskUsers[0]?.color||"#888"):(taskTeams[0]?.color||"#888");
  const cat=categories.find(c=>c.id===task.category)||{icon:"🏷️"};
  const wd=getWeekDates(0);
  const canEdit=currentUser.is_admin||(task.userIds?.includes(currentUser.id)?currentUser.can_edit_own_tasks!==false:currentUser.can_edit_others_tasks!==false);
  const canDelete=currentUser.is_admin||(task.userIds?.includes(currentUser.id)?currentUser.can_delete_own_tasks!==false:currentUser.can_delete_others_tasks!==false);
  
  return (
    <div className="task-card" style={{background:`linear-gradient(135deg,${pc}11,${pc}06)`,border:confirmDelete?"1px solid rgba(255,80,80,0.4)":`1px solid ${pc}33`,borderLeft:`4px solid ${confirmDelete?"#FF6B6B":pc}`,borderRadius:14,padding:"14px 16px",opacity:task.done?0.55:1}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>onToggle(task.id,task.done)} style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:task.done?pc:"transparent",border:`2px solid ${pc}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>{task.done?"✓":""}</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:14,color:"#f0f0f0",textDecoration:task.done?"line-through":"none"}}>{cat.icon} {task.title}</span>
            {task.isRecurring&&<span style={{fontSize:12,opacity:0.5}} title={task.isVirtual?"Herhaalde instantie":"Originele herhaal-taak"}>🔁</span>}
            {task.notes&&<button onClick={()=>setShowNotes(s=>!s)} style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"1px 7px",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{showNotes?"▲":"📝"}</button>}
          </div>
          {confirmDelete?(
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <button onClick={()=>onDelete(task.id)} style={{background:"rgba(255,80,80,0.25)",border:"1px solid rgba(255,80,80,0.4)",borderRadius:8,padding:"4px 12px",color:"#FF6B6B",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {task.isVirtual ? "Hele reeks verwijderen" : "Ja, verwijder"}
              </button>
              <button onClick={()=>setConfirmDelete(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"4px 12px",color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,cursor:"pointer"}}>Annuleer</button>
            </div>
          ):(
            <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
              {taskUsers.map(u=><span key={u.id ?? "all"} style={{fontSize:11,background:u.color+"22",color:u.color,borderRadius:6,padding:"2px 7px",fontWeight:700}}>{u.username[0]?.toUpperCase()} {u.username}</span>)}
              {taskTeams.map(t=>{const tc=t.color||"#7c7cff";return <span key={t.id} style={{fontSize:11,background:tc+"22",color:tc,borderRadius:6,padding:"2px 7px",fontWeight:700}}>👥 {t.name}</span>;})}
              {showDay&&<span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{DAYS[task.dayIndex]} {formatDate(wd[task.dayIndex])}</span>}
              {task.deadline&&<span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{task.deadline==="hele_dag"?"🌅 Hele dag":`🕐 ${task.deadline}`}</span>}
              {task.isVirtual && <span style={{fontSize:10,background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",padding:"1px 5px",borderRadius:4,fontStyle:"italic"}}>Herhaling</span>}
            </div>
          )}
        </div>
        {!confirmDelete&&(
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {canEdit&&<button onClick={()=>onEdit(task)} title={task.isVirtual?"Origineel bewerken":"Bewerken"} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:task.isVirtual?"#FFD93D":"rgba(255,255,255,0.3)",fontSize:13}}>{task.isVirtual?"🔁 ✏️":"✏️"}</button>}
            {canDelete&&<button onClick={()=>setConfirmDelete(true)} title={task.isVirtual?"Reeks verwijderen":"Verwijderen"} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:14}}>✕</button>}
          </div>
        )}
      </div>
      {showNotes&&task.notes&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.07)",fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{task.notes}</div>
      )}
    </div>
  );
}
