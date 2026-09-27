(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GymNavigation=api;})(typeof window==='undefined'?this:window,function(){
 'use strict';
 const tabs=[['today','house','Vandaag'],['workout','dumbbell','Trainen'],['inventory','package','Producten'],['stats','chart-no-axes-combined','Progressie'],['social','users','Groepen']];
 const quickPages=new Set(['usage','product','productEdit','usageHistory','measurement','exercise','reminder','photoAdd','photoDetail','planDay','settings','premium','privacy','help','socialGroupEdit','socialChallengeNew','socialJoin']);
 const isQuick=page=>quickPages.has(page);
 const keys=['page','date','weekday','context','exerciseId','productId','measurementId','photoId','photoAngle','photoBefore','photoAfter','groupId','challengeId','productStatsMonth','navSection'];
 function snapshot(ui){return Object.fromEntries(keys.filter(k=>ui[k]!==undefined).map(k=>[k,ui[k]]));}
 function section(page,ui={}){
  if(['inventory','products','product','productEdit','usage','usageHistory','productStats'].includes(page))return 'inventory';
  if(['workout','planning','planDay','exercise','planImport','aiPlan'].includes(page))return 'workout';
  if(['stats','body','measurement','photos','photoAdd','photoDetail','photoCompare'].includes(page))return 'stats';
  if(page.startsWith('social'))return 'social';
  return page==='today'?'today':ui.navSection||'today';
 }
 function key(ui){const p=ui.page;let parts=[p];if(['today','workout','reminder'].includes(p))parts.push(ui.date);if(p==='planDay')parts.push(ui.weekday);if(p==='exercise')parts.push(ui.context,ui.context==='plan'?ui.weekday:ui.date,ui.exerciseId||'new');if(['product','productEdit','usage','usageHistory'].includes(p))parts.push(ui.productId||'new');if(p==='measurement')parts.push(ui.measurementId||'new');if(p==='photoDetail')parts.push(ui.photoId);if(['socialGroup','socialGroupEdit','socialChallengeNew'].includes(p))parts.push(ui.groupId||'new');if(['socialChallenge','socialShare'].includes(p))parts.push(ui.challengeId);return parts.join(':');}
 function create(){const history=[];return {
  visit(current,next,{reset=false,replace=false,scroll=0}={}){
   if(reset){history.length=0;return;}
   let existing=-1;for(let i=history.length-1;i>=0;i--)if(key(history[i].ui)===key(next)){existing=i;break;}
   if(existing>=0){history.splice(existing);return;}
   if(!replace&&key(current)!==key(next)&&current.page!=='onboarding'){history.push({ui:snapshot(current),scroll});if(history.length>40)history.shift();}
  },
  back(){return history.pop()||null;},
  peek(){return history.at(-1)||null;},
  clear(){history.length=0;}
 };}
 return {tabs,snapshot,section,key,create,isQuick};
});
