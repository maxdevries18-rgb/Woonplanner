const { useState, useEffect, useCallback, useMemo, useRef } = React;

const SUPABASE_URL = 'https://rywkfqjatnrrmsuhupai.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fhfWC4TvyS_uZAF1NDiPYg_bGtebyQ5';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const USER_COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#4D96FF","#FF6FC8","#FF9A3C","#A78BFA","#F72585","#4CC9F0"];
const TEAM_COLORS = ["#7c7cff","#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#FF9A3C","#A78BFA","#FF6FC8"];
const DEFAULT_CATEGORIES = [
  {id:"household",label:"Huishouden",icon:"🧹"},
  {id:"appointment",label:"Afspraken",icon:"📅"},
  {id:"work",label:"Werk/Studie",icon:"💼"},
  {id:"sport",label:"Sport & Hobby",icon:"⚽"},
];
const TIME_OPTIONS = [{value:"hele_dag",label:"🌅 Hele dag"},...["07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22"].flatMap(h=>[{value:`${h}:00`,label:`${h}:00`},{value:`${h}:30`,label:`${h}:30`}])];
const LABEL_ICONS = ["🏷️","🧹","📅","💼","⚽","🎨","🎵","🍕","💪","📚","🚗","🐶","🌿","🛒","💊","🎮","✈️","💰","🏠","👥"];
const DAYS = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAYS_FULL = ["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
const RECURRENCE_OPTIONS = [
  {value:"none",label:"Niet herhalen"},
  {value:"weekly",label:"Elke week"},
  {value:"biweekly",label:"Om de 2 weken"},
  {value:"monthly",label:"Elke maand (zelfde datum)"},
  {value:"monthly_last",label:"Laatste van de maand (zelfde dag)"},
];
const THEME_COLORS = [
  { id: "blue", name: "Deep Blue", color: "#1a1a2e", gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", panel: "linear-gradient(180deg, #1e1e3f, #16163a)" },
  { id: "midnight", name: "Midnight", color: "#050505", gradient: "linear-gradient(135deg, #050505 0%, #111111 50%, #1a1a1a 100%)", panel: "linear-gradient(180deg, #1a1a1a, #0a0a0a)" },
  { id: "forest", name: "Forest", color: "#0a1f0a", gradient: "linear-gradient(135deg, #0a1f0a 0%, #112a11 50%, #1a3a1a 100%)", panel: "linear-gradient(180deg, #112a11, #0a1f0a)" },
  { id: "aubergine", name: "Aubergine", color: "#1a0a1f", gradient: "linear-gradient(135deg, #1a0a1f 0%, #2a112a 50%, #3a1a3a 100%)", panel: "linear-gradient(180deg, #2a112a, #1a0a1f)" },
  { id: "ocean", name: "Ocean", color: "#0a1f2e", gradient: "linear-gradient(135deg, #0a1f2e 0%, #112a3a 50%, #1a3a4a 100%)", panel: "linear-gradient(180deg, #112a3a, #0a1f2e)" },
];

const RECHTEN = [
  {key:"can_create_tasks",label:"Taken aanmaken"},
  {key:"can_edit_own_tasks",label:"Eigen taken bewerken"},
  {key:"can_edit_others_tasks",label:"Taken van anderen bewerken"},
  {key:"can_delete_own_tasks",label:"Eigen taken verwijderen"},
  {key:"can_delete_others_tasks",label:"Taken van anderen verwijderen"},
  {key:"can_create_teams",label:"Teams aanmaken"},
  {key:"can_delete_teams",label:"Teams verwijderen"},
  {key:"can_view_users",label:"Gebruikers inzien"},
];
