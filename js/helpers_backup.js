function getWeekDates(off) {
  off = off || 0;
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate()-((now.getDay()+6)%7)+off*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
}
function getWeekNumber(date) {
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dn=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-dn);
  const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-ys)/86400000)+1)/7);
}
function formatDate(d) {
  return d.getDate()+" "+["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"][d.getMonth()];
}
function getMondayStr(date) {
  const d = new Date(date);
  d.setDate(d.getDate()-((d.getDay()+6)%7));
  return d.toISOString().split("T")[0];
}
function normalizeTask(t,teamIds) {
  let userIds=null;
  if(t.user_id!==null&&t.user_id!==undefined&&t.user_id!==""){
    userIds=String(t.user_id).split(",").map(s=>parseInt(s)).filter(n=>!isNaN(n));
  }
  return {
    id:t.id,title:t.title,userIds,category:t.category,
    dayIndex:t.day_index,done:t.done,deadline:t.deadline||"",
    weekMonday:t.week_monday||null,teamIds:teamIds||[],
    notes:t.notes||"",
    recurrenceType:t.recurrence_type||null,
    recurrenceDay:t.recurrence_day!=null?t.recurrence_day:null,
    recurrenceEndDate:t.recurrence_end_date||null,
    recurrenceLimit:t.recurrence_limit||null,
    isRecurring:!!t.recurrence_type,
  };
}

// Bereken of een terugkerende taak in een gegeven week-maandag moet verschijnen
function recurringTaskBelongsToWeek(task, mondayStr) {
  if(!task.recurrenceType || task.recurrenceType==="none") return false;
  const mon = new Date(mondayStr);
  const orig = new Date(task.weekMonday);
  if(mon <= orig) return false;

  // Check einddatum (recurrenceEndDate)
  if(task.recurrenceEndDate) {
    const endDate = new Date(task.recurrenceEndDate);
    if(mon > endDate) return false;
  }

  // Bereken de index van deze herhaling voor recurrenceLimit
  let occurrenceIndex = 0;

  if(task.recurrenceType==="weekly") {
    const diffDays = Math.round((mon - orig) / 86400000);
    occurrenceIndex = Math.round(diffDays / 7);
  }
  else if(task.recurrenceType==="biweekly") {
    const diffDays = Math.round((mon - orig) / 86400000);
    const diffWeeks = diffDays / 7;
    if(diffWeeks % 2 !== 0) return false;
    occurrenceIndex = Math.round(diffWeeks / 2);
  }
  else if(task.recurrenceType==="monthly" || task.recurrenceType==="monthly_last") {
    const months = (mon.getFullYear() - orig.getFullYear()) * 12 + (mon.getMonth() - orig.getMonth());
    occurrenceIndex = months;
    
    let matches = false;
    if(task.recurrenceType==="monthly") {
      for(let i=0;i<7;i++){
        const d=new Date(mon); d.setDate(mon.getDate()+i);
        if(d.getDate()===task.recurrenceDay) { matches = true; break; }
      }
    } else {
      for(let i=0;i<7;i++){
        const d=new Date(mon); d.setDate(mon.getDate()+i);
        const dayOfWeek=(d.getDay()+6)%7;
        if(dayOfWeek===task.dayIndex){
          const nextWeek=new Date(d); nextWeek.setDate(d.getDate()+7);
          if(nextWeek.getMonth()!==d.getMonth()) { matches = true; break; }
        }
      }
    }
    if(!matches) return false;
  }

  // Check aantal keer (recurrenceLimit)
  // De originele taak is index 0, de eerste herhaling is index 1.
  // Als limit = 3, dan mogen index 0, 1 en 2 verschijnen.
  if(task.recurrenceLimit && occurrenceIndex >= task.recurrenceLimit) {
    return false;
  }

  return true;
}
