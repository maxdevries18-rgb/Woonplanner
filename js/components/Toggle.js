function Toggle({value,onChange}) {
  return <button className={`toggle${value?" on":""}`} onClick={()=>onChange(!value)} />;
}
