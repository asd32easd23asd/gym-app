(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GymCore=api;})(globalThis,function(){
 'use strict';
 const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const today=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const parse=s=>/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(String(s).trim())?Number(String(s).trim().replace(',','.')):NaN;
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(new Date(s+'T12:00:00'))&&today(new Date(s+'T12:00:00'))===s;
 const validTime=s=>typeof s==='string'&&(s===''||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s));
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return today(d);};
 const weekday=s=>(new Date(s+'T12:00:00').getDay()+6)%7;
 const week=s=>Array.from({length:7},(_,i)=>addDays(s,i-weekday(s)));
 const emptyDay=()=>({name:'',time:'18:00',exercises:[],reminders:[]});
 function initial(){return {schema:2,profile:{name:'',heightCm:null},settings:{notifications:false},plan:{name:'Mijn trainingsweek',days:Array.from({length:7},emptyDay)},sessions:{},notes:{},products:[],usages:[],measurements:[],photos:[],reminders:[]};}
 function sessionFor(data,date){if(data.sessions[date])return data.sessions[date];const t=data.plan.days[weekday(date)];return {name:t.name,time:t.time,exercises:t.exercises.map(e=>({id:e.id,name:e.name,detail:e.detail||'',sets:Array.from({length:e.sets},(_,i)=>({id:'planned-'+date+'-'+e.id+'-'+i,kg:e.kg,reps:e.reps,done:false}))}))};}
 function ensureSession(data,date){if(!data.sessions[date])data.sessions[date]=sessionFor(data,date);return data.sessions[date];}
 function records(data){const result=new Map();Object.entries(data.sessions).forEach(([date,s])=>s.exercises.forEach(e=>e.sets.filter(x=>x.done&&x.kg>0).forEach(x=>{const k=e.name.trim().toLocaleLowerCase(),old=result.get(k);if(!old||x.kg>old.kg||(x.kg===old.kg&&x.reps>old.reps))result.set(k,{name:e.name,kg:x.kg,reps:x.reps,date});})));return [...result.values()].sort((a,b)=>b.kg-a.kg);}
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim());
 const idValid=(v,max=128)=>typeof v==='string'&&v.length<=max&&/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(v);
 const quantity=(v,zero=false,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v<=max&&(zero?v>=0:v>0);
 const units=new Set(['g','mg','ml','l','scoop','stuk','capsule','druppel','custom']);
 const fail=message=>{throw Error(message);};
 function ids(list,label,max=128){const seen=new Set();for(const item of list){if(!object(item)||!idValid(item.id,max)||seen.has(item.id))fail('Ongeldig of dubbel nummer bij '+label+'.');seen.add(item.id);}return seen;}
 function reminder(r,dated=false){if(!object(r)||!text(r.text,120,true)||!validTime(r.time))fail('Ongeldige herinnering.');if(dated&&(!validDate(r.date)||typeof r.done!=='boolean'||(r.templateId!==undefined&&(!idValid(r.templateId,160)||!r.templateId.startsWith('template:')))))fail('Ongeldige datum of status van herinnering.');}
 function validate(d){
  if(!object(d)||d.schema!==2||!object(d.profile)||!object(d.settings)||!object(d.plan)||!Array.isArray(d.plan.days)||d.plan.days.length!==7)fail('Dit is geen geldige Gym Planner-back-up.');
  for(const k of ['products','usages','measurements','photos','reminders'])if(!Array.isArray(d[k]))fail('Ongeldige gegevens: '+k);
  if(!object(d.sessions)||!object(d.notes))fail('Ongeldige trainingsgegevens.');
  if(!text(d.profile.name,80))fail('Ongeldige profielnaam.');
  if(d.profile.heightCm!==null&&!quantity(d.profile.heightCm,false,300))fail('Ongeldige lengte.');
  if(typeof d.settings.notifications!=='boolean')fail('Ongeldige instelling voor herinneringen.');
  if(!text(d.plan.name,80,true))fail('Ongeldige naam van het weekplan.');
  for(const day of d.plan.days){
   if(!object(day)||!text(day.name,60)||!validTime(day.time)||!Array.isArray(day.exercises)||!Array.isArray(day.reminders))fail('Ongeldig weekplan.');
   ids(day.exercises,'oefeningen');ids(day.reminders,'wekelijkse herinneringen');
   for(const ex of day.exercises)if(!text(ex.name,80,true)||(ex.detail!==undefined&&!text(ex.detail,150))||!Number.isInteger(ex.sets)||ex.sets<1||ex.sets>30||!Number.isInteger(ex.reps)||ex.reps<1||ex.reps>999||!quantity(ex.kg,true))fail('Ongeldige oefening in je plan.');
   day.reminders.forEach(r=>reminder(r));
  }
  for(const [date,s] of Object.entries(d.sessions)){
   if(!validDate(date)||!object(s)||!text(s.name,60)||!validTime(s.time)||!Array.isArray(s.exercises))fail('Ongeldige trainingsdatum of training.');
   ids(s.exercises,'trainingsoefeningen');const setIDs=new Set();
   for(const ex of s.exercises){
    if(!text(ex.name,80,true)||(ex.detail!==undefined&&!text(ex.detail,150))||!Array.isArray(ex.sets)||ex.sets.length<1||ex.sets.length>30)fail('Ongeldige training.');
    ids(ex.sets,'sets',256);
    for(const x of ex.sets){if(setIDs.has(x.id)||!quantity(x.kg,true)||!Number.isInteger(x.reps)||x.reps<1||x.reps>999||typeof x.done!=='boolean')fail('Ongeldige of dubbele set.');setIDs.add(x.id);}
   }
  }
  for(const [date,note] of Object.entries(d.notes))if(!validDate(date)||!text(note,2000))fail('Ongeldige dagnotitie.');
  ids(d.measurements,'gewichtsmetingen');
  for(const m of d.measurements)if(!validDate(m.date)||!quantity(m.weight,false,1000)||!text(m.note,300))fail('Ongeldige gewichtsmeting.');
  const photoIDs=new Set();for(const p of d.photos){if(!object(p)||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||photoIDs.has(p.id)||!validDate(p.date)||!['Voorkant','Zijkant','Achterkant','Overig'].includes(p.angle)||!text(p.note,300)||(p.weight!==null&&!quantity(p.weight,false,1000)))fail('Ongeldige fotovermelding.');photoIDs.add(p.id);}
  ids(d.reminders,'herinneringen');const templateDates=new Set();
  for(const r of d.reminders){reminder(r,true);if(r.templateId){const key=r.date+'|'+r.templateId;if(templateDates.has(key))fail('Dubbele wekelijkse herinnering op dezelfde datum.');templateDates.add(key);}}
  const productIDs=ids(d.products,'producten');ids(d.usages,'gebruiksregistraties');
  for(const p of d.products){
   if(!text(p.name,80,true)||!text(p.detail,160)||!text(p.customLabel,24)||(p.barcode!==undefined&&!text(p.barcode,64))||!units.has(p.base)||!units.has(p.entryUnit)||!object(p.ratios)||!quantity(p.stock,true)||!quantity(p.total,true)||p.stock>p.total||!quantity(p.defaultAmount))fail('Ongeldige productgegevens.');
   for(const [unit,value] of Object.entries(p.ratios))if(!units.has(unit)||!quantity(value))fail('Ongeldige productomrekening.');
   if((p.base==='custom'||p.entryUnit==='custom'||Object.prototype.hasOwnProperty.call(p.ratios,'custom'))&&!p.customLabel.trim())fail('Geef de eigen eenheid een naam.');
  }
  for(const u of d.usages){const p=d.products.find(p=>p.id===u.productId);if(!productIDs.has(u.productId)||u.base!==p.base||!quantity(u.amount)||!quantity(u.enteredAmount)||!units.has(u.enteredUnit)||!validDate(u.date)||!validTime(u.time)||!u.time||!text(u.note,1000))fail('Ongeldige gebruiksregistratie.');}
  return d;
 }
 function migrate(old){
  const d=initial();if(!object(old))return d;
  // Retain the full original before normalizing legacy records, even malformed ones.
  d.legacy=old;
  const list=v=>Array.isArray(v)?v.filter(object):[];
  const value=(v,fallback,max,required=false)=>{const s=(typeof v==='string'||typeof v==='number'?String(v):fallback).slice(0,max);return required&&!s.trim()?fallback:s;};
  const number=(v,fallback,zero=false)=>{const n=typeof v==='number'?v:parse(v);return quantity(n,zero)?n:fallback;};
  const time=v=>validTime(v)?v:'';
  const bool=v=>v===true||v===1||v==='true';
  const newId=(v,seen)=>{let id=idValid(v)&&!seen.has(v)?v:uid();while(seen.has(id))id=uid();seen.add(id);return id;};
  function exercises(raw,session=false){const seen=new Set();return list(raw).map(ex=>{const common={id:newId(ex.id,seen),name:value(ex.name,'Oefening',80,true),detail:value(ex.detail,'',150)};return session?{...common,sets:[{id:uid(),kg:0,reps:1,done:bool(ex.done)}]}:{...common,sets:1,reps:1,kg:0};});}
  function reminders(raw,seen=new Set()){return list(raw).map(r=>({id:newId(r.id,seen),text:value(r.text,'Herinnering',120,true),time:time(r.time),done:bool(r.done)}));}
  const active=list(old.plans).find(p=>p.id===old.activePlanId);
  if(active){d.plan.name=value(active.name,d.plan.name,80,true);for(let i=0;i<7;i++){const p=active.days?.[i];if(!object(p))continue;d.plan.days[i]={...emptyDay(),name:value(p.workoutName,'',60),exercises:exercises(p.exercises),reminders:reminders(p.reminders).map(({done,...r})=>r)};}}
  const productIDs=new Set();d.products=list(old.peptides).map(p=>{const stock=number(p.remainingMg,0,true);return {id:newId(p.id,productIDs),name:value(p.name,'Product',80,true),detail:'Geïmporteerd uit vorige versie',barcode:'',base:'mg',entryUnit:'mg',stock,total:Math.max(number(p.vialMg,1),stock),ratios:{},customLabel:'',defaultAmount:number(p.doseMg,1)};});
  const reminderIDs=new Set();for(const [date,p] of Object.entries(object(old.days)?old.days:{})){if(!validDate(date)||!object(p))continue;d.notes[date]=value(p.notes,'',2000);d.sessions[date]={name:value(p.workoutName,'',60),time:time(p.time),exercises:exercises(p.exercises,true)};d.reminders.push(...reminders(p.reminders,reminderIDs).map(r=>({...r,date})));}
  return validate(d);
 }
 function importPlan(raw){
  const source=typeof raw==='string'?JSON.parse(raw):raw;
  if(!object(source)||(!object(source.days)&&!Array.isArray(source.days)))fail('Een plan moet een days-lijst bevatten.');
  const plan={name:String(source.name||'Geïmporteerd plan').slice(0,80),days:Array.from({length:7},emptyDay)};
  for(const [key,p] of Object.entries(source.days)){
   const i=Number(key);if(!Number.isInteger(i)||i<0||i>6||String(i)!==key)fail('Dagen lopen van 0 (maandag) tot 6 (zondag).');
   if(!object(p)||(p.exercises!==undefined&&!Array.isArray(p.exercises))||(p.reminders!==undefined&&!Array.isArray(p.reminders)))fail('Elke plandag bevat oefeningen en herinneringen als lijsten.');
   if((p.exercises||[]).some(ex=>!object(ex))||(p.reminders||[]).some(r=>!object(r)))fail('Een oefening of herinnering is ongeldig.');
   plan.days[i]={name:String(p.name||p.workoutName||''),time:p.time??'18:00',exercises:(p.exercises||[]).map(ex=>({id:uid(),name:String(ex.name||''),sets:Number(ex.sets??3),reps:Number(ex.reps??8),kg:Number(ex.kg??0),detail:String(ex.detail||'')})),reminders:(p.reminders||[]).map(r=>({id:uid(),text:String(r.text||''),time:String(r.time??'')}))};
  }
  const d=initial();d.plan=plan;validate(d);return plan;
 }
 return {uid,today,parse,validDate,addDays,weekday,week,emptyDay,initial,sessionFor,ensureSession,records,validate,migrate,importPlan};
});
