function HamburgerMenu({currentUser,pendingCount,theme,onThemeChange,onOpenBeheer,onOpenLabels,onOpenStats,onOpenBoodschappen,onWissel,onClose}) {
  const menuItems = [
    {icon:"⚙️", label:"Teams beheren", badge:pendingCount>0?pendingCount:null, onClick:()=>{onOpenBeheer("teams");onClose();}},
    {icon:"👤", label:"Gebruikers beheren", show:currentUser.is_admin||currentUser.can_view_users, onClick:()=>{onOpenBeheer("gebruikers");onClose();}},
    {icon:"🏷️", label:"Labels beheren", onClick:()=>{onOpenLabels();onClose();}},
    {icon:"📊", label:"Statistieken", onClick:()=>{onOpenStats();onClose();}},
    {icon:"🛒", label:"Boodschappenlijst", onClick:()=>{onOpenBoodschappen();onClose();}},
  ];
  return (
    <div>
      <div className="menu-overlay" onClick={onClose}/>
      <div className="menu-panel">
        <div style={{padding:"calc(20px + env(safe-area-inset-top)) 20px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:currentUser.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,flexShrink:0}}>{currentUser.username[0].toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>{currentUser.username}</div>
              {currentUser.is_admin&&<div style={{fontSize:11,color:"#FFD93D",marginTop:2}}>👑 Beheerder</div>}
            </div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 0"}}>
          {menuItems.filter(m=>m.show!==false).map((item,i)=>(
            <button key={i} onClick={item.onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"13px 20px",background:"transparent",border:"none",color:"#f0f0f0",cursor:"pointer",textAlign:"left",transition:"background 0.15s",fontSize:15,fontWeight:600,position:"relative"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{item.icon}</span>
              <span style={{flex:1}}>{item.label}</span>
              {item.badge&&<span style={{background:"#FF6B6B",color:"#fff",borderRadius:20,padding:"2px 7px",fontSize:11,fontWeight:900}}>{item.badge}</span>}
            </button>
          ))}
          <div style={{marginTop:12,padding:"10px 20px"}}>
            <div style={{fontSize:11,fontWeight:700,opacity:0.4,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Uiterlijk</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {THEME_COLORS.map(t=>(
                <button key={t.id} onClick={()=>onThemeChange(t)} title={t.name} style={{width:28,height:28,borderRadius:"50%",background:t.gradient,border:theme.id===t.id?"2px solid #fff":"2px solid rgba(255,255,255,0.1)",cursor:"pointer",padding:0,transition:"transform 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
              ))}
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"12px 20px",paddingBottom:"calc(12px + env(safe-area-inset-bottom))"}}>
          <button onClick={()=>{onWissel();onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"11px 0",background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,fontWeight:600}}>
            <span style={{fontSize:18,width:28,textAlign:"center"}}>👋</span>
            Wissel van gebruiker
          </button>
        </div>
      </div>
    </div>
  );
}
