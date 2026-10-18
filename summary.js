// One-sentence plain-English summary of the next ~36 h, built from NWS hourly + 7-day periods (no external API).
(function(root){
const TZ='America/New_York',H=36e5;
const hourOf=t=>+new Date(t).toLocaleString('en-US',{timeZone:TZ,hour:'numeric',hour12:false})%24;
const hm=t=>{const h=hourOf(t);return h===0?'midnight':h===12?'noon':(h%12)+(h<12?' AM':' PM');};
const wkday=t=>new Date(t).toLocaleString('en-US',{timeZone:TZ,weekday:'long'});
const num=w=>{const m=String(w||'').match(/\d+/g);return m?Math.max(...m.map(Number)):0;};
const pop=h=>h.probabilityOfPrecipitation?.value||0;
function label(p){const n=String(p.name||'');
 if(/^(today|tonight|overnight|this (morning|afternoon|evening)|late afternoon|rest of today)$/i.test(n))return n.toLowerCase();
 return wkday(Date.parse(p.startTime))+(p.isDaytime?'':' night');}
function skyWord(hrs,p){const sk=hrs.map(h=>h.sky).filter(v=>v!=null&&isFinite(v));const day=p.isDaytime;
 if(sk.length){const a=sk.reduce((x,y)=>x+y,0)/sk.length;return a<25?(day?'sunny':'clear'):a<50?(day?'mostly sunny':'mostly clear'):a<70?'partly cloudy':a<88?'mostly cloudy':'cloudy';}
 const t=String(p.shortForecast||'').toLowerCase();
 if(/mostly sunny|mostly clear/.test(t))return day?'mostly sunny':'mostly clear';if(/partly/.test(t))return'partly cloudy';
 if(/mostly cloudy/.test(t))return'mostly cloudy';if(/cloudy|overcast|rain|snow|shower|drizzle|thunder/.test(t))return'cloudy';if(/fog/.test(t))return'foggy';
 return day?'sunny':'clear';}
function precip(hrs,p,first){
 const wet=hrs.filter(h=>pop(h)>=40);if(!wet.length)return null;
 const txt=wet.map(h=>String(h.shortForecast||'')).join(' ').toLowerCase()+' '+String(p.detailedForecast||p.shortForecast||'').toLowerCase();
 const cold=wet.some(h=>h.temperature<=33),snowTxt=/snow|flurr|sleet|freezing rain|wintry/.test(txt),rainTxt=/rain|shower|drizzle|thunder/.test(txt);
 const type=snowTxt||cold?(rainTxt&&!cold?'rain and snow':/sleet|freezing rain/.test(txt)?'snow and ice':'snow'):/thunder/.test(txt)?'storms':'rain';
 const mx=Math.max(...wet.map(pop)),lk=mx>=70?'likely':'possible';
 const i0=hrs.indexOf(wet[0]),i1=hrs.indexOf(wet[wet.length-1]);let when='';
 if(i0>0)when=` after ${hm(wet[0].startTime)}`;else if(i1<hrs.length-2)when=` until ${hm(Date.parse(wet[wet.length-1].startTime)+H)}`;
 return{kind:/snow|ice/.test(type)?'snow':'rain',txt:`${type} ${lk}${when}`,sev:/snow|ice/.test(type)?4:3};}
function analyze(p,hourly,now,end){
 const s=Math.max(Date.parse(p.startTime),now-H+1),e=Math.min(Date.parse(p.endTime),end);
 const hrs=hourly.filter(h=>{const t=Date.parse(h.startTime);return t+H>s&&t<e;});if(!hrs.length)return null;
 const temps=hrs.map(h=>h.temperature),lo=Math.min(...temps),hi=Math.max(...temps);
 const g=Math.max(...hrs.map(h=>Math.max(h.gust||0,num(h.windSpeed))));
 let gpk=hrs[0];hrs.forEach(h=>{if(Math.max(h.gust||0,num(h.windSpeed))>Math.max(gpk.gust||0,num(gpk.windSpeed)))gpk=h;});const gh=hourOf(gpk.startTime);
 const pr=precip(hrs,p);const lb=label(p),day=p.isDaytime;
 const T=p.temperature!=null?p.temperature:(day?hi:lo);
 // frost: overnight low, or a frosty start to a morning period
 let frost=null;const mlo=day?Math.min(...hrs.filter(h=>hourOf(h.startTime)<10).map(h=>h.temperature)):Math.min(lo,T);
 if(mlo<=32)frost={hard:mlo<=28,lo:mlo,morning:day};
 const risks=[];if(g>=58)risks.push({kind:'wind',sev:6,c:'red'});else if(g>=45)risks.push({kind:'wind',sev:5,c:'orange'});else if(g>=30)risks.push({kind:'wind',sev:2,c:'yellow'});
 if(pr)risks.push({kind:pr.kind,sev:pr.sev,c:pr.kind});if(frost)risks.push({kind:'frost',sev:frost.morning?3:frost.hard?3.5:3,c:'frost'});
 return{p,lb,wlb:day?(lb==='today'?(gh<12?'this morning':'this afternoon'):/ /.test(lb)?lb:lb+(gh<12?' morning':' afternoon')):lb,day,T,g,pr,frost,hrs,sky:skyWord(hrs,p),sev:Math.max(0,...risks.map(r=>r.sev)),risk:risks.sort((a,b)=>b.sev-a.sev)[0]||null};}
function clause(a,lead){
 const fz=a.frost?(a.frost.hard?'a hard freeze':'frost'):'',lo=a.frost?Math.min(a.T,a.frost.lo):a.T;
 const sky=a.pr&&/sunny|clear/.test(a.sky)?(/until/.test(a.pr.txt)?'clearing':'clouds increasing'):a.sky;
 const w=a.g>=30?`gusts to ${Math.round(a.g/5)*5} mph`:'';
 const snowy=a.pr&&a.pr.kind==='snow';
 const k=lead&&a.risk?a.risk.kind:null;
 if(a.day){const ms=a.frost&&a.frost.morning&&!a.prevFrost;
  if(k==='wind')return`${w} ${a.wlb}, ${sky}${a.pr?' with '+a.pr.txt:''}, high ${a.T}°F`;
  if(k==='rain'||k==='snow')return`${a.pr.txt} ${a.lb}, high ${a.T}°F${w?', '+w:''}`;
  if(k==='frost'&&ms)return`frost early ${a.lb}, then ${sky}, high ${a.T}°F${w?', '+w:''}`;
  return`${ms?'frosty start, then ':''}${sky} ${a.lb}${a.pr?' with '+a.pr.txt:''}, high ${a.T}°F${w?', '+w:''}`;}
 const frostTxt=a.frost&&!snowy;
 if(k==='wind')return`${w} ${a.lb}, ${sky}${a.pr?' with '+a.pr.txt:''}${frostTxt?`, then ${fz} (low ${lo}°F)`:`, low ${lo}°F`}`;
 if(k==='rain'||k==='snow')return`${a.pr.txt} ${a.lb}${frostTxt?`, then ${fz} (low ${lo}°F)`:`, low ${lo}°F`}${w?', '+w:''}`;
 if(k==='frost')return`${a.frost.hard?'hard freeze':'frost'} ${a.lb} (low ${lo}°F)${a.pr?' after '+a.pr.txt:', '+sky}${w?', '+w:''}`;
 if(a.pr)return`${sky} ${a.lb} with ${a.pr.txt}${frostTxt?`, then ${fz} (low ${lo}°F)`:`, low ${lo}°F`}${w?', '+w:''}`;
 if(frostTxt)return`${sky} with ${fz} ${a.lb} (low ${lo}°F)${w?', '+w:''}`;
 return`${sky} ${a.lb}, low ${lo}°F${w?', '+w:''}`;}
function summarize(fc,now){
 now=now??Date.now();const end=now+36*H;
 if(!fc||!Array.isArray(fc.hourly)||!Array.isArray(fc.daily)||!fc.hourly.length)return null;
 const per=fc.daily.filter(p=>Date.parse(p.endTime)>now&&Date.parse(p.startTime)<end).slice(0,4);
 const A=per.map(p=>analyze(p,fc.hourly,now,end)).filter(a=>a&&(a.hrs.length>=3||a===null));if(!A.length)return null;
 A.forEach((a,i)=>{a.prevFrost=i>0&&!!A[i-1].frost&&!A[i-1].day;if(a.day&&a.frost&&a.frost.morning&&a.prevFrost){a.frost=null;a.sev=Math.max(0,...(a.g>=58?[6]:a.g>=45?[5]:a.g>=30?[2]:[0]),a.pr?a.pr.sev:0);if(a.risk&&a.risk.kind==='frost')a.risk=a.sev?{kind:a.pr?a.pr.kind:'wind',sev:a.sev,c:a.pr?a.pr.kind:a.g>=58?'red':a.g>=45?'orange':'yellow'}:null;}});
 let li=-1,ms=0;A.forEach((a,i)=>{if(a.sev>ms){ms=a.sev;li=i;}});if(li>0&&A[0].sev>0&&A[0].sev>=ms-0.5)li=0;
 const build=n=>{const use=A.slice(0,n);let order=use.map((a,i)=>i);
  if(li>=0&&li<n){order=[li,...order.filter(i=>i!==li)];}
  else if(li>=n)return null;
  let s=order.map(i=>clause(use[i],i===li)).join('; ');s=s.charAt(0).toUpperCase()+s.slice(1)+'.';return s;};
 let s=null;for(let n=Math.min(3,A.length);n>=1;n--){const t=build(n);if(t&&(t.length<=165||n===1)){s=t;break;}}
 if(!s){ // lead risk lies beyond the clauses that fit: lead with it, then the first period
  s=[clause(A[li],true),clause(A[0],false)].join('; ');s=s.charAt(0).toUpperCase()+s.slice(1)+'.';}
 const r=li>=0?A[li].risk:null;
 return{text:s,accent:r?r.c:null,kind:r?r.kind:null};}
root.wxSummarize=summarize;
if(typeof document!=='undefined'){let last=null;
 root.renderSummary=function(fc){if(fc)last=fc;const el=document.getElementById('wsum');if(!el)return;
  let r=null;try{r=summarize(last);}catch(e){console.warn('summary',e);}
  if(!r){el.hidden=true;return;}el.hidden=false;el.textContent=r.text;el.className='wsum'+(r.accent?' a-'+r.accent:'');};
 setInterval(()=>root.renderSummary(),5*60*1000);}
if(typeof module!=='undefined')module.exports=summarize;
})(typeof window!=='undefined'?window:globalThis);
