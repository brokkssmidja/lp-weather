(function(){
const DEF={lat:44.2416,lon:-73.9835},TTL=30*60*1000,KEY='lpw-fc8';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function icon(s,night){s=(s||'').toLowerCase();
 if(/thunder/.test(s))return'⛈️';if(/snow|flurr|sleet|ice/.test(s))return'🌨️';
 if(/rain|shower|drizzle/.test(s))return/chance|slight|scattered|isolated/.test(s)?'🌦️':'🌧️';
 if(/fog|haze|mist/.test(s))return'🌫️';if(/wind|breez/.test(s)&&!/cloud/.test(s))return'💨';
 if(/mostly cloudy|cloudy|overcast/.test(s))return/partly|mostly sunny|mostly clear/.test(s)?'⛅':'☁️';
 if(/partly/.test(s))return night?'☁️':'⛅';return night?'🌙':'☀️';}
async function j(u){const r=await fetch(u,{headers:{Accept:'application/geo+json'}});if(!r.ok)throw new Error(r.status+' '+u.split('/').slice(-2).join('/'));return r.json();}
function dur(s){const m=/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(s)||[];return((+m[1]||0)*24+(+m[2]||0)+(+m[3]||0)/60)*36e5;}
function skyHours(g){const o={};(g?.properties?.skyCover?.values||[]).forEach(v=>{const[a,b]=v.validTime.split('/'),t0=Date.parse(a),n=Math.max(1,Math.round(dur(b)/36e5));
 for(let k=0;k<n;k++)o[t0+k*36e5]=v.value;});return o;}
async function getFc(){
 const ll=window.LKPL||DEF,pt=await j(`https://api.weather.gov/points/${ll.lat.toFixed(4)},${ll.lon.toFixed(4)}`);
 const [d,h,g]=await Promise.all([j(pt.properties.forecast),j(pt.properties.forecastHourly),
  pt.properties.forecastGridData?j(pt.properties.forecastGridData).catch(()=>null):Promise.resolve(null)]);
 const sk=skyHours(g),hourly=h.properties.periods.slice(0,168).map(p=>{const t=Date.parse(p.startTime),v=sk[t];return Object.assign(p,{sky:v==null?null:v});});
 return{at:Date.now(),daily:d.properties.periods,hourly,hasSky:!!g&&Object.keys(sk).length>0};}
function part(p,lbl){if(!p)return`<div class="pt"><div class="pl">${lbl}</div><div class="t">—</div></div>`;
 const pp=p.probabilityOfPrecipitation?.value||0;
 return`<div class="pt"><div class="pl">${esc(p.name)}</div><div class="i">${icon(p.shortForecast,!p.isDaytime)}</div>
  <div class="hl${p.isDaytime?'':' lo'}">${p.temperature}°</div><div class="pp">💧 ${pp}%</div><div class="t">${esc(p.shortForecast)}</div></div>`;}
function days(per){
 const out=[];let i=0;
 while(i<per.length){const p=per[i];
  if(p.isDaytime){const n=per[i+1]&&!per[i+1].isDaytime?per[i+1]:null;out.push({day:p,night:n});i+=n?2:1;}
  else{out.push({day:null,night:p});i++;}}
 return out.map((o,k)=>{const m=o.day||o.night,d=new Date(m.startTime);
  const name=k===0?'Today':d.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'});
  return`<div class="day"><div class="n">${esc(name)}</div><div class="dn">${part(o.day,'Day')}${part(o.night,'Night')}</div></div>`;}).join('');}
function chart(hr){
 const W=400,H=180,L=26,R=24,T=12,B=26,n=hr.length;if(!n)return'';
 const ts=hr.map(h=>h.temperature),mn=Math.min(Math.floor(Math.min(...ts)/5)*5-2,28),mx=Math.max(Math.ceil(Math.max(...ts)/5)*5+2,36);
 const x=i=>L+i*(W-L-R)/(n-1),y=t=>T+(mx-t)*(H-T-B)/(mx-mn),bw=(W-L-R)/n;let s='';
 for(let t=Math.ceil(mn/5)*5;t<=mx;t+=5)s+=`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="#ffffff22"/><text x="${L-4}" y="${y(t)+3}" fill="#ffffffaa" font-size="9" text-anchor="end">${t}</text>`;
 s+=`<rect x="${L}" y="${y(32)}" width="${W-L-R}" height="${H-B-y(32)}" fill="rgba(127,216,255,0.12)"/>`;
 const cl=hr.map((h,i)=>h.sky==null?null:`${x(i).toFixed(1)},${(H-B-h.sky/100*(H-T-B)).toFixed(1)}`);
 if(cl.some(v=>v)){let seg=[];const flush=()=>{if(seg.length>1){const i0=seg[0],i1=seg[seg.length-1];s+=`<polygon points="${x(i0)},${H-B} ${seg.map(i=>cl[i]).join(' ')} ${x(i1)},${H-B}" fill="rgba(160,140,200,0.25)"/><polyline points="${seg.map(i=>cl[i]).join(' ')}" fill="none" stroke="#8f78d0" stroke-width="1.5" stroke-dasharray="4 3"/>`;}seg=[];};
  cl.forEach((v,i)=>v?seg.push(i):flush());flush();}
 hr.forEach((h,i)=>{const p=h.probabilityOfPrecipitation?.value||0;if(p)s+=`<rect x="${x(i)-bw/2}" y="${H-B-p/100*(H-T-B)}" width="${bw}" height="${p/100*(H-T-B)}" fill="#2b7bd6"/>`;
  const d=new Date(h.startTime),hh=+d.toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false})%24;
  if(hh===0){s+=`<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H-B}" stroke="#ffffff55" stroke-dasharray="2 3"/><text x="${x(i)+3}" y="${H-B+12}" fill="#fff" font-size="${n>96?9:10}">${d.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short'})}</text>`;}
  else if(hh===12&&n<=96||hh%6===0&&n<=72)s+=`<text x="${x(i)}" y="${H-B+22}" fill="#ffffff88" font-size="8" text-anchor="middle">${hh%12||12}${hh<12?'a':'p'}</text>`;});
 [0,50,100].forEach(p=>s+=`<text x="${W-R+3}" y="${H-B-p/100*(H-T-B)+3}" fill="#ffffff88" font-size="8">${p}%</text>`);
 s+=`<line x1="${L}" x2="${W-R}" y1="${y(32)}" y2="${y(32)}" stroke="#7fd8ff" stroke-width="1.2" stroke-dasharray="6 3"/><text x="${L+3}" y="${y(32)+10}" fill="#7fd8ff" font-size="9" font-weight="600" stroke="#0b3d5c" stroke-width="2.5" paint-order="stroke">32°F</text>`;
 const pts=hr.map((h,i)=>`${x(i).toFixed(1)},${y(h.temperature).toFixed(1)}`).join(' ');
 s+=`<polygon points="${x(0)},${H-B} ${pts} ${x(n-1)},${H-B}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round"/>`;
 const iM=ts.indexOf(Math.max(...ts)),im=ts.indexOf(Math.min(...ts));
 [[iM,-6],[im,13]].forEach(([i,dy])=>s+=`<text x="${x(i)}" y="${y(ts[i])+dy}" fill="#ffd166" font-size="10" font-weight="700" text-anchor="middle">${ts[i]}°</text>`);
 return`<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd16655"/><stop offset="1" stop-color="#ffd16600"/></linearGradient></defs>${s}</svg>`;}
function render(fc,stale){$('days').innerHTML=days(fc.daily);$('chart').innerHTML=chart(fc.hourly)+`<div class="lg"><span><i class="tp"></i>Temp °F</span><span><i class="fz"></i>Freezing</span><span><i class="rn"></i>Rain %</span>${fc.hasSky?'<span><i class="cd"></i>Cloud %</span>':''}</div>`;
 $('ftime').textContent='Forecast updated '+new Date(fc.at).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'+(stale?' (saved copy)':'');}
let busy=false;
window.loadForecast=async function(force){
 let c=null;try{c=JSON.parse(localStorage.getItem(KEY));}catch{}
 if(c)render(c,false);if(busy||(!force&&c&&Date.now()-c.at<TTL))return;busy=true;
 try{let fc,err;for(let k=0;k<2&&!fc;k++){try{fc=await getFc();}catch(e){err=e;await new Promise(r=>setTimeout(r,1500));}}
  if(!fc)throw err;localStorage.setItem(KEY,JSON.stringify(fc));render(fc);$('ferr').textContent='';}
 catch(e){$('ferr').textContent='Forecast unavailable ('+e.message+')'+(c?' — showing last saved forecast.':'');if(c)render(c,true);}
 finally{busy=false;}};
setTimeout(()=>loadForecast(),300);setInterval(()=>loadForecast(),TTL);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadForecast();});
})();
