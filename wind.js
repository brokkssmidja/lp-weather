(function(){
const $=id=>document.getElementById(id);
const DIRS={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
const tz={timeZone:'America/New_York'};
const ok=v=>v!=null&&isFinite(v);
const BANDS=[{lo:30,hi:45,name:'Watch',lbl:'30–45 mph · 13–20 m/s',fill:'rgba(255,214,102,0.10)',c:'#ffd166'},
 {lo:45,hi:58,name:'Advisory',lbl:'45–58 mph · 20–26 m/s',fill:'rgba(255,159,67,0.14)',c:'#ff9f43'},
 {lo:58,hi:1e4,name:'Warning',lbl:'58+ mph · 26+ m/s',fill:'rgba(255,90,90,0.15)',c:'#ff6b6b'}];
const gcol=g=>g>=58?'#ff6b6b':g>=45?'#ff9f43':g>=30?'#ffd166':'#f78fb3';
// pts: [{t:ms, s:mph|null, g:mph|null, d:deg-from|null}]
window.windChart=function(pts,o){
 o=o||{};const W=400,H=170,L=26,R=24,T=18,B=26,n=pts.length;
 if(n<2||!pts.some(p=>ok(p.s)||ok(p.g)))return'<div class="nod">No wind data available</div>';
 const mxv=Math.max(...pts.map(p=>Math.max(ok(p.s)?p.s:0,ok(p.g)?p.g:0))),mx=Math.max(50,Math.ceil((mxv+5)/10)*10);
 const t0=pts[0].t,t1=pts[n-1].t,x=t=>L+(t-t0)*(W-L-R)/(t1-t0||1),y=v=>T+(mx-v)*(H-T-B)/mx;let s='';
 const step=mx>60?20:10;
 for(let v=0;v<=mx;v+=step)s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff22"/><text x="${L-4}" y="${y(v)+3}" fill="#ffffffaa" font-size="9" text-anchor="end">${v}</text><text x="${W-R+3}" y="${y(v)+3}" fill="#ffffff77" font-size="8">${Math.round(v*0.44704)}</text>`;
 s+=`<text x="${L-4}" y="${T-11}" fill="#ffffffaa" font-size="8" text-anchor="end">mph</text><text x="${W-R+3}" y="${T-11}" fill="#ffffff77" font-size="8">m/s</text>`;
 let pk0=null;pts.forEach(p=>{if(ok(p.g)&&(!pk0||p.g>pk0.g))pk0=p;});const lblR=!pk0||x(pk0.t)<W/2;
 BANDS.forEach(b=>{const top=Math.min(b.hi,mx);if(b.lo>=mx)return;s+=`<rect x="${L}" y="${y(top)}" width="${W-L-R}" height="${y(b.lo)-y(top)}" fill="${b.fill}"/><text x="${lblR?W-R-2:L+3}" y="${y(b.lo)-3}" fill="${b.c}" font-size="8" font-weight="600" text-anchor="${lblR?'end':'start'}" opacity=".9">${b.name} ${b.lbl}</text>`;});
 // time axis
 let lastDay=null;pts.forEach(p=>{const d=new Date(p.t),hh=+d.toLocaleString('en-US',{...tz,hour:'numeric',hour12:false})%24,mi=d.getUTCMinutes();
  if(mi!==0)return;
  if(o.daily){if(hh===0){s+=`<line x1="${x(p.t)}" x2="${x(p.t)}" y1="${T}" y2="${H-B}" stroke="#ffffff55" stroke-dasharray="2 3"/><text x="${x(p.t)+3}" y="${H-B+12}" fill="#fff" font-size="9">${d.toLocaleString('en-US',{...tz,weekday:'short'})}</text>`;}}
  else if(hh%6===0){const lb=hh===0?d.toLocaleString('en-US',{...tz,weekday:'short'}):(hh%12||12)+(hh<12?'a':'p');
   s+=`<line x1="${x(p.t)}" x2="${x(p.t)}" y1="${T}" y2="${H-B}" stroke="#ffffff22"/><text x="${x(p.t)}" y="${H-B+12}" fill="${hh===0?'#fff':'#ffffffaa'}" font-size="9" text-anchor="middle">${lb}</text>`;}});
 const line=(k,attrs)=>{let seg=[],out='';const fl=()=>{if(seg.length>1)out+=`<polyline points="${seg.join(' ')}" fill="none" ${attrs}/>`;else if(seg.length===1){const[a,b]=seg[0].split(',');out+=`<circle cx="${a}" cy="${b}" r="1.5" fill="#fff"/>`;}seg=[];};
  pts.forEach(p=>ok(p[k])?seg.push(`${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`):fl());fl();return out;};
 for(let i=1;i<n;i++){const p=pts[i-1],q=pts[i];if(!ok(p.g)||!ok(q.g))continue;s+=`<line x1="${x(p.t).toFixed(1)}" y1="${y(p.g).toFixed(1)}" x2="${x(q.t).toFixed(1)}" y2="${y(q.g).toFixed(1)}" stroke="${gcol(Math.max(p.g,q.g))}" stroke-width="1.4" stroke-linecap="round"/>`;}
 s+=line('s','stroke="#6ee7b7" stroke-width="2" stroke-linejoin="round"');
 // arrows (pointing where wind blows to)
 const every=o.arrowEveryMs||36e5;let next=t0;
 pts.forEach(p=>{if(p.t<next||!ok(p.d))return;next=p.t+every;
  s+=`<g transform="translate(${x(p.t).toFixed(1)},${T-9}) rotate(${(p.d+180)%360})"><path d="M0,-5 L3,2 L0,0.5 L-3,2 Z" fill="#e6ecf2" opacity=".85"/></g>`;});
 // peak gust
 if(o.peak){let pk=null;pts.forEach(p=>{if(ok(p.g)&&(!pk||p.g>pk.g))pk=p;});
  if(pk){const px=x(pk.t),py=y(pk.g),tm=new Date(pk.t).toLocaleString('en-US',{...tz,weekday:'short',hour:'numeric',minute:'2-digit'});
   const anc=px>W*0.7?'end':px<W*0.3?'start':'middle';
   s+=`<circle cx="${px}" cy="${py}" r="3.5" fill="none" stroke="${gcol(pk.g)}" stroke-width="1.5"/><text x="${px}" y="${Math.max(py-6,T+8)}" fill="${gcol(pk.g)}" font-size="9.5" font-weight="700" text-anchor="${anc}" stroke="#0b3d5c" stroke-width="2.5" paint-order="stroke">Peak ${Math.round(pk.g)} mph (${Math.round(pk.g*0.44704)} m/s) · ${tm}</text>`;}}
 return`<svg viewBox="0 0 ${W} ${H}">${s}</svg><div class="lg"><span><i class="ws"></i>Speed</span><span><i class="wg"></i>Gust</span><span><i class="bw"></i>Watch 30+</span><span><i class="ba"></i>Advisory 45+</span><span><i class="bx"></i>Warning 58+</span><span>➤ Direction</span></div>`;};

// ---- Measured wind (NYS Mesonet timeseries2, 5-min) ----
const MS=v=>v*2.23694;
async function measured(){
 const el=$('wobs');if(!el)return;
 try{
  const start=new Date(Date.now()-24*36e5).toISOString().replace('Z','');
  const r=await fetch('https://api.nysmesonet.org/data/dynserv/timeseries2',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({dataset:'nysm',variables:['wspd_sonic','wmax_sonic','wdir_sonic'],start,end:'latest',stations:['lkpl']})});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=(await r.json()).response,tm=j.coords.time.data,dv=j.data_vars;
  const get=(k,i)=>{const v=dv[k]?.data?.[0]?.[i];if(v==null)return null;const sc=dv[k].attrs?.scale_factor??1;return v*sc;};
  const pts=tm.map((t,i)=>{const ms=Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(9,11),+t.slice(11,13));
   const sp=get('wspd_sonic',i),g=get('wmax_sonic',i),d=get('wdir_sonic',i);return{t:ms,s:sp==null?null:MS(sp),g:g==null?null:MS(g),d};});
  el.innerHTML=windChart(pts,{peak:true,arrowEveryMs:36e5});
  $('wobserr').textContent='';
 }catch(e){$('wobserr').textContent='Measured wind unavailable ('+e.message+')';if(!el.innerHTML)el.innerHTML='<div class="nod">No wind data available</div>';}
}
window.loadWindObs=measured;
// ---- Forecast wind (from forecast.js hourly with gust) ----
function badge(pts){const el=$('wbadge');if(!el)return;const now=Date.now()-36e5;let pk=null;
 pts.forEach(p=>{if(p.t>=now&&p.t<=now+7*864e5&&ok(p.g)&&(!pk||p.g>pk.g))pk=p;});
 if(!pk||pk.g<30){el.className='';el.textContent='';el.hidden=true;return;}
 const mph=Math.round(pk.g),ms=Math.round(pk.g*0.44704),when=new Date(pk.t).toLocaleString('en-US',{...tz,weekday:'short',hour:'numeric'});
 el.hidden=false;if(pk.g>=45){el.className='wb '+(pk.g>=58?'red':'orange');el.textContent=`Wind advisory-level gusts: up to ${mph} mph (${ms} m/s) ${when}`;}
 else{el.className='wb yellow small';el.textContent=`Gusty: up to ${mph} mph ${when}`;}}
window.renderWindFc=function(hr){const el=$('wfc');if(!el)return;
 const pts=(hr||[]).map(h=>{const m=String(h.windSpeed||'').match(/\d+/g);const sp=m?Math.max(...m.map(Number)):null;
  return{t:Date.parse(h.startTime),s:sp,g:h.gust??null,d:DIRS[h.windDirection]??null};});
 el.innerHTML=windChart(pts,{daily:true,peak:true,arrowEveryMs:6*36e5});
 badge(pts);
 $('wfcnote').textContent=pts.some(p=>p.g!=null)?'':'Gust forecast unavailable; showing sustained speed only.';};
setTimeout(measured,200);setInterval(measured,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)measured();});
})();
