const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../app/product-model.js');
function harness(result){
 let resolve,scanCalls=0;const messages=[],routes=[];
 const form={isConnected:true,elements:Object.fromEntries(Object.entries({name:'Eigen product',barcode:'old',stock:'100',total:'200',detail:'Merk',defaultAmount:'2'}).map(([name,value])=>[name,{value}])),querySelectorAll:()=>[]};
 const status={textContent:''};
 const G={data:{products:[],usages:[]},ui:{page:'productEdit',productId:null,productDraft:{id:'',ratios:{}}},actions:{},forms:{},pages:{},afterRender:[],e:String,fmt:String,icon:()=>'',toast:m=>messages.push(m),render(){},navigate(page,params){routes.push({page,params});Object.assign(this.ui,params,{page});if(page==='productEdit')this.ui.productDraft={id:'',barcode:'',ratios:{}};}};
 const B={key:s=>{if(!/^[\x20-\x7e]{1,64}$/.test(s))throw Error('Barcode');return /^\d{12}$/.test(s)?'0'+s:s;},scan(){scanCalls++;return result?Promise.resolve(result):new Promise(r=>{resolve=r;});}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/products.js'),'utf8'),{window:{Gym:G,GymProducts:M,GymBarcode:B},GymBarcode:B,document:{getElementById:id=>id==='product-form'?form:id==='barcode-result'?status:null}});
 return {G,form,status,messages,routes,button:{disabled:false},resolve:r=>resolve(r),get scanCalls(){return scanCalls;}};
}
test('a scan fills only the barcode while preserving the unfinished product form and does not save',async()=>{
 const h=harness({barcode:'5901234123457'});
 await h.G.actions['product-scan'](h.button);
 assert.equal(h.form.elements.barcode.value,'5901234123457');
 assert.equal(h.G.ui.productDraft.name,'Eigen product');
 assert.equal(h.G.ui.productDraft.stock,'100');
 assert.equal(h.G.data.products.length,0);
 assert.match(h.status.textContent,/5901234123457/);
 assert.equal(h.routes.length,0);assert.equal(h.button.disabled,false);
});
test('cancel or a result arriving after the form closes never overwrites the product',async()=>{
 for(const cancel of [true,false]){
  const h=harness();const promise=h.G.actions['product-scan'](h.button);
  assert.equal(h.button.disabled,true);
  if(!cancel)h.form.isConnected=false;
  h.resolve(cancel?{cancelled:true}:{barcode:'5901234123457'});await promise;
  assert.equal(h.form.elements.barcode.value,'old');assert.equal(h.G.ui.productDraft.barcode,'old');assert.equal(h.button.disabled,false);
 }
});
test('scanning a saved UPC opens the matching EAN product and ignores unrelated invalid manual codes',async()=>{
 const h=harness({barcode:'012345678905'});
 h.G.data.products=[{id:'other',barcode:'onbekend 📦'},{id:'match',barcode:'0012345678905'}];
 await h.G.actions['inventory-scan'](h.button);
 assert.equal(h.routes.length,1);assert.equal(h.routes[0].page,'product');assert.equal(h.routes[0].params.productId,'match');
});
test('an unknown scanned product starts an unsaved form with its code, without inventing contents or stock',async()=>{
 const h=harness({barcode:'5901234123457'});
 await h.G.actions['inventory-scan'](h.button);
 assert.equal(h.routes[0].page,'productEdit');assert.equal(h.G.ui.productDraft.barcode,'5901234123457');
 assert.equal(h.G.data.products.length,0);assert.equal(h.G.data.usages.length,0);
});
