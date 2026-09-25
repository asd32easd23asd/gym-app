const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../app/core.js');
test('date calculations retain calendar days across month and year boundaries',()=>{assert.equal(C.addDays('2026-12-31',1),'2027-01-01');assert.equal(C.week('2026-09-25')[0],'2026-09-21');assert.equal(C.validDate('2026-02-30'),false);});
test('materialized sessions are independent of future plan edits',()=>{const d=C.initial();d.plan.days[4].exercises.push({id:'e',name:'Bench',sets:3,reps:8,kg:60});C.ensureSession(d,'2026-09-25').exercises[0].sets[0].done=true;d.plan.days[4].exercises[0].kg=80;assert.equal(d.sessions['2026-09-25'].exercises[0].sets[0].kg,60);assert.equal(C.records(d)[0].kg,60);});
test('only completed sets count as PRs',()=>{const d=C.initial();d.sessions['2026-09-25']={exercises:[{name:'Bench',sets:[{kg:60,reps:8,done:true},{kg:90,reps:1,done:false}]}]};assert.equal(C.records(d)[0].kg,60);});
test('legacy source kept intact and product stock migrated without pretending detail is structured',()=>{const old={peptides:[{id:'a',name:'Product',vialMg:10,remainingMg:4}],days:{'2026-09-25':{exercises:[{name:'Bench',detail:'3 x 8 60kg',done:true}],notes:'note'}}};const d=C.migrate(old);assert.equal(d.products[0].stock,4);assert.equal(d.sessions['2026-09-25'].exercises[0].detail,'3 x 8 60kg');assert.equal(C.records(d).length,0);assert.deepEqual(d.legacy,old);});
test('plan import rejects invalid sets and accepts explicit neutral workout schema',()=>{assert.throws(()=>C.importPlan({days:{0:{exercises:[{name:'Squat',sets:-1}]}}}));const p=C.importPlan({name:'Week',days:{0:{name:'Legs',exercises:[{name:'Squat',sets:3,reps:5,kg:50}]}}});assert.equal(p.days[0].exercises[0].kg,50);});

test('planned set identities survive repeated renders and first materialization',()=>{
 const d=C.initial();d.plan.days[4].exercises=[{id:'bench',name:'Bench',sets:3,reps:8,kg:60,detail:''}];
 const rendered=C.sessionFor(d,'2026-09-25'),again=C.sessionFor(d,'2026-09-25');
 assert.deepEqual(rendered,again);assert.deepEqual(d.sessions,{});
 const stored=C.ensureSession(d,'2026-09-25');assert.deepEqual(stored,rendered);
 const formSetID=rendered.exercises[0].sets[0].id;stored.exercises[0].sets.find(s=>s.id===formSetID).done=true;
 assert.equal(C.validate(d).sessions['2026-09-25'].exercises[0].sets[0].done,true);
 assert.notEqual(C.sessionFor(d,'2026-10-02').exercises[0].sets[0].id,formSetID);
});

test('nested backup validation rejects malformed reminders before they can break rendering',()=>{
 for(const bad of [
  {date:'2026-09-25',text:'Reminder',time:'18:00',done:false},
  {id:'r',date:'2026-09-31',text:'Reminder',time:'18:00',done:false},
  {id:'r',date:'2026-09-25',text:'Reminder',time:'25:00',done:false},
  {id:'r',date:'2026-09-25',text:{unexpected:true},time:'18:00',done:false},
  {id:'r',date:'2026-09-25',text:'Reminder',time:'18:00',done:'false'}
 ]){const d=C.initial();d.reminders=[bad];assert.throws(()=>C.validate(d));}
 const d=C.initial();d.reminders=[{id:'r',date:'2026-09-25',text:'Reminder',time:'',done:false}];assert.equal(C.validate(d),d);
 d.reminders.push({...d.reminders[0]});assert.throws(()=>C.validate(d));
});

test('nested backup validation protects exercise and set identities and note types',()=>{
 const build=()=>{const d=C.initial();d.plan.days[4].exercises=[{id:'bench',name:'Bench',sets:2,reps:8,kg:60,detail:''}];C.ensureSession(d,'2026-09-25');return d;};
 for(const mutate of [
  d=>{delete d.sessions['2026-09-25'].exercises[0].id;},
  d=>{d.sessions['2026-09-25'].exercises[0].sets[1].id=d.sessions['2026-09-25'].exercises[0].sets[0].id;},
  d=>{d.plan.days[4].exercises.push({...d.plan.days[4].exercises[0]});},
  d=>{d.notes['2026-09-25']={text:'invalid'};},
  d=>{d.notes['not-a-date']='invalid';},
  d=>{d.settings.notifications='false';},
  d=>{d.plan.days[4].time='18:99';}
 ]){const d=build();mutate(d);assert.throws(()=>C.validate(d));}
 assert.equal(C.validate(build()).schema,2);
});

test('measurement/photo validation allows Overig and rejects invalid or duplicate metadata',()=>{
 const d=C.initial();d.measurements=[{id:'m',date:'2026-09-25',weight:80,note:''}];
 d.photos=[{id:'photo-1',date:'2026-09-25',angle:'Overig',weight:null,note:''}];assert.equal(C.validate(d),d);
 const clone=()=>JSON.parse(JSON.stringify(d));
 const duplicate=clone();duplicate.photos.push({...duplicate.photos[0]});assert.throws(()=>C.validate(duplicate));
 const measurement=clone();delete measurement.measurements[0].id;assert.throws(()=>C.validate(measurement));
 const badID=clone();badID.photos[0].id='../photo';assert.throws(()=>C.validate(badID));
 const badNote=clone();badNote.measurements[0].note=[];assert.throws(()=>C.validate(badNote));
});

test('legacy migration sanitizes malformed values and duplicate IDs without mutating the archive',()=>{
 const old={activePlanId:'plan',plans:[{id:'plan',name:'Legacy',days:{0:{workoutName:'Push',exercises:[{id:'same',name:'Bench'},{id:'same',name:'Press'}],reminders:[{id:'r',text:'Gym',time:'bad'}]}}}],peptides:[{id:'p',name:'Product',remainingMg:-3,vialMg:'bad',doseMg:-1},{id:'p',name:'Other',remainingMg:'4,5',vialMg:5}],days:{'2026-09-25':{exercises:[null,{name:'Bench',detail:'Original free-form detail',done:'false'}],notes:42,reminders:[{id:'r',text:'Reminder',time:'99:99'}]},'2026-09-26':{reminders:[{id:'r',text:'Reminder',time:'18:00'}]},'bad-date':{notes:'kept in archive'}}};
 const original=JSON.stringify(old),d=C.migrate(old);assert.equal(C.validate(d),d);assert.equal(JSON.stringify(old),original);assert.deepEqual(d.legacy,old);
 assert.equal(d.products[0].stock,0);assert.equal(d.products[0].defaultAmount,1);assert.equal(d.products[1].stock,4.5);assert.notEqual(d.products[0].id,d.products[1].id);
 assert.notEqual(d.plan.days[0].exercises[0].id,d.plan.days[0].exercises[1].id);assert.notEqual(d.reminders[0].id,d.reminders[1].id);
 assert.equal(d.reminders[0].time,'');assert.equal(d.sessions['2026-09-25'].exercises[0].sets[0].done,false);assert.equal(d.notes['2026-09-25'],'42');
 assert.equal(C.validate(C.migrate({plans:{invalid:true},peptides:[null],days:null})).schema,2);
});

test('imported plans reject invalid reminder times and malformed nested structures',()=>{
 for(const raw of [null,{days:{0:null}},{days:{0:{exercises:{}}}},{days:{0:{reminders:[{text:'Gym',time:'24:01'}]}}},{days:{0:{reminders:[{text:'',time:'18:00'}]}}}])assert.throws(()=>C.importPlan(raw));
 const plan=C.importPlan({days:{0:{name:'Rest',time:'',reminders:[{text:'Walk',time:''}]}}});assert.equal(plan.days[0].reminders[0].time,'');
});

test('record names are values rather than object-prototype keys',()=>{
 const d=C.initial();d.sessions['2026-09-25']={exercises:[{name:'constructor',sets:[{kg:10,reps:8,done:true}]},{name:'__proto__',sets:[{kg:20,reps:8,done:true}]}]};
 assert.deepEqual(C.records(d).map(r=>r.name),['__proto__','constructor']);
});
