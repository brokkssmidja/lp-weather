(function(){
const DEF={lat:44.2416,lon:-73.9835},TTL=30*60*1000,KEY='lpw-fc10';
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
function gridHours(g,k){const o={};(g?.properties?.[k]?.values||[]).forEach(v=>{const[a,b]=v.validTime.split('/'),t0=Date.parse(a),n=Math.max(1,Math.round(dur(b)/36e5));
 for(let q=0;q<n;q++)o[t0+q*36e5]=v.value;});return o;}
const skyHours=g=>gridHours(g,'skyCover');
async function getFc(){
 const ll=window.LKPL||DEF,pt=await j(`https://api.weather.gov/points/${ll.lat.toFixed(4)},${ll.lon.toFixed(4)}`);
 const [d,h,g]=await Promise.all([j(pt.properties.forecast),j(pt.properties.forecastHourly),
  pt.properties.forecastGridData?j(pt.properties.forecastGridData).catch(()=>null):Promise.resolve(null)]);
 const sk=skyHours(g),gu=gridHours(g,'windGust'),gk=String(g?.properties?.windGust?.uom||'km_h');
 const toMph=v=>v==null?null:/km_h/.test(gk)?v*0.621371:/m_s/.test(gk)?v*2.23694:/kt/.test(gk)?v*1.15078:v;
 const hourly=h.properties.periods.slice(0,168).map(p=>{const t=Date.parse(p.startTime),v=sk[t];return Object.assign(p,{sky:v==null?null:v,gust:toMph(gu[t]??null)});});
 const gtU=String(g?.properties?.temperature?.uom||'degC'),gtR=gridHours(g,'temperature'),gridT={};for(const k in gtR)if(gtR[k]!=null)gridT[k]=Math.round(/degF/.test(gtU)?gtR[k]:gtR[k]*9/5+32);
 return{at:Date.now(),daily:d.properties.periods,hourly,gridT,hasSky:!!g&&Object.keys(sk).length>0};}
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
const pill=(x,y,t,fill,fs,anc,fw)=>{const w=String(t).length*fs*0.6+6,h=fs+4,x0=anc==='end'?x-w+3:anc==='start'?x-3:x-w/2;return`<rect x="${x0.toFixed(1)}" y="${(y-fs*0.82-2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="3.5" fill="#0b3d5c" fill-opacity=".88"/><text x="${x}" y="${y}" fill="${fill}" font-size="${fs}" font-weight="${fw||700}" text-anchor="${anc||'middle'}">${t}</text>`;};
let lastFc=null;
function chart(hr){
 const A=window.LPAxis;if(!A||!hr||!hr.length)return'';
 const {W,H,T,B,L,R}=A,rg=A.range(),x=t=>A.x(t,rg),yb=H-B,ph=yb-T;
 const tOf=h=>Date.parse(h.startTime),endOf=h=>h.endTime?Date.parse(h.endTime):tOf(h)+36e5;
 const fhr=hr.filter(h=>{const t=tOf(h);return isFinite(t)&&endOf(h)>rg.now&&t<rg.t1+36e5;});
 const obs=(window.LPTempObs||[]).filter(o=>o&&o.t>=rg.t0-6e4&&o.t<=rg.now+6e4&&o.v!=null&&isFinite(o.v));
 const ts=fhr.map(h=>h.temperature).filter(v=>v!=null&&isFinite(v)).concat(obs.map(o=>o.v));
 if(!ts.length)return'<div class="nod">No temperature data</div>';
 const mn=Math.min(Math.floor(Math.min(...ts)/5)*5-2,28),mx=Math.max(Math.ceil(Math.max(...ts)/5)*5+2,36);
 const y=t=>T+(mx-t)*ph/(mx-mn),xf=t=>x(Math.max(t,rg.now)),xm=t=>x(Math.min(t,rg.now));
 let s=A.back(rg);
 const step=(mx-mn)>52?10:5;
 for(let t=Math.ceil(mn/step)*step;t<=mx;t+=step)s+=`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="#ffffff22"/><text x="${L-4}" y="${y(t)+3}" fill="#ffffffaa" font-size="9" text-anchor="end">${t}</text>`;
 s+=A.grid(rg);
 const y32=y(32);
 if(y32>T&&y32<yb)s+=`<rect x="${L}" y="${y32}" width="${W-L-R}" height="${yb-y32}" fill="rgba(127,216,255,0.12)"/>`;
 // cloud, then rain — same stacking as before, forecast hours only
 if(fhr.some(h=>h.sky!=null)){let seg=[];const flush=()=>{
  if(seg.length){const pts=seg.map(h=>`${xf(tOf(h)).toFixed(1)},${(yb-h.sky/100*ph).toFixed(1)}`);
   const x0=+pts[0].split(',')[0],x1=+pts[pts.length-1].split(',')[0];
   if(x1-x0>0.5)s+=`<polygon points="${x0},${yb} ${pts.join(' ')} ${x1},${yb}" fill="rgba(160,140,200,0.25)"/><polyline points="${pts.join(' ')}" fill="none" stroke="#8f78d0" stroke-width="1.5" stroke-dasharray="4 3"/>`;}
  seg=[];};
  fhr.forEach(h=>h.sky==null?flush():seg.push(h));flush();}
 fhr.forEach(h=>{const p=h.probabilityOfPrecipitation?.value||0;if(!p)return;const t=tOf(h),e=endOf(h);if(e<=rg.now||t>=rg.t1)return;
  const x0=xf(t),x1=x(Math.min(e,rg.t1));if(x1-x0<0.4)return;const bh=p/100*ph;
  s+=`<rect x="${x0.toFixed(1)}" y="${(yb-bh).toFixed(1)}" width="${(x1-x0).toFixed(1)}" height="${bh.toFixed(1)}" fill="#2b7bd6"/>`;});
 if(y32>T&&y32<yb)s+=`<line x1="${L}" x2="${W-R}" y1="${y32}" y2="${y32}" stroke="#7fd8ff" stroke-width="1.2" stroke-dasharray="6 3"/>`+pill(Math.min(W-R-36,L+4),y32+11,'32°F','#7fd8ff',9,'start');
 [0,50,100].forEach(p=>s+=`<text x="${W-R+3}" y="${yb-p/100*ph+3}" fill="#ffffff88" font-size="8">${p}%</text>`);
 const fpts=fhr.filter(h=>h.temperature!=null&&isFinite(h.temperature));
 if(fpts.length){
  const pts=fpts.map(h=>`${xf(tOf(h)).toFixed(1)},${y(h.temperature).toFixed(1)}`).join(' ');
  const x0=xf(tOf(fpts[0])),x1=xf(tOf(fpts[fpts.length-1]));
  s+=`<polygon points="${x0},${yb} ${pts} ${x1},${yb}" fill="url(#tgf)"/><polyline points="${pts}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const vals=fpts.map(h=>h.temperature),iM=vals.indexOf(Math.max(...vals)),im=vals.indexOf(Math.min(...vals));
  [[iM,-7],[im,13]].forEach(([i,dy])=>{const h=fpts[i],xx=xf(tOf(h));let yy=y(h.temperature)+dy;
   if(yy>yb-4)yy=yb-4;if(yy<T+10)yy=T+10;
   const anc=xx>W-R-18?'end':xx<L+18?'start':'middle';
   s+=`<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" fill="#ffd166" font-size="10" font-weight="700" text-anchor="${anc}">${h.temperature}°</text>`;});
 }
 if(obs.length>1){
  const pts=obs.map(o=>`${xm(o.t).toFixed(1)},${y(o.v).toFixed(1)}`).join(' ');
  const x0=xm(obs[0].t),x1=xm(obs[obs.length-1].t);
  s+=`<polygon points="${x0},${yb} ${pts} ${x1},${yb}" fill="url(#tgm)"/>`;
  s+=`<polyline points="${pts}" fill="none" stroke="#083044" stroke-width="4.2" stroke-linejoin="round" stroke-opacity=".75"/>`;
  s+=`<polyline points="${pts}" fill="none" stroke="#5ff2ff" stroke-width="2.15" stroke-linejoin="round" stroke-linecap="round"/>`;
  const lo=obs[obs.length-1],xx=xm(lo.t),yy=y(lo.v);
  s+=`<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.8" fill="#5ff2ff" stroke="#083044" stroke-width="1"/>`;
  const below=yy+18<yb-2;
  s+=pill(xx-3,below?yy+16:yy-8,Math.round(lo.v)+'°','#5ff2ff',9,'end');
 }
 s+=A.front(rg);
 const aria='Temperature, rain and cloud on a shared clock from 24 hours ago through the NWS forecast. Cyan is measured at Uihlein Farm, gold is the forecast, and the dashed line is now.';
 return `<svg class="axis" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="${aria}"><defs><linearGradient id="tgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd16655"/><stop offset="1" stop-color="#ffd16600"/></linearGradient><linearGradient id="tgm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ff2ff40"/><stop offset="1" stop-color="#5ff2ff00"/></linearGradient></defs>${s}</svg>`;}
function legend(fc){const obs=(window.LPTempObs||[]).length;
 return `<div class="lg">${obs?'<span><i class="ob"></i>Measured °F</span>':''}<span><i class="tp"></i>Forecast °F</span><span><i class="fz"></i>Freezing</span><span><i class="rn"></i>Rain %</span>${fc.hasSky?'<span><i class="cd"></i>Cloud %</span>':''}</div>`;}
function drawChart(fc){const el=$('chart');if(!el||!fc)return;el.innerHTML=chart(fc.hourly)+legend(fc);}
window.redrawForecastChart=function(){if(lastFc)drawChart(lastFc);};
function render(fc,stale){lastFc=fc;try{window.renderSummary&&renderSummary(fc);}catch(e){}
 window.renderNext12&&renderNext12(fc.hourly,fc.gridT);
 if(window.LPAxis){if(fc.hourly&&fc.hourly.length)LPAxis.setForecastEnd(Date.parse(fc.hourly[fc.hourly.length-1].startTime));LPAxis.syncNow();}
 window.renderWindFc&&renderWindFc(fc.hourly);
 $('days').innerHTML=days(fc.daily);drawChart(fc);
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
