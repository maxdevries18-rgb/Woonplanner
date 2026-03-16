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
    isRecurring:!!t.recurrence_type,
  };
}

// Bereken of een terugkerende taak in een gegeven week-maandag moet verschijnen
function recurringTaskBelongsToWeek(task, mondayStr) {
  if(!task.recurrenceType || task.recurrenceType==="none") return false;
  const mon = new Date(mondayStr);
  const orig = new Date(task.weekMonday);
  if(mon <= orig) return false;

  if(task.recurrenceType==="weekly") {
    // Elke week op dezelfde dag (dayIndex)
    return true;
  }
  if(task.recurrenceType==="biweekly") {
    const diffDays = Math.round((mon - orig) / 86400000);
    const diffWeeks = diffDays / 7;
    return diffWeeks % 2 === 0;
  }
  if(task.recurrenceType==="monthly") {
    // Zelfde dag van de maand - check of die dag in deze week valt
    for(let i=0;i<7;i++){
      const d=new Date(mon); d.setDate(mon.getDate()+i);
      if(d.getDate()===task.recurrenceDay) return true;
    }
    return false;
  }
  if(task.recurrenceType==="monthly_last") {
    // Laatste [weekdag] van de maand
    for(let i=0;i<7;i++){
      const d=new Date(mon); d.setDate(mon.getDate()+i);
      const dayOfWeek=(d.getDay()+6)%7;
      if(dayOfWeek===task.dayIndex){
        const nextWeek=new Date(d); nextWeek.setDate(d.getDate()+7);
        if(nextWeek.getMonth()!==d.getMonth()) return true;
      }
    }
    return false;
  }
  return false;
}
