function BoodschappenScherm({onClose,currentUser,myTeamIds,allTeams,showNotif,isView=false}) {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [newName,setNewName]=useState("");
  const [newQty,setNewQty]=useState("");
  const [filterTeam,setFilterTeam]=useState(myTeamIds[0]||null);
  const [saving,setSaving]=useState(false);
  const myTeams=allTeams.filter(t=>myTeamIds.includes(t.id));

  useEffect(()=>{laad();},[filterTeam]);

  async function laad(){
    setLoading(true);
    let q=supabase.from("shopping_items").select("*").order("created_at",{ascending:true});
    if(filterTeam) q=q.eq("team_id",filterTeam);
    else q=q.is("team_id",null);
    const {data}=await q;
    setItems(data||[]);
    setLoading(false);
  }

  async function voegToe(){
    if(!newName.trim()) return;
    setSaving(true);
    await supabase.from("shopping_items").insert([{name:newName.trim(),quantity:newQty.trim(),checked:false,team_id:filterTeam||null,added_by:currentUser.id}]);
    setNewName(""); setNewQty(""); setSaving(false); laad();
  }

  async function toggleItem(id,cur){
    setItems(prev=>prev.map(i=>i.id===id?{...i,checked:!cur}:i));
    await supabase.from("shopping_items").update({checked:!cur}).eq("id",id);
  }

  async function verwijderItem(id){
    setItems(prev=>prev.filter(i=>i.id!==id));
    await supabase.from("shopping_items").delete().eq("id",id);
  }

  async function leegMaken(){
    const checkedIds=items.filter(i=>i.checked).map(i=>i.id);
    if(!checkedIds.length) return;
    await supabase.from("shopping_items").delete().in("id",checkedIds);
    setItems(prev=>prev.filter(i=>!i.checked));
    showNotif("🗑️ Afgevinkte items verwijderd","");
  }

  function exportToWhatsApp(){
    const open=items.filter(i=>!i.checked);
    if(!open.length) return;
    const teamName = filterTeam ? myTeams.find(t=>t.id===filterTeam)?.name : "Persoonlijk";
    let text = `🛒 *Boodschappenlijst (${teamName})*\n\n`;
    open.forEach(i => {
      text += `• ${i.name}${i.quantity ? ` (${i.quantity})` : ""}\n`;
    });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  const open=items.filter(i=>!i.checked);
  const gedaan=items.filter(i=>i.checked);

  const content = (
    <>
        {myTeams.length>0&&(
          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>setFilterTeam(null)} style={{background:filterTeam===null?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)",border:filterTeam===null?"1px solid rgba(255,255,255,0.25)":"1px solid transparent",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>👤 Persoonlijk</button>
            {myTeams.map(t=>{const tc=t.color||"#7c7cff";const active=filterTeam===t.id;return(
              <button key={t.id} onClick={()=>setFilterTeam(t.id)} style={{background:active?tc+"33":"rgba(255,255,255,0.05)",border:active?`1px solid ${tc}`:"1px solid transparent",borderRadius:20,padding:"5px 12px",color:active?tc:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,cursor:"pointer"}}>👥 {t.name}</button>
            );})}
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          <input placeholder="Item toevoegen..." value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&voegToe()} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"11px 14px",color:"#fff",fontSize:16,outline:"none"}}/>
          <div style={{display:"flex",gap:8}}>
            <input placeholder="Aantal (optioneel)" value={newQty} onChange={e=>setNewQty(e.target.value)} onKeyDown={e=>e.key==="Enter"&&voegToe()} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"11px 14px",color:"#fff",fontSize:16,outline:"none"}}/>
            <button onClick={voegToe} disabled={saving} style={{background:"linear-gradient(135deg,#4ECDC4,#2ecc71)",border:"none",borderRadius:12,padding:"11px 20px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>+ Toevoegen</button>
          </div>
        </div>
        {loading&&<div style={{display:"flex",justifyContent:"center",padding:30}}><div className="spinner"/></div>}
        {!loading&&(
          <div>
            {open.length>0&&(
              <div style={{marginBottom:16}}>
                {open.map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 14px",marginBottom:6}}>
                    <button onClick={()=>toggleItem(item.id,item.checked)} style={{width:22,height:22,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",background:"transparent",cursor:"pointer",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:14,fontWeight:600}}>{item.name}</span>
                      {item.quantity&&<span style={{fontSize:12,opacity:0.5,marginLeft:8}}>{item.quantity}</span>}
                    </div>
                    <button onClick={()=>verwijderItem(item.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {gedaan.length>0&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <p style={{fontSize:11,fontWeight:700,opacity:0.4,letterSpacing:1,textTransform:"uppercase"}}>Afgevinkt ({gedaan.length})</p>
                  <button onClick={leegMaken} style={{background:"rgba(255,80,80,0.12)",border:"none",borderRadius:8,padding:"4px 10px",color:"#FF6B6B",fontSize:12,fontWeight:700,cursor:"pointer"}}>Verwijder afgevinkt</button>
                </div>
                {gedaan.map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.02)",borderRadius:12,padding:"10px 14px",marginBottom:6,opacity:0.5}}>
                    <button onClick={()=>toggleItem(item.id,item.checked)} style={{width:22,height:22,borderRadius:"50%",border:"2px solid #4ECDC4",background:"#4ECDC4",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>✓</button>
                    <span style={{fontSize:14,textDecoration:"line-through",flex:1}}>{item.name}{item.quantity&&<span style={{opacity:0.6,marginLeft:8,fontSize:12}}>{item.quantity}</span>}</span>
                    <button onClick={()=>verwijderItem(item.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {items.length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",opacity:0.3}}> 
                <div style={{fontSize:40,marginBottom:12}}>🛒</div>
                <div style={{fontSize:14,fontWeight:600}}>Lijst is leeg</div>
              </div>
            )}
          </div>
        )}
    </>
  );

  if(isView){
    return (
      <div className="slide-in" style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Space Mono',monospace"}}>🛒 Boodschappen</h2>
          {open.length>0 && (
            <button onClick={exportToWhatsApp} style={{background:"rgba(37,211,102,0.15)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:8,padding:"6px 12px",color:"#25D366",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>📲</span> WhatsApp
            </button>
          )}
        </div>
        {content}
      </div>
    );
  }

  return (
    <Modal 
      title={
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span>🛒 Boodschappenlijst</span>
          {open.length>0 && (
            <button onClick={exportToWhatsApp} style={{background:"rgba(37,211,102,0.15)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:8,padding:"4px 10px",color:"#25D366",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:14}}>📲</span> Deel
            </button>
          )}
        </div>
      } 
      onClose={onClose} 
      maxWidth={500}
    >
        {content}
    </Modal>
  );
}
