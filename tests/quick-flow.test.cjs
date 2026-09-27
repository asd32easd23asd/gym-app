const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../app/core.js');
const N=require('../app/navigation.js');
const M=require('../app/product-model.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const DAY='2026-09-25';

// Controller integration adapter, not a browser emulator. Real controllers,
// product mutations, validation, queue and storage failure paths are exercised.
// Native focus trapping, CSS and keyboard layout are checked in browser QA.
async function harness(){
 let G,document,currentSaveGate=null,saveFailure=null,saveCount=0,productRenderHook;
 const listeners={},messages=[],formErrors=[],styleValues={},bodyClasses=new Set();
 const data=C.initial();data.settings.onboardingVersion=1;
 M.createProduct(data,{name:'Creatine',base:'g',entryUnit:'g',stock:100,total:100,defaultAmount:5,ratios:{},customLabel:'',detail:'',barcode:''},'creatine');
 data.sessions[DAY]={name:'Push',time:'18:00',exercises:[{id:'bench',name:'Bench',detail:'',sets:[{id:'set-1',kg:60,reps:8,done:false},{id:'set-2',kg:60,reps:8,done:false}]}]};
 let persisted=clone(data);
 const focusable=(attrs={})=>({isConnected:true,focus(){document.activeElement=this;},getAttribute(name){return attrs[name]??null;},setAttribute(name,value){attrs[name]=value;},select(){}});
 function field(name,value,type='text'){
  const events={};
  return {...focusable(),name,type,tagName:'INPUT',value:String(value??''),defaultValue:String(value??''),checked:type==='checkbox'&&!!value,defaultChecked:type==='checkbox'&&!!value,addEventListener(event,fn){(events[event]??=[]).push(fn);},async dispatch(event){for(const callback of events[event]||[])await callback({target:this});}};
 }
 function form(type,values,dataset={}){
  const button={disabled:false,textContent:'',querySelector:()=>({textContent:''}),getAttribute:()=>null,setAttribute(){},classList:{toggle(){}}};
  const fields=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,field(name,value,name==='addPhoto'?'checkbox':'text')]));
  return {dataset:{form:type,...dataset},elements:fields,submit:button,addEventListener(){},matches:s=>s==='form[data-form]',querySelector:s=>s.includes('submit')?button:null,querySelectorAll:s=>s==='[data-ratio]'?[]:Object.values(fields)};
 }
 const formBuilders={
  today:()=>[form('day-note',{note:G.data.notes[C.today()]||''})],
  workout:()=>C.sessionFor(G.data,G.ui.date).exercises.flatMap(ex=>ex.sets.map(set=>form('set',{kg:set.kg,reps:set.reps},{exercise:ex.id,set:set.id}))),
  exercise:()=>[form('exercise',{name:'',sets:3,reps:8,kg:0,detail:''})],
  reminder:()=>[form('reminder',{text:'',time:''})],
  planDay:()=>[form('plan-day',{name:G.data.plan.days[G.ui.weekday].name,time:G.data.plan.days[G.ui.weekday].time})],
  usage:()=>[form('usage-save',G.ui.usageDraft)],
  productEdit:()=>[form('product-save',G.ui.productDraft)],
  measurement:()=>[form('saveMeasurement',{id:'',weight:'',date:C.today(),height:'',note:'',addPhoto:false})]
 };
 function container(kind){
  let html='',forms=[];
  const node={dataset:{},scrollTop:0,renders:0,buttons:[],heading:focusable(),get forms(){return forms;},
   querySelectorAll(selector){if(selector==='details')return [];if(selector==='.quick-close,.quick-back')return node.buttons;if(selector==='button')return node.buttons;if(selector.includes('form'))return forms;return [];},
   querySelector(selector){if(selector==='form[data-busy]')return forms.find(f=>f.dataset.busy)||null;if(selector==='h1'||selector==='#quick-title')return node.heading;return null;},
   insertAdjacentHTML(){},contains(el){return Object.values(forms).some(f=>Object.values(f.elements).includes(el));},
   set innerHTML(value){html=value;node.renders++;node.buttons.forEach(b=>b.isConnected=false);node.buttons=kind==='main'?[focusable({'data-go':'measurement','data-params':'{"measurementId":""}'})]:[focusable({'aria-label':'Sluiten'})];forms=value?(formBuilders[G.ui.page]?.()||[]):[];},get innerHTML(){return html;}
  };return node;
 }
 const main=container('main'),quickBody=container('quick');
 const quickEvents={},quickAttributes={};
 const quickDialog={open:false,style:{setProperty(name,value){styleValues[name]=value;}},setAttribute(name,value){quickAttributes[name]=value;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){quickEvents[name]=fn;},getBoundingClientRect:()=>({left:10,right:390,top:10,bottom:600})};
 const confirmDialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
 const nodes={screen:main,nav:{},dialog:confirmDialog,'quick-dialog':quickDialog,'quick-body':quickBody,toast:{},'quick-toast':{}};
 document={activeElement:null,getElementById(id){const usage=quickBody.forms.find(f=>f.dataset.form==='usage-save');if(id==='usage-form')return usage||null;if(id==='usage-submit')return usage?.submit||null;if(id==='usage-amount')return usage?.elements.enteredAmount||null;if(id==='usage-conversion'||id==='usage-remaining')return nodes[id]??=( {textContent:''} );return nodes[id]||null;},querySelectorAll:()=>[],addEventListener(name,fn){(listeners[name]??=[]).push(fn);},body:{style:{},classList:{add:name=>bodyClasses.add(name),remove:name=>bodyClasses.delete(name),toggle(name,on){if(on)bodyClasses.add(name);else bodyClasses.delete(name);}}}};
 const window={GymProducts:M,scrollY:0,innerHeight:844,scrollTo(x,y){this.scrollY=y;}};
 const storage={async load(){return clone(data);},async save(next){saveCount++;if(currentSaveGate){const gate=currentSaveGate;currentSaveGate=null;gate.started();await gate.promise;}if(saveFailure){const error=saveFailure;saveFailure=null;throw error;}persisted=clone(next);}};
 class FormValues {constructor(f){this.f=f;}get(key){return this.f.elements[key]?.value??null;}has(key){return !!this.f.elements[key]&&(this.f.elements[key].type!=='checkbox'||this.f.elements[key].checked);}}
 const context={window,document,GymCore:C,GymNavigation:N,GymProducts:M,GymStorage:storage,GymNative:{available:false},GymPhotos:{revoke(){}},FormData:FormValues,localStorage:{getItem:()=>null},setTimeout:()=>0,clearTimeout(){},console,URL,Blob};
 for(const file of ['app.js','products.js','body.js']){vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app',file),'utf8'),context,{filename:file});if(file==='products.js')productRenderHook=window.Gym.afterRender.at(-1);}
 G=window.Gym;G.toast=text=>messages.push(text);G.formError=(f,text)=>formErrors.push(text);
 // UI hook behavior (unit selection, input dispatch, images) is outside this
 // adapter and remains part of browser QA. Nodes here rebuild from state.
 G.afterRender.length=0;
 G.pages.settings=()=>G.header('APP','Instellingen','today');
 await G.start();
 return {G,main,quickBody,quickDialog,confirmDialog,window,document,messages,formErrors,bodyClasses,
  get persisted(){return persisted;},get saves(){return saveCount;},get activeForm(){return quickBody.forms[0];},
  set(name,value){const f=quickDialog.open?quickBody.forms[0]:main.forms[0];f.elements[name].value=String(value);if(f.elements[name].type==='checkbox')f.elements[name].checked=!!value;if(f.dataset.form==='usage-save')G.ui.usageDraft[name]=String(value);if(f.dataset.form==='product-save')G.ui.productDraft[name]=String(value);},
  async submit(f=quickBody.forms[0]){for(const callback of listeners.submit||[])await callback({target:f,preventDefault(){}});await Promise.resolve();},
  async click(data){const button={disabled:false,dataset:data};for(const callback of listeners.click||[])await callback({target:{closest:()=>button}});await Promise.resolve();},
  enableProductHook(){G.afterRender.push(productRenderHook);},
  escape(){quickEvents.cancel({preventDefault(){}});},
  failNextSave(){saveFailure=new Error('Lokale opslag vol');},
  blockNextSave(){let started,release;const entered=new Promise(resolve=>started=resolve),promise=new Promise(resolve=>release=resolve);currentSaveGate={started,promise};return {entered,release};}
 };
}

test('usage opens over Today and saves to its origin, not a product detail page',async()=>{
 const h=await harness(),mainHTML=h.main.innerHTML,renders=h.main.renders;
 h.window.scrollY=280;h.G.navigate('usage',{productId:'creatine'});
 assert.equal(h.quickDialog.open,true);assert.equal(h.main.innerHTML,mainHTML);assert.equal(h.main.renders,renders);
 h.set('enteredAmount','2,5');await h.submit();
 assert.equal(h.quickDialog.open,false);assert.equal(h.G.ui.page,'today');assert.equal(h.window.scrollY,280);
 assert.equal(h.persisted.products[0].stock,97.5);assert.equal(h.persisted.usages.length,1);assert.equal(h.persisted.usages[0].enteredAmount,2.5);
});

test('closing a task keeps background edits and returns focus and scroll to its launcher',async()=>{
 const h=await harness();h.G.navigate('workout',{date:DAY});h.main.forms[1].elements.kg.value='72,5';h.main.forms[1].elements.reps.value='6';
 h.window.scrollY=510;const launcher=h.main.buttons[0];h.document.activeElement=launcher;
 h.G.navigate('measurement',{measurementId:''});h.set('weight','81,2');h.G.closeQuick();
 assert.equal(h.G.ui.page,'workout');assert.equal(h.G.ui.date,DAY);assert.equal(h.window.scrollY,510);
 assert.equal(h.main.forms[1].elements.kg.value,'72,5');assert.equal(h.main.forms[1].elements.reps.value,'6');
 assert.equal(h.persisted.measurements.length,0);assert.equal(h.document.activeElement,h.main.buttons[0]);
 h.G.navigate('measurement',{measurementId:''});assert.equal(h.activeForm.elements.weight.value,'81,2');
});

test('Escape closes without saving and retains the unfinished local input',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});h.set('enteredAmount','7,5');h.escape();
 assert.equal(h.quickDialog.open,false);assert.equal(h.persisted.products[0].stock,100);assert.equal(h.persisted.usages.length,0);
 h.G.navigate('usage',{productId:'creatine'});assert.equal(h.activeForm.elements.enteredAmount.value,'7,5');
});

test('opening a different product through its button never restores the previous product identity or draft',async()=>{
 const h=await harness();await h.G.commit(data=>M.createProduct(data,{name:'Liquid',base:'ml',entryUnit:'ml',stock:75,total:100,defaultAmount:2.5,ratios:{},customLabel:'',detail:'',barcode:''},'liquid'));
 await h.click({go:'usage',params:JSON.stringify({productId:'creatine'})});h.set('enteredAmount','7,5');h.G.closeQuick();
 await h.click({go:'usage',params:JSON.stringify({productId:'liquid'})});
 assert.equal(h.G.ui.productId,'liquid');assert.equal(h.quickBody.dataset.route,'usage:liquid');assert.equal(h.G.ui.usageDraft.productId,'liquid');assert.equal(h.activeForm.elements.enteredAmount.value,'2.5');
 await h.submit();assert.equal(h.persisted.products.find(p=>p.id==='liquid').stock,72.5);assert.equal(h.persisted.products.find(p=>p.id==='creatine').stock,100);
 h.G.navigate('usage',{productId:'creatine'});assert.equal(h.activeForm.elements.enteredAmount.value,'7,5');h.G.closeQuick();
 h.G.navigate('usage',{productId:'liquid'});assert.equal(h.G.ui.productId,'liquid');assert.equal(h.G.ui.usageDraft.productId,'liquid');assert.equal(h.activeForm.elements.enteredAmount.value,'2.5');
});

test('changing the product dropdown stays one task and save returns to the original page',async()=>{
 const h=await harness();await h.G.commit(data=>M.createProduct(data,{name:'Liquid',base:'ml',entryUnit:'ml',stock:75,total:100,defaultAmount:2.5,ratios:{},customLabel:'',detail:'',barcode:''},'liquid'));
 h.enableProductHook();h.G.navigate('usage',{productId:'creatine'});await Promise.resolve();
 const select=h.activeForm.elements.productId;select.value='liquid';await select.dispatch('change');
 assert.equal(h.G.ui.productId,'liquid');assert.equal(h.quickBody.dataset.route,'usage:liquid');
 await h.submit();assert.equal(h.persisted.products.find(p=>p.id==='liquid').stock,72.5);assert.equal(h.persisted.products.find(p=>p.id==='creatine').stock,100);
 assert.equal(h.G.ui.page,'today');assert.equal(h.quickDialog.open,false);
});

test('editing product settings returns to the same usage draft, then usage returns to Today',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});h.set('enteredAmount','7,5');
 h.G.navigate('productEdit',{productId:'creatine'});h.set('name','Creatine mono');await h.submit();
 assert.equal(h.quickDialog.open,true);assert.equal(h.G.ui.page,'usage');assert.equal(h.activeForm.elements.enteredAmount.value,'7,5');
 assert.equal(h.persisted.products[0].name,'Creatine mono');assert.equal(h.persisted.usages.length,0);
 await h.submit();assert.equal(h.G.ui.page,'today');assert.equal(h.quickDialog.open,false);assert.equal(h.persisted.products[0].stock,92.5);
});

test('back from product settings preserves the usage draft without mutating the product',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});h.set('enteredAmount','6');
 h.G.navigate('productEdit',{productId:'creatine'});h.set('name','Unfinished name');h.G.back();
 assert.equal(h.G.ui.page,'usage');assert.equal(h.activeForm.elements.enteredAmount.value,'6');assert.equal(h.persisted.products[0].name,'Creatine');
 h.G.closeQuick();assert.equal(h.G.ui.page,'today');
});

test('failed storage keeps the task and entered amount available for a successful retry',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});h.set('enteredAmount','4,5');h.failNextSave();
 await h.submit();assert.equal(h.quickDialog.open,true);assert.equal(h.G.ui.page,'usage');assert.equal(h.activeForm.elements.enteredAmount.value,'4,5');
 assert.equal(h.persisted.products[0].stock,100);assert.equal(h.persisted.usages.length,0);assert.match(h.messages.at(-1),/opslag vol/);
 await h.submit();assert.equal(h.persisted.usages.length,1);assert.equal(h.persisted.products[0].stock,95.5);assert.equal(h.G.ui.page,'today');
});

test('invalid usage remains editable and never changes stock before a valid submission',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});h.set('enteredAmount','101');const before=h.saves;
 await h.submit();assert.equal(h.quickDialog.open,true);assert.equal(h.saves,before);assert.equal(h.persisted.products[0].stock,100);assert.equal(h.persisted.usages.length,0);assert.ok(h.formErrors.length);
 h.set('enteredAmount','10');await h.submit();assert.equal(h.G.ui.page,'today');assert.equal(h.persisted.products[0].stock,90);
});

test('adding a product from Today closes to Today and does not reopen a saved draft',async()=>{
 const h=await harness();h.G.navigate('productEdit',{productId:null});h.set('name','Pre-workout');h.set('stock','300');h.set('total','300');h.set('defaultAmount','10');await h.submit();
 assert.equal(h.G.ui.page,'today');assert.equal(h.quickDialog.open,false);assert.equal(h.persisted.products.length,2);assert.equal(h.persisted.products[1].name,'Pre-workout');
 h.G.navigate('productEdit',{productId:null});assert.equal(h.activeForm.elements.name.value,'');assert.equal(h.activeForm.elements.stock.value,'');
});

test('saving an exercise inside a day keeps the unsaved day name and time',async()=>{
 const h=await harness();h.G.navigate('planning');h.G.navigate('planDay',{weekday:1});h.set('name','Pull dinsdag');h.set('time','19:30');
 h.G.navigate('exercise',{context:'plan',weekday:1,exerciseId:null});h.set('name','Row');h.set('kg','45');await h.submit();
 assert.equal(h.G.ui.page,'planDay');assert.equal(h.quickDialog.open,true);assert.equal(h.activeForm.elements.name.value,'Pull dinsdag');assert.equal(h.activeForm.elements.time.value,'19:30');
 assert.equal(h.persisted.plan.days[1].exercises[0].name,'Row');assert.equal(h.persisted.plan.days[1].exercises[0].kg,45);
 await h.submit();assert.equal(h.persisted.plan.days[1].name,'Pull dinsdag');assert.equal(h.persisted.plan.days[1].time,'19:30');
 h.G.closeQuick();assert.equal(h.G.ui.page,'planning');
});

test('slow save blocks double submit and dismissal, with one recorded usage',async()=>{
 const h=await harness();h.G.navigate('usage',{productId:'creatine'});const f=h.activeForm,gate=h.blockNextSave();
 const pending=h.submit(f);await gate.entered;await h.submit(f);h.G.closeQuick();h.escape();
 assert.equal(h.quickDialog.open,true);assert.equal(h.G.ui.page,'usage');assert.equal(h.persisted.usages.length,0);
 gate.release();await pending;assert.equal(h.persisted.usages.length,1);assert.equal(h.persisted.products[0].stock,95);assert.equal(h.G.ui.page,'today');
});

test('weight save returns to Today and persists a single real measurement',async()=>{
 const h=await harness();h.G.navigate('measurement',{measurementId:''});h.set('weight','78,4');await h.submit();
 assert.equal(h.G.ui.page,'today');assert.equal(h.quickDialog.open,false);assert.equal(h.persisted.measurements.length,1);assert.equal(h.persisted.measurements[0].weight,78.4);
});

test('optional photo continuation stays in the same task and returns to its original page',async()=>{
 const h=await harness();h.G.navigate('measurement',{measurementId:''});h.set('weight','78,4');h.set('addPhoto',true);await h.submit();
 assert.equal(h.G.ui.page,'photoAdd');assert.equal(h.quickDialog.open,true);assert.equal(h.persisted.measurements.length,1);
 h.G.closeQuick();assert.equal(h.G.ui.page,'today');assert.equal(h.quickDialog.open,false);
});

test('general settings is available on Today only, not in task or training headers',async()=>{
 const h=await harness();assert.match(h.main.innerHTML,/class="settings-button"/);
 h.G.navigate('workout',{date:DAY});assert.doesNotMatch(h.main.innerHTML,/class="settings-button"/);
 h.G.navigate('measurement',{measurementId:''});assert.doesNotMatch(h.quickBody.innerHTML,/class="settings-button"/);assert.match(h.quickBody.innerHTML,/aria-label="Sluiten"/);
});
