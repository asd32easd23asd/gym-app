(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GymSocialModel=api;})(globalThis,function(){
 'use strict';
 const fail=m=>{throw Error(m);};
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v);
 const text=(v,max)=>typeof v==='string'&&!!v.trim()&&v.length<=max;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(new Date(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1000000;
 const exact=(value,keys)=>object(value)&&Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
 const canCreate=premium=>premium===true;
 const requirePremium=premium=>{if(!canCreate(premium))fail('Vriendengroepen en challenges maken hoort bij Premium.');};
 function unique(list,label,max){if(!Array.isArray(list)||list.length>max)fail('Ongeldige lijst: '+label+'.');const seen=new Set();for(const item of list){if(!object(item)||!id(item.id)||seen.has(item.id))fail('Ongeldige of dubbele identificatie bij '+label+'.');seen.add(item.id);}return seen;}
 function members(list){const ids=unique(list,'deelnemers',50);if(!ids.has('self'))fail('Je eigen deelname ontbreekt.');for(const m of list)if(!text(m.name,60))fail('Ongeldige naam van een deelnemer.');return ids;}
 function challengeFields(c){if(!object(c)||!id(c.id)||!text(c.title,80)||!['reps','kg'].includes(c.metric)||!positive(c.target)||(c.metric==='reps'&&!Number.isInteger(c.target))||!date(c.start)||!date(c.end)||c.end<c.start)fail('Vul een challenge, een positief doel en geldige begin- en einddatum in.');}
 function challengeRecords(c){challengeFields(c);if(!['created','joined'].includes(c.origin))fail('Ongeldige herkomst bij de challenge.');const ids=members(c.members);if(c.origin==='joined'&&(c.members.length!==1||c.members[0].id!=='self'))fail('Een gedeelde challenge bewaart alleen je eigen resultaten.');unique(c.entries,'resultaten',10000);for(const r of c.entries)if(!ids.has(r.memberId)||!date(r.date)||r.date<c.start||r.date>c.end||!positive(r.value)||(c.metric==='reps'&&!Number.isInteger(r.value))||typeof r.note!=='string'||r.note.length>200)fail('Ongeldig challengeresultaat.');}
 const initial=()=>({version:2,groups:[],challenges:[],legacyChallenges:[]});
 function upgrade(s){
  if(!object(s)||s.version!==undefined)return s;
  const groups=unique(s.groups,'groepen',100);unique(s.challenges,'challenges',500);
  for(const g of s.groups){if(!text(g.name,60))fail('Ongeldige groepsnaam.');members(g.members);}
  for(const c of s.challenges){challengeRecords(c);if((c.groupId!==null&&!groups.has(c.groupId))||(c.origin==='joined'&&c.groupId!==null))fail('Ongeldige groep bij de challenge.');}
  if(s.legacyChallenges!==undefined)fail('Onbekend formaat voor oudere challenges.');
  s.legacyChallenges=s.challenges.filter(c=>c.groupId===null);
  s.challenges=s.challenges.filter(c=>c.groupId!==null);
  for(const g of s.groups)g.origin='created';
  s.version=2;return s;
 }
 function validate(s){
  if(!object(s)||s.version!==2)fail('Ongeldige groepsgegevens.');
  const groups=unique(s.groups,'groepen',100),challenges=unique(s.challenges,'challenges',500),legacy=unique(s.legacyChallenges,'eerdere challenges',500);
  if(challenges.size+legacy.size>500)fail('Je challengeoverzicht is vol.');
  for(const g of s.groups){if(!text(g.name,60)||!['created','joined'].includes(g.origin))fail('Ongeldige vriendengroep.');members(g.members);}
  for(const c of s.challenges){challengeRecords(c);if(!groups.has(c.groupId))fail('Een challenge hoort bij een bestaande vriendengroep.');}
  for(const c of s.legacyChallenges){challengeRecords(c);if(c.groupId!==null||challenges.has(c.id))fail('Ongeldige oudere challenge.');}return s;
 }
 function group(s,groupId){const g=s.groups.find(x=>x.id===groupId);if(!g)fail('Kies eerst een bestaande vriendengroep.');return g;}
 function challenge(s,challengeId){const c=s.challenges.find(x=>x.id===challengeId);if(!c)fail('Deze challenge bestaat niet meer.');return c;}
 function createGroup(s,values,premium){requirePremium(premium);if(!id(values.id)||s.groups.some(g=>g.id===values.id)||!text(values.name,60)||s.groups.length>=100)fail('Geef de vriendengroep een geldige naam.');const g={id:values.id,name:values.name.trim(),origin:'created',members:[{id:'self',name:'Ik'}]};s.groups.push(g);return g;}
 function renameGroup(s,groupId,name,premium){requirePremium(premium);if(!text(name,60))fail('Vul een groepsnaam in.');group(s,groupId).name=name.trim();}
 function addMember(s,groupId,member,premium){requirePremium(premium);const g=group(s,groupId);if(!id(member.id)||g.members.some(m=>m.id===member.id)||!text(member.name,60)||g.members.length>=50)fail('Vul een geldige naam voor een nieuwe deelnemer in.');g.members.push({id:member.id,name:member.name.trim()});}
 function removeMember(s,groupId,memberId){const g=group(s,groupId);if(memberId==='self')fail('Je eigen deelname blijft in de groep.');g.members=g.members.filter(m=>m.id!==memberId);}
 function deleteGroup(s,groupId){group(s,groupId);s.groups=s.groups.filter(g=>g.id!==groupId);s.challenges=s.challenges.filter(c=>c.groupId!==groupId);}
 function createChallenge(s,values,premium){requirePremium(premium);challengeFields(values);const g=group(s,values.groupId);if(s.challenges.some(c=>c.id===values.id)||s.legacyChallenges.some(c=>c.id===values.id)||s.challenges.length+s.legacyChallenges.length>=500)fail('Deze challenge bestaat al, of de lijst is vol.');const c={id:values.id,title:values.title.trim(),metric:values.metric,target:values.target,start:values.start,end:values.end,groupId:g.id,origin:'created',members:g.members.map(m=>({...m})),entries:[]};s.challenges.push(c);return c;}
 function addEntry(s,challengeId,entry,today){const c=challenge(s,challengeId);if(!id(entry.id)||c.entries.some(r=>r.id===entry.id)||c.entries.length>=10000||!c.members.some(m=>m.id===entry.memberId)||!date(entry.date)||entry.date<c.start||entry.date>c.end||(today&&entry.date>today)||!positive(entry.value)||(c.metric==='reps'&&!Number.isInteger(entry.value))||typeof entry.note!=='string'||entry.note.length>200)fail('Kies een deelnemer, een datum binnen de challenge en een geldige score. Een toekomstige score kun je nog niet loggen.');c.entries.push({...entry});}
 function removeEntry(s,challengeId,entryId){const c=challenge(s,challengeId);c.entries=c.entries.filter(r=>r.id!==entryId);}
 function leaderboard(c){return c.members.map(m=>{const rows=c.entries.filter(r=>r.memberId===m.id);return {...m,count:rows.length,value:rows.length?(c.metric==='reps'?rows.reduce((n,r)=>n+r.value,0):Math.max(...rows.map(r=>r.value))):null};}).sort((a,b)=>(b.value??-1)-(a.value??-1)||a.name.localeCompare(b.name));}
 const definition=c=>({id:c.id,title:c.title,metric:c.metric,target:c.target,start:c.start,end:c.end});
 function groupCode(s,groupId){const g=group(s,groupId);return JSON.stringify({type:'gym-friend-group',version:1,id:g.id,name:g.name,challenges:s.challenges.filter(c=>c.groupId===g.id).map(definition)});}
 function parseGroupShare(raw){
  if(typeof raw!=='string'||!raw.trim()||raw.length>200000)fail('De groepscode is leeg of te lang.');
  let g;try{g=JSON.parse(raw);}catch{fail('Plak een volledige groepscode uit de app.');}
  if(object(g)&&g.type==='gym-challenge')fail('Dit is een oudere challengecode. Open een vriendengroep en kies Eerdere challenges.');
  if(!exact(g,['type','version','id','name','challenges'])||g.type!=='gym-friend-group'||g.version!==1||!id(g.id)||!text(g.name,60))fail('Deze groepscode heeft een ongeldig formaat.');
  unique(g.challenges,'challenges in de code',500);
  for(const c of g.challenges){if(!exact(c,['id','title','metric','target','start','end']))fail('Deze groepscode bevat ongeldige challengegegevens.');challengeFields(c);}return {id:g.id,name:g.name.trim(),challenges:g.challenges.map(definition)};
 }
 function joinGroup(s,raw){
  const incoming=parseGroupShare(raw),existing=s.groups.find(g=>g.id===incoming.id),fresh=[],restored=[];
  if(!existing&&s.groups.length>=100)fail('Je groepsoverzicht is vol.');
  for(const c of incoming.challenges){const saved=s.challenges.find(x=>x.id===c.id),older=s.legacyChallenges.find(x=>x.id===c.id);if((saved&&(saved.groupId!==incoming.id||JSON.stringify(definition(saved))!==JSON.stringify(c)))||(older&&JSON.stringify(definition(older))!==JSON.stringify(c)))fail('Een challenge uit deze code wijkt af van de challenge op jouw toestel. Je gegevens zijn niet aangepast.');if(older)restored.push(older);else if(!saved)fresh.push(c);}
  if(existing&&!fresh.length&&!restored.length)fail('Deze vriendengroep en challenges staan al op dit toestel.');
  if(s.challenges.length+s.legacyChallenges.length+fresh.length>500)fail('Je challengeoverzicht is vol.');
  const joined=existing||{id:incoming.id,name:incoming.name,origin:'joined',members:[{id:'self',name:'Ik'}]};
  if(!existing)s.groups.push(joined);
  for(const c of fresh)s.challenges.push({...c,groupId:joined.id,origin:'joined',members:[{id:'self',name:'Ik'}],entries:[]});
  for(const c of restored)attachLegacy(s,c.id,joined.id);return joined;
 }
 function attachLegacy(s,challengeId,groupId){const g=group(s,groupId),c=s.legacyChallenges.find(x=>x.id===challengeId);if(!c)fail('Deze eerdere challenge bestaat niet meer.');c.groupId=g.id;s.legacyChallenges=s.legacyChallenges.filter(x=>x.id!==challengeId);s.challenges.push(c);return c;}
 // Older codes can only be imported after explicitly choosing a friend group.
 function shareCode(c){challengeFields(c);return JSON.stringify({type:'gym-challenge',version:1,...definition(c)});}
 function parseShare(raw){if(typeof raw!=='string'||raw.length>2000)fail('De challengecode is leeg of te lang.');let c;try{c=JSON.parse(raw);}catch{fail('Plak een volledige challengecode uit de app.');}if(!exact(c,['type','version','id','title','metric','target','start','end'])||c.type!=='gym-challenge'||c.version!==1)fail('Deze challengecode heeft een ongeldig formaat.');challengeFields(c);return definition(c);}
 function joinChallenge(s,raw,groupId){const g=group(s,groupId),c=parseShare(raw);if([...s.challenges,...s.legacyChallenges].some(x=>x.id===c.id))fail('Deze challenge staat al op dit toestel.');if(s.challenges.length+s.legacyChallenges.length>=500)fail('Je challengeoverzicht is vol.');const joined={...c,groupId:g.id,origin:'joined',members:[{id:'self',name:'Ik'}],entries:[]};s.challenges.push(joined);return joined;}
 return {initial,upgrade,validate,canCreate,group,challenge,createGroup,renameGroup,addMember,removeMember,deleteGroup,createChallenge,addEntry,removeEntry,leaderboard,groupCode,parseGroupShare,joinGroup,attachLegacy,shareCode,parseShare,joinChallenge};
});
