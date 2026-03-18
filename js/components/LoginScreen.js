function PinInput({length=4,value="",onChange}) {
  const refs=Array.from({length},()=>useRef(null));
  function handleChange(i,e){
    const v=e.target.value.replace(/\D/g,"");
    if(!v) return;
    const newPin=value.split("");
    newPin[i]=v[v.length-1];
    const joined=newPin.join("");
    onChange(joined);
    if(i<length-1) refs[i+1].current?.focus();
  }
  function handleKey(i,e){
    if(e.key==="Backspace"&&!value[i]&&i>0){
      const newPin=value.split("");
      newPin[i-1]="";
      onChange(newPin.join(""));
      refs[i-1].current?.focus();
    }
  }
  return (
    <div style={{display:"flex",gap:10,justifyContent:"center"}}>
      {Array.from({length},(_,i)=>(
        <input key={i} ref={refs[i]} type="tel" inputMode="numeric" maxLength={1}
          value={value[i]||""} onChange={e=>handleChange(i,e)} onKeyDown={e=>handleKey(i,e)}
          autoFocus={i===0}
          style={{width:48,height:56,textAlign:"center",fontSize:24,fontWeight:900,fontFamily:"'Space Mono',monospace",
            background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,color:"#fff",outline:"none",caretColor:"transparent"}}
        />
      ))}
    </div>
  );
}

function LoginScreen({onLogin}) {
  const [mode,setMode]=useState("kies");
  const [username,setUsername]=useState("");
  const [color,setColor]=useState(USER_COLORS[0]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [loadingUsers,setLoadingUsers]=useState(true);
  const [selectedUser,setSelectedUser]=useState(null);
  const [pin,setPin]=useState("");
  const [newPin,setNewPin]=useState("");
  const [confirmPin,setConfirmPin]=useState("");
  const [regPin,setRegPin]=useState("");
  const [regConfirmPin,setRegConfirmPin]=useState("");

  useEffect(()=>{loadUsers();},[]);
  async function loadUsers(){
    setLoadingUsers(true);
    const {data}=await supabase.from("users").select("*").order("created_at");
    setUsers(data||[]); setLoadingUsers(false);
  }

  function selectUser(u){
    setSelectedUser(u);
    setPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    if(u.pin){
      setMode("pin");
    } else {
      setMode("setup_pin");
    }
  }

  async function checkPin(){
    if(pin.length<4) return;
    setLoading(true); setError("");
    if(pin===selectedUser.pin){
      localStorage.setItem("woonplanner_user_id",selectedUser.id);
      onLogin(selectedUser);
    } else {
      setError("Onjuiste PIN");
      setPin("");
    }
    setLoading(false);
  }

  async function saveNewPin(){
    if(newPin.length<4) return setError("Voer 4 cijfers in");
    if(newPin!==confirmPin) return setError("PINs komen niet overeen");
    setLoading(true); setError("");
    const {error:err}=await supabase.from("users").update({pin:newPin}).eq("id",selectedUser.id);
    if(err){setLoading(false);return setError("Opslaan mislukt");}
    localStorage.setItem("woonplanner_user_id",selectedUser.id);
    onLogin({...selectedUser,pin:newPin});
    setLoading(false);
  }

  async function registreer(){
    if(!username.trim()) return setError("Vul een gebruikersnaam in");
    if(regPin.length<4) return setError("Voer een 4-cijferige PIN in");
    if(regPin!==regConfirmPin) return setError("PINs komen niet overeen");
    setLoading(true); setError("");
    const {data:b}=await supabase.from("users").select("id").eq("username",username.trim()).single();
    if(b){setLoading(false);return setError("Deze naam is al bezet");}
    const isFirst=users.length===0;
    const {data,error:err}=await supabase.from("users").insert([{username:username.trim(),color,is_admin:isFirst,pin:regPin}]).select().single();
    if(err){setLoading(false);return setError("Er ging iets mis");}
    localStorage.setItem("woonplanner_user_id",data.id);
    onLogin(data); setLoading(false);
  }

  useEffect(()=>{
    if(mode==="pin"&&pin.length===4) checkPin();
  },[pin]);

  const takenKleur=users.map(u=>u.color);
  const beschikbaar=USER_COLORS.filter(c=>!takenKleur.includes(c));
  const inputStyle={width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:16,marginBottom:20,outline:"none"};

  function goBack(){
    setMode("kies");
    setSelectedUser(null);
    setPin("");
    setNewPin("");
    setConfirmPin("");
    setRegPin("");
    setRegConfirmPin("");
    setError("");
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
      <div className="slide-in" style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:56,marginBottom:12}}>🏠</div>
          <h1 style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-1,fontFamily:"'Space Mono',monospace"}}>WoonPlanner</h1>
          <p style={{color:"rgba(255,255,255,0.4)",marginTop:8,fontSize:14}}>Plan samen je week</p>
        </div>
        {mode==="kies"&&(
          <div>
            {loadingUsers?<div style={{display:"flex",justifyContent:"center",padding:40}}><div className="spinner"/></div>:(
              <div>
                {users.length>0&&(
                  <div style={{marginBottom:24}}>
                    <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Wie ben jij?</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {users.map(u=>(
                        <button key={u.id} onClick={()=>selectUser(u)} style={{background:`linear-gradient(135deg,${u.color}22,${u.color}11)`,border:`1px solid ${u.color}44`,borderLeft:`4px solid ${u.color}`,borderRadius:14,padding:"16px 20px",color:"#fff",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                          <div style={{width:36,height:36,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,flexShrink:0}}>{u.username[0].toUpperCase()}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:16}}>{u.username}</div>
                            {u.is_admin&&<div style={{fontSize:11,color:"#FFD93D",marginTop:2}}>👑 Beheerder</div>}
                          </div>
                          <div style={{fontSize:18,opacity:0.3}}>🔒</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={()=>{setColor(beschikbaar[0]||USER_COLORS[0]);setMode("nieuw");setError("");}} style={{width:"100%",padding:"14px",background:"rgba(255,255,255,0.06)",border:"1px dashed rgba(255,255,255,0.2)",borderRadius:14,color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:14,fontWeight:600}}>+ Nieuw account aanmaken</button>
              </div>
            )}
          </div>
        )}
        {mode==="pin"&&selectedUser&&(
          <div className="slide-in" style={{textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:selectedUser.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,margin:"0 auto 16px"}}>{selectedUser.username[0].toUpperCase()}</div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{selectedUser.username}</h2>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,marginBottom:24}}>Voer je PIN in</p>
            <PinInput value={pin} onChange={setPin}/>
            {error&&<p style={{color:"#FF6B6B",fontSize:13,marginTop:16,fontWeight:600}}>⚠️ {error}</p>}
            {loading&&<div style={{display:"flex",justifyContent:"center",marginTop:16}}><div className="spinner"/></div>}
            <button onClick={goBack} style={{marginTop:24,padding:"12px",background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14}}>← Terug</button>
          </div>
        )}
        {mode==="setup_pin"&&selectedUser&&(
          <div className="slide-in" style={{textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:selectedUser.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,margin:"0 auto 16px"}}>{selectedUser.username[0].toUpperCase()}</div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{selectedUser.username}</h2>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,marginBottom:24}}>Stel een 4-cijferige PIN in</p>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Kies een PIN</p>
            <PinInput value={newPin} onChange={setNewPin}/>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10,marginTop:20}}>Herhaal je PIN</p>
            <PinInput value={confirmPin} onChange={setConfirmPin}/>
            {error&&<p style={{color:"#FF6B6B",fontSize:13,marginTop:16,fontWeight:600}}>⚠️ {error}</p>}
            <button onClick={saveNewPin} disabled={loading} style={{width:"100%",marginTop:24,padding:"15px",background:loading?"rgba(255,255,255,0.1)":`linear-gradient(135deg,${selectedUser.color},${selectedUser.color}bb)`,color:"#fff",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer"}}>{loading?"Opslaan...":"PIN instellen →"}</button>
            <button onClick={goBack} style={{marginTop:12,padding:"12px",background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14}}>← Terug</button>
          </div>
        )}
        {mode==="nieuw"&&(
          <div className="slide-in">
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Nieuw account</p>
            <input placeholder="Jouw naam..." value={username} onChange={e=>{setUsername(e.target.value);setError("");}} autoFocus style={inputStyle}/>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Kies jouw kleur</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
              {USER_COLORS.map(c=>{const bezet=takenKleur.includes(c);return(<div key={c} onClick={()=>!bezet&&setColor(c)} className={`color-swatch${color===c?" selected":""}`} style={{background:c,opacity:bezet?0.25:1,cursor:bezet?"not-allowed":"pointer",position:"relative"}}>{bezet&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✕</span>}</div>);})}
            </div>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Kies een PIN (4 cijfers)</p>
            <PinInput value={regPin} onChange={setRegPin}/>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10,marginTop:16}}>Herhaal je PIN</p>
            <PinInput value={regConfirmPin} onChange={setRegConfirmPin}/>
            {error&&<p style={{color:"#FF6B6B",fontSize:13,marginTop:16,marginBottom:12,fontWeight:600}}>⚠️ {error}</p>}
            <button onClick={registreer} disabled={loading} style={{width:"100%",marginTop:20,padding:"15px",background:loading?"rgba(255,255,255,0.1)":`linear-gradient(135deg,${color},${color}bb)`,color:"#fff",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",marginBottom:12}}>{loading?"Aanmaken...":"Account aanmaken →"}</button>
            {users.length>0&&<button onClick={goBack} style={{width:"100%",padding:"12px",background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14}}>← Terug</button>}
          </div>
        )}
      </div>
    </div>
  );
}
