const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../app/ai-plan-model.js');
const C=require('../app/core.js');
const prefs=()=>({goal:'muscle',equipment:'gym',experience:'beginner',days:[4,0,2],minutes:45,notes:''});
const raw=()=>({name:'Mijn week',days:{0:{name:'Push',time:'18:00',exercises:[{name:'Bench press',sets:3,reps:8,kg:0,detail:'Rustig uitvoeren'}],reminders:[]}}});

test('prompt contains only explicit preferences, names selected days and requires zero training weights',()=>{
 const input={...prefs(),notes:'Ik heb thuis twee dumbbells.',profile:{name:'Never include'},photos:['Never include']};
 const prompt=M.prompt(input);
 assert.match(prompt,/Maandag \(dag 0\), Woensdag \(dag 2\), Vrijdag \(dag 4\)/);
 assert.match(prompt,/kg \(altijd 0\)/);assert.match(prompt,/Ik heb thuis twee dumbbells\./);
 assert.doesNotMatch(prompt,/Never include/);assert.doesNotMatch(prompt,/Zaterdag \(dag 5\)/);
 assert.deepEqual(input.days,[4,0,2]);
});
test('prompt rejects empty or duplicate days and invalid preference selections',()=>{
 for(const replacement of [{days:[]},{days:[0,0]},{days:[7]},{days:['0']},{goal:'other'},{equipment:'constructor'},{minutes:2},{notes:'x'.repeat(1001)}])assert.throws(()=>M.prompt({...prefs(),...replacement}));
});
test('plain JSON and one fenced JSON block produce valid app plans',()=>{
 for(const text of [JSON.stringify(raw()),'```json\n'+JSON.stringify(raw())+'\n```','```\r\n'+JSON.stringify(raw())+'\r\n```']){
  const plan=M.parse(text);assert.equal(plan.days.length,7);assert.equal(plan.days[0].exercises[0].kg,0);assert.equal(plan.days[1].exercises.length,0);assert.ok(plan.days[0].exercises[0].id);
  const data=C.initial();data.plan=plan;assert.equal(C.validate(data),data);
 }
});
test('malformed JSON, surrounding prose, multiple fences and unsupported roots are rejected',()=>{
 for(const text of ['',null,'{','Voor jou: '+JSON.stringify(raw()),'```json\n'+JSON.stringify(raw())+'\n```\nSucces!','```json\n{}\n```\n```json\n{}\n```','[]','null',JSON.stringify({name:'Week',days:[]})])assert.throws(()=>M.parse(text));
});
test('unsupported weight units, invented weights and coerced numeric fields are rejected',()=>{
 for(const replacement of [{kg:40},{kg:'0'},{kg:0,unit:'lbs'},{sets:'3'},{reps:0},{detail:42}]){
  const source=raw();Object.assign(source.days[0].exercises[0],replacement);assert.throws(()=>M.parse(JSON.stringify(source)));
 }
});
test('invalid day keys, times, reminders and unexpected content are rejected',()=>{
 const badDay=raw();badDay.days[7]=badDay.days[0];
 const badTime=raw();badTime.days[0].time='25:00';
 const medical=raw();medical.days[0].reminders=[{text:'Neem product',time:'18:00'}];
 const unexpected=raw();unexpected.photo='https://example.com';
 const empty=raw();empty.days[0].exercises=[];
 for(const source of [badDay,badTime,medical,unexpected,empty])assert.throws(()=>M.parse(JSON.stringify(source)));
});
test('JSON is never evaluated and HTML stays inert string data for escaped rendering',()=>{
 const source=raw();source.days[0].exercises[0].name='<img src=x onerror=alert(1)>';
 const plan=M.parse(JSON.stringify(source));assert.equal(plan.days[0].exercises[0].name,source.days[0].exercises[0].name);
 assert.throws(()=>M.parse('(()=>{throw Error("Do not run")})()'));
});
test('100 KB limit applies to UTF-8 bytes, not only character count',()=>{
 assert.throws(()=>M.parse(' '.repeat(M.MAX_BYTES+1)),/te groot|Plak eerst/);
 assert.throws(()=>M.parse('é'.repeat(M.MAX_BYTES/2+1)),/te groot/);
});
test('applying an imported plan leaves recorded workouts and daily reminders unchanged',()=>{
 const data=C.initial();data.sessions['2026-09-24']={name:'Old workout',time:'18:00',exercises:[]};data.reminders=[{id:'r-1',date:'2026-09-24',text:'Water meenemen',time:'18:00',done:false}];
 const before=JSON.stringify({sessions:data.sessions,reminders:data.reminders});data.plan=M.parse(JSON.stringify(raw()));C.validate(data);
 assert.equal(JSON.stringify({sessions:data.sessions,reminders:data.reminders}),before);
});
