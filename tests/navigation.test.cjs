const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../app/navigation.js');
test('all product tasks stay in Producten, all exercise contexts stay in Trainen',()=>{
 for(const page of ['inventory','product','productEdit','usage','usageHistory','productStats'])assert.equal(N.section(page),'inventory');
 for(const context of ['session','plan'])assert.equal(N.section('exercise',{context}),'workout');
 for(const page of ['stats','body','measurement','photos','photoAdd','photoCompare','photoDetail'])assert.equal(N.section(page),'stats');
 assert.equal(N.section('settings',{navSection:'social'}),'social');
});
test('back restores workout date and settings origin without losing context',()=>{
 const r=N.create(),old={page:'workout',date:'2026-01-07',navSection:'workout'};
 r.visit({page:'stats'},old);r.visit(old,{...old,page:'settings'},{scroll:418});
 assert.deepEqual(r.back(),{ui:old,scroll:418});assert.equal(r.back().ui.page,'stats');
});
test('saving a new product does not put its form into the back path',()=>{
 const r=N.create(),inventory={page:'inventory'},edit={page:'productEdit',productId:null},product={page:'product',productId:'creatine'};
 r.visit(inventory,edit);r.visit(edit,product,{replace:true});assert.equal(r.back().ui.page,'inventory');assert.equal(r.back(),null);
});
test('returning to a parent removes the form and prevents back loops',()=>{
 const r=N.create(),plan={page:'planning'},day={page:'planDay',weekday:2},form={page:'exercise',context:'plan',weekday:2,exerciseId:null};
 r.visit(plan,day);r.visit(day,form);r.visit(form,day,{replace:true});assert.equal(r.back().ui.page,'planning');assert.equal(r.back(),null);
});
test('switching a primary tab resets unrelated back history',()=>{
 const r=N.create();r.visit({page:'inventory'},{page:'product',productId:'a'});r.visit({page:'product',productId:'a'},{page:'today',date:'2026-09-27'},{reset:true});assert.equal(r.back(),null);
});
test('route identity separates records and weekdays, excludes form drafts',()=>{
 assert.notEqual(N.key({page:'exercise',context:'plan',weekday:1}),N.key({page:'exercise',context:'plan',weekday:2}));
 assert.notEqual(N.key({page:'workout',date:'2026-09-26'}),N.key({page:'workout',date:'2026-09-27'}));
 assert.deepEqual(N.snapshot({page:'product',productId:'a',productDraft:{name:'private draft'}}),{page:'product',productId:'a'});
});
