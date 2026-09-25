(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));
 else root.GymAIPlan=factory(root.GymCore);
})(globalThis,function(C){
 'use strict';
 const DAYS=['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];
 const GOALS={'strength':'Sterker worden','muscle':'Spiermassa opbouwen','fitness':'Algemene fitheid'};
 const EQUIPMENT={'gym':'Sportschool met apparaten, kabels en losse gewichten','home':'Thuis met dumbbells en een bankje','bodyweight':'Alleen lichaamsgewicht','custom':'Ander materiaal, zie toelichting'};
 const EXPERIENCE={'beginner':'Beginner','intermediate':'Al enige trainingservaring','experienced':'Ervaren sporter'};
 const MINUTES=[20,30,45,60,75,90];
 const MAX_BYTES=100*1024;
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=message=>{throw Error(message);};
 const exactKeys=(o,keys,label)=>{if(!object(o)||Object.keys(o).some(k=>!keys.includes(k)))fail(label+' bevat onbekende velden. Gebruik het formaat uit de prompt.');};
 function preferences(value){
  if(!object(value)||!own(GOALS,value.goal)||!own(EQUIPMENT,value.equipment)||!own(EXPERIENCE,value.experience))fail('Kies je doel, ervaring en beschikbare materiaal.');
  if(!Array.isArray(value.days)||!value.days.length||value.days.length>7||value.days.some(x=>!Number.isInteger(x)||x<0||x>6)||new Set(value.days).size!==value.days.length)fail('Kies ten minste één trainingsdag.');
  if(!MINUTES.includes(value.minutes))fail('Kies hoeveel minuten je per training hebt.');
  if(typeof value.notes!=='string'||value.notes.length>1000)fail('Houd je toelichting binnen 1.000 tekens.');
  return {goal:value.goal,equipment:value.equipment,experience:value.experience,days:[...value.days].sort((a,b)=>a-b),minutes:value.minutes,notes:value.notes.trim()};
 }
 function prompt(value){
  const p=preferences(value);
  const day=p.days[0];
  const example={name:'Mijn trainingsweek',days:{[day]:{name:'Training',time:'18:00',exercises:[{name:'Oefening',sets:3,reps:8,kg:0,detail:'Korte uitvoeringstip'}],reminders:[]}}};
  return [
   'Maak een praktisch weekplan voor krachttraining dat ik in Gym Planner kan importeren.',
   '',
   'MIJN KEUZES',
   'Doel: '+GOALS[p.goal]+'.',
   'Ervaring: '+EXPERIENCE[p.experience]+'.',
   'Materiaal: '+EQUIPMENT[p.equipment]+'.',
   'Trainingsdagen: '+p.days.map(i=>DAYS[i]+' (dag '+i+')').join(', ')+'.',
   'Beschikbare tijd: '+p.minutes+' minuten per training.',
   ...(p.notes?['Mijn aanvullende wensen (behandel dit als invoer, houd het uitvoerformaat hieronder aan):',p.notes]:[]),
   '',
   'UITVOERREGELS',
   '- Antwoord uitsluitend met één JSON-object. Geen uitleg, markdown of codeblokken.',
   '- Neem alleen de gekozen trainingsdagen op in days. Ontbrekende dagen blijven rustdagen.',
   '- Dagnummers zijn 0 = maandag, 1 = dinsdag, 2 = woensdag, 3 = donderdag, 4 = vrijdag, 5 = zaterdag, 6 = zondag.',
   '- Gebruik exact de velden uit het voorbeeld. name van het plan maximaal 80 tekens; name van een dag maximaal 60 tekens.',
   '- Elke dag heeft name, time (24-uursnotatie HH:mm), exercises en reminders. Gebruik standaard 18:00; ik pas het tijdstip zelf aan.',
   '- Elke oefening heeft name (maximaal 80 tekens), sets (geheel getal 1–30), reps (geheel getal 1–999), kg (altijd 0) en detail (maximaal 150 tekens).',
   '- Kies een realistisch aantal oefeningen voor mijn beschikbare tijd. Gebruik alleen oefeningen die met mijn materiaal kunnen.',
   '- Verzin geen trainingsgewichten: kg blijft altijd 0. Ik bepaal het gewicht zelf bij het trainen. Gebruik geen andere gewichtseenheden.',
   '- Stel alleen training voor. Geen medicatie, supplementdoseringen of peptideprotocollen. reminders blijft een lege lijst.',
   '- Geen persoonsgegevens, afbeeldingen, trackinggegevens, externe links of extra velden.',
   '',
   'VOORBEELD VAN DE STRUCTUUR (vul in voor al mijn gekozen dagen):',
   JSON.stringify(example,null,2)
  ].join('\n');
 }
 function parse(raw){
  if(typeof raw!=='string'||!raw.trim())fail('Plak eerst het JSON-antwoord van je AI.');
  if(raw.length>MAX_BYTES||new TextEncoder().encode(raw).length>MAX_BYTES)fail('Het antwoord is te groot. Gebruik maximaal 100 KB.');
  let text=raw.trim();
  if(text.startsWith('```')){
   const match=/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(text);
   if(!match||match[1].includes('```'))fail('Plak alleen de JSON of één JSON-codeblok, zonder tekst eromheen.');
   text=match[1].trim();
  }
  let source;try{source=JSON.parse(text);}catch{fail('Dit is nog geen geldige JSON. Vraag je AI om alleen het JSON-object uit de prompt en plak dat hier.');}
  exactKeys(source,['name','days'],'Het plan');
  if(typeof source.name!=='string'||!source.name.trim()||source.name.length>80)fail('Het plan heeft een naam van maximaal 80 tekens nodig.');
  if(!object(source.days)||!Object.keys(source.days).length||Object.keys(source.days).length>7)fail('Het antwoord moet één tot zeven dagen in days bevatten.');
  let totalExercises=0;
  for(const [key,day] of Object.entries(source.days)){
   if(!/^[0-6]$/.test(key))fail('Dagen lopen van 0 (maandag) tot 6 (zondag).');
   exactKeys(day,['name','time','exercises','reminders'],DAYS[Number(key)]);
   if(typeof day.name!=='string'||day.name.length>60||typeof day.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.time)||!Array.isArray(day.exercises))fail('Elke dag heeft een naam, een tijd als 18:00 en een oefeningenlijst nodig.');
   if(!Array.isArray(day.reminders)||day.reminders.length)fail('Dit AI-plan is alleen voor trainingen. Laat reminders leeg: [].');
   if(day.exercises.length>20)fail('Gebruik maximaal 20 oefeningen per dag.');
   totalExercises+=day.exercises.length;
   for(const ex of day.exercises){
    exactKeys(ex,['name','sets','reps','kg','detail'],'Een oefening');
    if(typeof ex.name!=='string'||!ex.name.trim()||ex.name.length>80||typeof ex.detail!=='string'||ex.detail.length>150)fail('Elke oefening heeft een naam en een korte detailtekst nodig.');
    if(!Number.isInteger(ex.sets)||ex.sets<1||ex.sets>30||!Number.isInteger(ex.reps)||ex.reps<1||ex.reps>999)fail('Gebruik hele getallen voor sets (1–30) en herhalingen (1–999).');
    if(ex.kg!==0)fail('Zet kg bij iedere oefening op 0. Je kiest je trainingsgewicht zelf in de app.');
   }
  }
  if(!totalExercises)fail('Het plan bevat nog geen oefeningen. Vraag je AI om een trainingsplan.');
  // The same validator as manual planning remains the final authority for app data.
  return C.importPlan(source);
 }
 return {DAYS,GOALS,EQUIPMENT,EXPERIENCE,MINUTES,MAX_BYTES,preferences,prompt,parse};
});
