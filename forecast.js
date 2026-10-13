(function(){
const DEF={lat:44.2416,lon:-73.9835},TTL=30*60*1000,KEY='lpw-fc';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function icon(s,night){s=(s||'').toLowerCase();
 if(/thunder/.test(s))return'⛈️';if(/snow|flurr|sleet|ice/.test(s))return'🌨️';
 if(/rain|shower|drizzle/.test(s))return/chance|slight|scattered|isolated/.test(s)?'🌦️':'🌧️';
 if(/fog|haze|mist/.test(s))return'🌫️';if(/wind|breez/.test(s)&&!/cloud/.test(s))return'💨';
 if(/mostly cloudy|cloudy|overcast/.test(s))return/partly|mostly sunny|mostly clear/.test(s)?'⛅':'☁️';
 if(/partly/.test(s))return night?'☁️':'⛅';return night?'🌙':'☀️';}
async function j(u){const r=await fetch(u,{headers:{Accept:'application/geo+json'}});if(!r.ok)throw new Error(r.status+' '+u.split('/').slice(-2).join('/'));return r.json();}
async function getFc(){
 const ll=window.LKPL||DEF,pt=await j(`https://api.weather.gov/points/${ll.lat.toFixed(4)},${ll.lon.toFixed(4)}`);
 const [d,h]=await Promise.all([j(pt.properties.forecast),j(pt.properties.forecastHourly)]);
 return{at:Date.now(),daily:d.properties.periods,hourly:h.properties.periods.slice(0,72)};}
function days(per){
 const out=[];let i=0;
 while(i<per.length&&out.length<3){const p=per[i];
  if(p.isDaytime){const n=per[i+1]&&!per[i+1].isDaytime?per[i+1]:null;out.push({name:out.length?p.name:'Today',day:p,night:n});i+=n?2:1;}
  else{out.push({name:'Tonight',day:null,night:p});i++;}}
 return out.map(o=>{const m=o.day||o.night,pp=Math.max(o.day?.probabilityOfPrecipitation?.value||0,o.night?.probabilityOfPrecipitation?.value||0);
  return`<div class="day"><div class="n">${esc(o.name)}</div><div class="i">${icon(m.shortForecast,!o.day)}</div>
  <div class="hl">${o.day?o.day.temperature+'°':''}${o.day&&o.night?' / ':''}<span class="lo">${o.night?o.night.temperature+'°':''}</span></div>
  <div class="pp">💧 ${pp}%</div><div class="t">${esc(m.shortForecast)}</div></div>`;}).join('');}
function chart(hr){
 const W=400,H=170,L=26,R=8,T=12,B=26,n=hr.length;if(!n)return'';
 const ts=hr.map(h=>h.temperature),mn=Math.floor(Math.min(...ts)/5)*5-2,mx=Math.ceil(Math.max(...ts)/5)*5+2;
 const x=i=>L+i*(W-L-R)/(n-1),y=t=>T+(mx-t)*(H-T-B)/(mx-mn),bw=(W-L-R)/n;let s='';
 for(let t=Math.ceil(mn/5)*5;t<=mx;t+=5)s+=`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="#ffffff22"/><text x="${L-4}" y="${y(t)+3}" fill="#ffffffaa" font-size="9" text-anchor="end">${t}</text>`;
 hr.forEach((h,i)=>{const p=h.probabilityOfPrecipitation?.value||0;if(p)s+=`<rect x="${x(i)-bw/2}" y="${H-B-p/100*(H-T-B)}" width="${bw}" height="${p/100*(H-T-B)}" fill="#4fa8ff55"/>`;
  const d=new Date(h.startTime),hh=+d.toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false})%24;
  if(hh===0){s+=`<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H-B}" stroke="#ffffff55" stroke-dasharray="2 3"/><text x="${x(i)+3}" y="${H-B+12}" fill="#fff" font-size="10">${d.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short'})}</text>`;}
  else if(hh%6===0)s+=`<text x="${x(i)}" y="${H-B+22}" fill="#ffffff88" font-size="8" text-anchor="middle">${hh%12||12}${hh<12?'a':'p'}</text>`;});
 const pts=hr.map((h,i)=>`${x(i).toFixed(1)},${y(h.temperature).toFixed(1)}`).join(' ');
 s+=`<polygon points="${x(0)},${H-B} ${pts} ${x(n-1)},${H-B}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round"/>`;
 const iM=ts.indexOf(Math.max(...ts)),im=ts.indexOf(Math.min(...ts));
 [[iM,-6],[im,13]].forEach(([i,dy])=>s+=`<text x="${x(i)}" y="${y(ts[i])+dy}" fill="#ffd166" font-size="10" font-weight="700" text-anchor="middle">${ts[i]}°</text>`);
 return`<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd16655"/><stop offset="1" stop-color="#ffd16600"/></linearGradient></defs>${s}</svg>`;}
function render(fc,stale){$('days').innerHTML=days(fc.daily);$('chart').innerHTML=chart(fc.hourly);
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
