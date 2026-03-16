function Modal({ title, children, onClose, maxWidth = 500 }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:600,backdropFilter:"blur(4px)"}}>
      <div className="slide-in" onClick={e=>e.stopPropagation()} style={{background:"var(--panel-bg)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",width:"100%",maxWidth,maxHeight:"92vh",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:18,fontWeight:900,color:"#f0f0f0",fontFamily:"'Space Mono',monospace"}}>{title}</h3>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:13}}>✕ Sluiten</button>
        </div>
        {children}
      </div>
    </div>
  );
}
