const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../app/core.js');
const N=require('../app/navigation.js');

const DAY='2026-09-25',OTHER_DAY='2026-09-26';
const clone=value=>JSON.parse(JSON.stringify(value));

function field(name,value,label=name){
 return {name,type:'text',tagName:'INPUT',value:String(value),defaultValue:String(value),getAttribute:name=>name==='aria-label'?label:null};
}
function form(type,values,dataset={},done=false){
 const span={textContent:done?'Bewaard':'Bewaar'},attributes={'aria-pressed':String(done)},classes=new Set();
 const submit={disabled:false,textContent:'',classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},querySelector:()=>span,getAttribute:name=>attributes[name],setAttribute(name,value){attributes[name]=value;}};
 const elements=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,field(name,value,name==='kg'?'Bench set gewicht':name)]));
 const result={dataset:{form:type,...dataset},elements,matches:selector=>selector==='form[data-form]',querySelector:selector=>selector.includes('submit')?submit:null,querySelectorAll:()=>Object.values(elements),submit,span,classes};
 for(const input of Object.values(elements))input.closest=()=>result;
 return result;
}

// A small DOM adapter exercises the real controller, queue and navigation code.
// Forms are rebuilt from state on render, like the browser; dirty values are not
// retained by the adapter, so only the controller can preserve sibling edits.
async function harness(){
 const data=C.initial();data.settings.onboardingVersion=1;
 data.sessions[DAY]={name:'Push',time:'18:00',exercises:[{id:'bench',name:'Bench',detail:'',sets:[{id:'set-1',kg:60,reps:8,done:false},{id:'set-2',kg:60,reps:8,done:false}]}]};
 const listeners={},messages=[];
 let visible=[],nextVisible=[],waitForSave=null,persisted=clone(data),G;
 const screen={dataset:{},querySelectorAll(selector){return selector==='details'?[]:selector.includes('form')?visible:[];},querySelector(selector){if(selector==='form[data-busy]')return visible.find(item=>item.dataset.busy)||null;if(selector==='h1')return {focus(){},tabIndex:0};return null;},insertAdjacentHTML(){},set innerHTML(value){visible=nextVisible;nextVisible=[];},get innerHTML(){return '';}};
 const elements={screen,nav:{},toast:{},dialog:{showModal(){},close(){}}};
 const document={getElementById:id=>elements[id],querySelectorAll:()=>[],addEventListener(name,callback){(listeners[name]??=[]).push(callback);},body:{classList:{toggle(){}}}};
 const storage={async load(){return clone(data);},async save(next){if(waitForSave){const gate=waitForSave;waitForSave=null;gate.entered();await gate.promise;}persisted=clone(next);}};
 const window={scrollY:0,scrollTo(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/app.js'),'utf8'),{window,document,GymCore:C,GymNavigation:N,GymProducts:{},GymStorage:storage,GymNative:{available:false},localStorage:{getItem:()=>null},setTimeout:()=>0,clearTimeout(){},console},{filename:'app.js'});
 G=window.Gym;G.toast=message=>messages.push(message);
 for(const page of ['today','settings','exercise','planDay','planning'])G.pages[page]=()=>{nextVisible=[];return page;};
 G.pages.workout=()=>{nextVisible=C.sessionFor(G.data,G.ui.date).exercises.flatMap(ex=>ex.sets.map(set=>form('set',{kg:set.kg,reps:set.reps},{exercise:ex.id,set:set.id},set.done)));return 'workout';};
 await G.start();G.navigate('workout',{date:DAY});await Promise.resolve();
 return {G,messages,get persisted(){return persisted;},get forms(){return visible;},async submit(target){for(const callback of listeners.submit||[])await callback({target,preventDefault(){}});await Promise.resolve();},input(target){for(const callback of listeners.input||[])callback({target});},blockNextSave(){let entered,release;const started=new Promise(resolve=>{entered=resolve;}),promise=new Promise(resolve=>{release=resolve;});waitForSave={entered,promise};return {started,release};}};
}

test('saving a set twice is idempotent and keeps the result in progress',async()=>{
 const h=await harness();h.forms[0].elements.kg.value='65';
 await h.submit(h.forms[0]);await h.submit(h.forms[0]);
 const set=h.G.data.sessions[DAY].exercises[0].sets[0];
 assert.deepEqual(clone(set),{id:'set-1',kg:65,reps:8,done:true});
 assert.equal(C.records(h.persisted)[0].kg,65);
 assert.equal(h.forms[0].span.textContent,'Bewaard');
});

test('saving one set preserves unsaved sibling fields through render and a settings round trip',async()=>{
 const h=await harness();h.forms[0].elements.kg.value='65';h.forms[1].elements.kg.value='72,5';h.forms[1].elements.reps.value='6';
 await h.submit(h.forms[0]);
 assert.equal(h.G.data.sessions[DAY].exercises[0].sets[0].done,true);
 assert.equal(h.G.data.sessions[DAY].exercises[0].sets[1].kg,60);
 assert.equal(h.G.data.sessions[DAY].exercises[0].sets[1].done,false);
 assert.equal(h.forms[1].elements.kg.value,'72,5');assert.equal(h.forms[1].elements.reps.value,'6');
 h.G.navigate('settings');h.G.back();await Promise.resolve();
 assert.equal(h.G.ui.date,DAY);assert.equal(h.forms[1].elements.kg.value,'72,5');assert.equal(h.forms[1].elements.reps.value,'6');
 await h.submit(h.forms[1]);
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[1].kg,72.5);
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[1].reps,6);
});

test('editing an already saved set visibly changes its status until submitted',async()=>{
 const h=await harness();await h.submit(h.forms[0]);
 const current=h.forms[0];assert.equal(current.span.textContent,'Bewaard');
 current.elements.kg.value='70';h.input(current.elements.kg);
 assert.equal(current.span.textContent,'Bewaar');assert.ok(current.classes.has('unsaved'));
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[0].kg,60);
 await h.submit(current);assert.equal(h.forms[0].span.textContent,'Bewaard');
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[0].kg,70);
});

test('a queued set save stays bound to its submitted date after navigation',async()=>{
 const h=await harness(),gate=h.blockNextSave(),prior=h.G.commit(()=>{});await gate.started;
 h.forms[0].elements.kg.value='67.5';const pending=h.submit(h.forms[0]);
 h.G.navigate('workout',{date:OTHER_DAY});gate.release();await prior;await pending;
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[0].kg,67.5);
 assert.equal(h.persisted.sessions[DAY].exercises[0].sets[0].done,true);
 assert.equal(h.persisted.sessions[OTHER_DAY],undefined);
 assert.equal(h.messages.length,0);
});

test('a queued new exercise uses the submitted session date rather than the later screen',async()=>{
 const h=await harness();h.G.navigate('exercise',{context:'session',exerciseId:null,date:DAY});
 const gate=h.blockNextSave(),prior=h.G.commit(()=>{});await gate.started;
 const pending=h.G.forms.exercise(form('exercise',{name:'Squat',sets:3,reps:5,kg:80,detail:''}));
 h.G.navigate('workout',{date:OTHER_DAY});gate.release();await prior;await pending;
 assert.equal(h.persisted.sessions[DAY].exercises.at(-1).name,'Squat');
 assert.equal(h.persisted.sessions[OTHER_DAY],undefined);
});

test('a queued plan exercise uses the submitted weekday rather than the later screen',async()=>{
 const h=await harness();h.G.navigate('exercise',{context:'plan',exerciseId:null,weekday:1});
 const gate=h.blockNextSave(),prior=h.G.commit(()=>{});await gate.started;
 const pending=h.G.forms.exercise(form('exercise',{name:'Row',sets:3,reps:8,kg:40,detail:''}));
 h.G.navigate('planDay',{weekday:3});gate.release();await prior;await pending;
 assert.equal(h.persisted.plan.days[1].exercises[0].name,'Row');
 assert.equal(h.persisted.plan.days[3].exercises.length,0);
});
