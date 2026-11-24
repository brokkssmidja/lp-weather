(function(){
const $=id=>document.getElementById(id);
const DIRS={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
const TZ='America/New_York',HOUR=36e5,DAY=864e5;
const ok=v=>v!=null&&isFinite(v);
const BANDS=[{lo:30,hi:45,name:'Watch',lbl:'30–45 mph · 13–20 m/s',fill:'rgba(255,214,102,0.10)',c:'#ffd166'},
 {lo:45,hi:58,name:'Advisory',lbl:'45–58 mph · 20–26 m/s',fill:'rgba(255,159,67,0.14)',c:'#ff9f43'},
 {lo:58,hi:1e4,name:'Warning',lbl:'58+ mph · 26+ m/s',fill:'rgba(255,90,90,0.15)',c:'#ff6b6b'}];
const gcol=g=>g>=58?'#ff6b6b':g>=45?'#ff9f43':g>=30?'#ffd166':'#f78fb3';
const hhOf=t=>+new Date(t).toLocaleString('en-US',{timeZone:TZ,hour:'numeric',hour12:false})%24;
const wdOf=t=>new Date(t).toLocaleString('en-US',{timeZone:TZ,weekday:'short'});
const clk=hh=>(hh%12||12)+(hh<12?'a':'p');
const when=t=>new Date(t).toLocaleString('en-US',{timeZone:TZ,weekday:'short',hour:'numeric',minute:'2-digit'});

// Shared time axis for every multi-day series on the page.
// Week view is piecewise: the last 24 h (PAST of the width) is stretched
// about 3× versus the following forecast days, so a phone can still show
// the measured trace and the week on one line. 48 h view is linear.
const W=400,H=196,T=16,B=40,L=28,R=30,PAST=0.38;
let mode='week',fcEnd=0,synced=0;
try{const s=localStorage.getItem('lpw-span');if(s==='48h'||s==='week')mode=s;}catch(e){}
function syncNow(){synced=Math.floor(Date.now()/60000)*60000;return synced;}
function setForecastEnd(t){if(t>0&&isFinite(t)){fcEnd=t;syncChrome();}}
function range(){
 const now=synced||syncNow();
 if(mode==='48h')return{t0:now-24*HOUR,t1:now+24*HOUR,now,mode};
 const t1=fcEnd>now+36*HOUR?fcEnd:now+7*DAY;
 return{t0:now-24*HOUR,t1,now,mode};
}
function stretch(rg){
 rg=rg||range();if(rg.mode!=='week')return 1;
 const pastH=(rg.now-rg.t0)/HOUR,futH=(rg.t1-rg.now)/HOUR,linear=pastH/(pastH+futH);
 return linear>0?PAST/linear:1;
}
function xOf(t,rg){
 const plot=W-L-R;
 if(rg.mode==='48h'){const u=(t-rg.t0)/(rg.t1-rg.t0||1);return L+Math.min(1,Math.max(0,u))*plot;}
 if(t<=rg.now){const u=(t-rg.t0)/(rg.now-rg.t0||1);return L+Math.min(1,Math.max(0,u))*plot*PAST;}
 const u=(t-rg.now)/(rg.t1-rg.now||1);return L+plot*PAST+Math.min(1,Math.max(0,u))*plot*(1-PAST);
}
function pill(x,y,t,fill,fs){
 const w=String(t).length*fs*0.62+8,h=fs+5,top=Math.max(1,y-fs*0.82-2);
 let x0=x-w/2;x0=Math.max(1,Math.min(x0,W-w-1));
 return `<rect x="${x0.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="3.5" fill="#0b3d5c" fill-opacity=".92"/><text x="${(x0+w/2).toFixed(1)}" y="${(top+fs+0.6).toFixed(1)}" fill="${fill}" font-size="${fs}" font-weight="700" text-anchor="middle">${t}</text>`;
}
function ticks(rg){
 const out=[];let t=Math.ceil(rg.t0/HOUR)*HOUR;
 for(;t<=rg.t1+1000;t+=HOUR)out.push({t,hh:hhOf(t)});
 return out;
}
function back(rg){
 const xn=xOf(rg.now,rg),yb=H-B;
 return `<rect class="pastshade" x="${L}" y="${T}" width="${(xn-L).toFixed(1)}" height="${yb-T}" fill="rgba(255,255,255,0.10)"/>`;
}
function grid(rg){
 const yb=H-B,xn=xOf(rg.now,rg);let s='';
 ticks(rg).forEach(tk=>{
  const xx=xOf(tk.t,rg);if(xx<L-1||xx>W-R+1||Math.abs(xx-xn)<3)return;
  const midnight=tk.hh===0,show=rg.mode==='48h'?tk.hh%6===0:tk.t<rg.now?tk.hh%6===0:midnight||tk.hh===12;
  if(!show)return;
  s+=`<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${T}" y2="${yb}" stroke="${midnight?'#ffffff55':'#ffffff1c'}" ${midnight?'stroke-dasharray="2 3"':''}/>`;
 });
 return s;
}
function front(rg){
 const yb=H-B,xn=xOf(rg.now,rg);let s='';
 s+=`<line x1="${L}" x2="${xn.toFixed(1)}" y1="${yb}" y2="${yb}" stroke="#9fd3ff" stroke-width="2.2"/>`;
 s+=`<line x1="${xn.toFixed(1)}" x2="${W-R}" y1="${yb}" y2="${yb}" stroke="#ffffff3a" stroke-width="1"/>`;
 s+=`<line class="nowline" x1="${xn.toFixed(1)}" x2="${xn.toFixed(1)}" y1="2" y2="${yb}" stroke="#f4f8ff" stroke-width="1.25" stroke-dasharray="3 2.5"/>`;
 s+=pill(xn,11,'now','#fff',8);
 // scale factor sits in the empty tick slot under "now", not on the data
 if(rg.mode==='week')s+=pill(xn,yb+14,Math.round(stretch(rg))+'×','#fff',8);
 // time labels — skip any that would collide, and anything sitting on "now"
 let last=-1e9;
 const labs=[];
 ticks(rg).forEach(tk=>{
  const inPast=tk.t<rg.now-HOUR/2;
  let text=null;
  if(rg.mode==='48h'){if(tk.hh%6===0)text=tk.hh===0?wdOf(tk.t):clk(tk.hh);}
  else if(inPast){if(tk.hh%6===0)text=tk.hh===0?wdOf(tk.t):clk(tk.hh);}
  else if(tk.hh===0)text=wdOf(tk.t);
  if(!text)return;
  const xx=xOf(tk.t,rg);
  if(xx<L+14||xx>W-R-14||Math.abs(xx-xn)<18||xx-last<26)return;
  last=xx;labs.push({xx,text,strong:tk.hh===0});
 });
 // left edge: name the start of the axis when the first tick is inset
 if(!labs.length||labs[0].xx-L>36){
  const hh=hhOf(rg.t0);
  labs.unshift({xx:L+2,text:hh===0?wdOf(rg.t0):clk(hh),strong:false,edge:true});
 }
 labs.forEach(lb=>{
  const anc=lb.edge?'start':lb.xx>W-R-20?'end':'middle';
  s+=`<text x="${lb.xx.toFixed(1)}" y="${yb+13}" fill="${lb.strong?'#fff':'#ffffffaa'}" font-size="9" font-weight="${lb.strong?700:500}" text-anchor="${anc}">${lb.text}</text>`;
 });
 const pc=L+(xn-L)/2,fc=xn+(W-R-xn)/2;
 s+=`<text x="${pc.toFixed(1)}" y="${H-8}" fill="#9fd3ff" font-size="8.5" font-weight="600" text-anchor="middle">measured</text>`;
 s+=`<text x="${fc.toFixed(1)}" y="${H-8}" fill="#ffffffc4" font-size="8.5" font-weight="600" text-anchor="middle">forecast</text>`;
 return s;
}
window.LPAxis={W,H,T,B,L,R,get mode(){return mode;},syncNow,setForecastEnd,range,x:xOf,back,grid,front,stretch,pill};

function syncChrome(){
 document.querySelectorAll('#spant button').forEach(b=>{
  const on=b.dataset.span===mode;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
 });
 const note=$('scalenote');if(!note)return;
 if(mode==='48h')note.textContent='Close-up, one even scale: 24 hours ago through 24 hours ahead. The dashed line is now.';
 else note.textContent='Same clock on both graphs. Shaded 24 h is stretched about '+Math.round(stretch())+'×; the dashed line is now.';
}
function setMode(m){
 if(m!=='48h'&&m!=='week')return;
 mode=m;try{localStorage.setItem('lpw-span',mode);}catch(e){}
 syncNow();syncChrome();
 window.redrawForecastChart&&window.redrawForecastChart();
 drawWind();
}

let obsPts=null,fcPts=null,obsError='';
function windNotes(){
 const el=$('werr');if(!el)return;const parts=[];
 if(obsError)parts.push(obsError);
 if(fcPts&&fcPts.length&&!fcPts.some(p=>ok(p.g)))parts.push('Gust forecast unavailable; showing sustained speed only.');
 el.textContent=parts.join(' ');
}
function boxesOverlap(a,b){return a.x0<b.x0+b.w+4&&a.x0+a.w+4>b.x0&&a.top<b.top+b.h+3&&a.top+a.h+3>b.top;}
function drawWind(){
 const el=$('wchart');if(!el)return;
 if(!obsPts&&!fcPts){if(obsError)el.innerHTML='<div class="nod">No wind data available</div>';return;}
 const rg=range(),x=t=>xOf(t,rg),yb=H-B;
 const obs=(obsPts||[]).filter(p=>p.t>=rg.t0-HOUR&&p.t<=rg.now+6e4);
 const fc=(fcPts||[]).filter(p=>p.t>=rg.now-HOUR&&p.t<=rg.t1+HOUR);
 const all=obs.concat(fc);
 if(!all.some(p=>ok(p.s)||ok(p.g))){el.innerHTML='<div class="nod">No wind data available</div>';windNotes();return;}
 const mxv=Math.max(0,...all.map(p=>Math.max(ok(p.s)?p.s:0,ok(p.g)?p.g:0)));
 const mx=Math.max(50,Math.ceil((mxv+4)/10)*10);
 const y=v=>T+(mx-v)*(yb-T)/mx;
 let s=back(rg);
 const step=mx>60?20:10;
 for(let v=0;v<=mx;v+=step)s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff22"/><text x="${L-4}" y="${y(v)+3}" fill="#ffffffaa" font-size="9" text-anchor="end">${v}</text><text x="${W-R+3}" y="${y(v)+3}" fill="#ffffff77" font-size="8">${Math.round(v*0.44704)}</text>`;
 s+=`<text x="${L-4}" y="11" fill="#ffffffaa" font-size="8" text-anchor="end">mph</text><text x="${W-R+3}" y="11" fill="#ffffff77" font-size="8">m/s</text>`;
 s+=grid(rg);
 let pkObs=null,pkFc=null;
 obs.forEach(p=>{if(ok(p.g)&&(!pkObs||p.g>pkObs.g))pkObs=p;});
 fc.forEach(p=>{if(p.t>=rg.now-HOUR&&ok(p.g)&&(!pkFc||p.g>pkFc.g))pkFc=p;});
 const xm=t=>x(Math.min(t,rg.now)),xf=t=>x(Math.max(t,rg.now));
 // band names stacked in the top-right corner, clear of the trace and of peak pills
 let bandN=0;
 BANDS.forEach(b=>{const top=Math.min(b.hi,mx);if(b.lo>=mx)return;
  s+=`<rect x="${L}" y="${y(top)}" width="${W-L-R}" height="${y(b.lo)-y(top)}" fill="${b.fill}"/>`;
  bandN++;
 });
 const bandZone={x0:W-R-138,top:T,w:138,h:12+bandN*11};
 const poly=(pts,xfn,key,attrs)=>{let seg=[],out='';const fl=()=>{if(seg.length>1)out+=`<polyline points="${seg.join(' ')}" fill="none" ${attrs}/>`;seg=[];};
  pts.forEach(p=>{if(!ok(p[key]))fl();else seg.push(`${xfn(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`);});fl();return out;};
 // measured gust, solid, colored by speed
 for(let i=1;i<obs.length;i++){const p=obs[i-1],q=obs[i];if(!ok(p.g)||!ok(q.g))continue;
  s+=`<line x1="${xm(p.t).toFixed(1)}" y1="${y(p.g).toFixed(1)}" x2="${xm(q.t).toFixed(1)}" y2="${y(q.g).toFixed(1)}" stroke="${gcol(Math.max(p.g,q.g))}" stroke-width="1.5" stroke-linecap="round"/>`;}
 s+=poly(obs,xm,'s','stroke="#6ee7b7" stroke-width="2.05" stroke-linejoin="round" stroke-linecap="round"');
 // forecast gust as color runs so the dash pattern can show across hours
 let run=[],col=null;const flush=()=>{if(run.length>1)s+=`<polyline points="${run.join(' ')}" fill="none" stroke="${col}" stroke-width="1.55" stroke-opacity=".9" stroke-dasharray="5 3" stroke-linejoin="round" stroke-linecap="round"/>`;run=[];};
 fc.forEach(p=>{if(!ok(p.g)){flush();col=null;return;}const c=gcol(p.g),pt=`${xf(p.t).toFixed(1)},${y(p.g).toFixed(1)}`;
  if(c!==col){if(run.length){run.push(pt);flush();}col=c;run=[pt];}else run.push(pt);});flush();
 s+=poly(fc,xf,'s','stroke="#6ee7b7" stroke-width="1.8" stroke-opacity=".8" stroke-dasharray="5 3.5" stroke-linejoin="round" stroke-linecap="round"');
 // direction arrows above the plot, clear of the "now" pill
 const xn=x(rg.now);
 function arrows(pts,every,xfn,lo,hi){let next=lo,out='';
  pts.forEach(p=>{if(p.t<next||p.t>hi||!ok(p.d))return;const xx=xfn(p.t);if(xx<L+8||xx>W-R-8||Math.abs(xx-xn)<18){next=p.t+every;return;}
   out+=`<g transform="translate(${xx.toFixed(1)},9) rotate(${(p.d+180)%360})"><path d="M0,-4.2 L2.5,1.7 L0,.35 L-2.5,1.7 Z" fill="#e6ecf2" opacity=".88"/></g>`;next=p.t+every;});
  return out;}
 s+=arrows(obs,rg.mode==='48h'?2*HOUR:3*HOUR,xm,rg.t0,rg.now);
 s+=arrows(fc,rg.mode==='48h'?3*HOUR:12*HOUR,xf,rg.now,rg.t1);
 // band labels, then the shared axis, then peak pills on top
 let ly=T+11;
 for(let i=BANDS.length-1;i>=0;i--){const b=BANDS[i];if(b.lo>=mx)continue;
  s+=`<text x="${W-R-3}" y="${ly}" fill="${b.c}" font-size="8" font-weight="600" text-anchor="end">${b.name} ${b.lbl}</text>`;
  ly+=11;}
 s+=front(rg);
 const placed=[];
 function addPeak(p,kind,xfn,xMin,xMax){if(!p)return;
  const lines=[`Peak ${Math.round(p.g)} mph (${Math.round(p.g*0.44704)} m/s)`,`${when(p.t)} · ${kind}`];
  const fs=8,lh=fs+4,w=Math.max(...lines.map(t=>t.length))*fs*0.54+14,h=lines.length*lh+4;
  const px=xfn(p.t),py=y(p.g);
  let x0=Math.max(xMin,Math.min(px-w/2,xMax-w));
  const blocks=top=>top<T+1||top+h>yb-2||placed.some(b=>boxesOverlap(b,{x0,top,w,h}))||(bandN&&boxesOverlap({x0,top,w,h},bandZone));
  let top=py-10-h; if(blocks(top))top=py+8; if(blocks(top))top=Math.max(T+1,Math.min(py-10-h,yb-2-h));
  const col=gcol(p.g);
  s+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.3" fill="#0b3d5c" stroke="${col}" stroke-width="1.6"/>`;
  s+=`<rect x="${x0.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="3.5" fill="#0b3d5c" fill-opacity=".93"/>`;
  lines.forEach((t,i)=>{s+=`<text x="${(x0+w/2).toFixed(1)}" y="${(top+fs+2+i*lh).toFixed(1)}" fill="${col}" font-size="${fs}" font-weight="700" text-anchor="middle">${t}</text>`;});
  placed.push({x0,top,w,h});
 }
 addPeak(pkObs,'measured',xm,L+2,xn-4);
 addPeak(pkFc,'forecast',xf,xn+4,W-R-2);
 const aria='Wind on a shared clock from 24 hours ago to the end of the forecast. Solid lines are LKPL measurements left of now; dashed lines are the NWS forecast.'
  +(pkObs?` Measured peak ${Math.round(pkObs.g)} mph.`:'')+(pkFc?` Forecast peak ${Math.round(pkFc.g)} mph.`:'');
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${s}</svg><div class="lg"><span><i class="ws"></i>Speed</span><span><i class="wg"></i>Gust</span><span><i class="fd"></i>Dashed = forecast</span><span><i class="bw"></i>Watch 30+</span><span><i class="ba"></i>Advisory 45+</span><span><i class="bx"></i>Warning 58+</span><span>➤ Direction</span></div>`;
 windNotes();
}
window.redrawWind=drawWind;

const MS=v=>v*2.23694;
async function measured(){
 try{
  const start=new Date(Date.now()-25*HOUR).toISOString().replace('Z','');
  const r=await fetch('https://api.nysmesonet.org/data/dynserv/timeseries2',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({dataset:'nysm',variables:['wspd_sonic','wmax_sonic','wdir_sonic','tair'],start,end:'latest',stations:['lkpl']})});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=(await r.json()).response,tm=j.coords.time.data,dv=j.data_vars;
  const get=(k,i)=>{const v=dv[k]?.data?.[0]?.[i];if(v==null)return null;const sc=dv[k].attrs?.scale_factor??1;return v*sc;};
  const stamp=t=>Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(9,11),+t.slice(11,13));
  obsPts=tm.map((t,i)=>{const sp=get('wspd_sonic',i),g=get('wmax_sonic',i),d=get('wdir_sonic',i);
   return {t:stamp(t),s:sp==null?null:MS(sp),g:g==null?null:MS(g),d};});
  // same 2 m tair series the Next 12 chart already uses, over the 24 h this request covers
  window.LPTempObs=tm.map((t,i)=>{const c=get('tair',i);return {t:stamp(t),v:c==null?null:c*9/5+32};}).filter(o=>ok(o.v));
  obsError='';
 }catch(e){obsError='Measured wind unavailable ('+e.message+')';}
 syncNow();drawWind();window.redrawForecastChart&&window.redrawForecastChart();
}
window.loadWindObs=measured;

function badge(pts){const el=$('wbadge');if(!el)return;const now=Date.now()-HOUR;let pk=null;
 pts.forEach(p=>{if(p.t>=now&&p.t<=now+7*DAY&&ok(p.g)&&(!pk||p.g>pk.g))pk=p;});
 if(!pk||pk.g<30){el.className='';el.textContent='';el.hidden=true;return;}
 const mph=Math.round(pk.g),ms=Math.round(pk.g*0.44704),wh=new Date(pk.t).toLocaleString('en-US',{timeZone:TZ,weekday:'short',hour:'numeric'});
 el.hidden=false;if(pk.g>=45){el.className='wb '+(pk.g>=58?'red':'orange');el.textContent=`Wind advisory-level gusts: up to ${mph} mph (${ms} m/s) ${wh}`;}
 else{el.className='wb yellow small';el.textContent=`Gusty: up to ${mph} mph ${wh}`;}}
window.renderWindFc=function(hr){
 fcPts=(hr||[]).map(h=>{const m=String(h.windSpeed||'').match(/\d+/g);const sp=m?Math.max(...m.map(Number)):null;
  return {t:Date.parse(h.startTime),s:sp,g:h.gust??null,d:DIRS[h.windDirection]??null};}).filter(p=>isFinite(p.t));
 if(fcPts.length)setForecastEnd(fcPts[fcPts.length-1].t);
 badge(fcPts);drawWind();
};
document.addEventListener('click',e=>{const b=e.target.closest('#spant button');if(!b)return;setMode(b.dataset.span);});
syncChrome();
setTimeout(measured,200);setInterval(measured,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)measured();});
})();
