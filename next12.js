(function(){
// "Next 12 hours" detail chart, rendered from forecast.js hourly data (NWS forecastHourly + gridData sky/gust).
const $=id=>document.getElementById(id);
const tz={timeZone:'America/New_York'};
const ok=v=>v!=null&&isFinite(v);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DIRS={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
const band=v=>v>=58?{c:'#ff6b6b',f:'rgba(255,90,90,0.15)'}:v>=45?{c:'#ff9f43',f:'rgba(255,159,67,0.14)'}:v>=30?{c:'#ffd166',f:'rgba(255,214,102,0.10)'}:null;
function icon(s,night){s=(s||'').toLowerCase();
 if(/thunder/.test(s))return'⛈️';if(/snow|flurr|sleet|ice/.test(s))return'🌨️';
 if(/rain|shower|drizzle/.test(s))return/chance|slight|scattered|isolated/.test(s)?'🌦️':'🌧️';
 if(/fog|haze|mist/.test(s))return'🌫️';if(/wind|breez/.test(s)&&!/cloud/.test(s))return'💨';
 if(/mostly cloudy|cloudy|overcast/.test(s))return/partly|mostly sunny|mostly clear/.test(s)?'⛅':'☁️';
 if(/partly/.test(s))return night?'☁️':'⛅';return night?'🌙':'☀️';}
const hrLbl=t=>{const hh=+new Date(t).toLocaleString('en-US',{...tz,hour:'numeric',hour12:false})%24;return[String(hh%12||12),hh<12?'AM':'PM'];};
const spd=w=>{const m=String(w||'').match(/\d+/g);return m?Math.max(...m.map(Number)):null;};
const pill=(x,y,t,fill,fs,anc,fw)=>{const w=String(t).length*fs*0.6+6,h=fs+4,x0=anc==='end'?x-w+3:anc==='start'?x-3:x-w/2;return`<rect x="${x0.toFixed(1)}" y="${(y-fs*0.82-2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="3.5" fill="#0b3d5c" fill-opacity=".88"/><text x="${x}" y="${y}" fill="${fill}" font-size="${fs}" font-weight="${fw||700}" text-anchor="${anc||'middle'}">${t}</text>`;};
let N=+(localStorage.getItem('lpw-n12')||12);if(N!==6&&N!==12)N=12;let last=null,lastG=null,obs=null,lastW=0,painting=false;
const PAST=3,STN='lkpl',HOUR=36e5,MINCOL=22;
// observed 2 m air temp (NYS Mesonet timeseries2, 5-min) — same API as measured wind
async function loadObs(){try{const start=new Date(Date.now()-(PAST+1.5)*HOUR).toISOString().slice(0,19);
 const r=await fetch('https://api.nysmesonet.org/data/dynserv/timeseries2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset:'nysm',variables:['tair'],start,end:'latest',stations:[STN]})});
 if(!r.ok)throw 0;const j=(await r.json()).response,tm=j.coords.time.data,v=j.data_vars.tair,sc=v.attrs?.scale_factor??1;
 obs=tm.map((t,i)=>{const c=v.data[0][i];return{t:Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(9,11),+t.slice(11,13)),v:c==null?null:c*sc*9/5+32};}).filter(o=>ok(o.v));
 renderNext12();}catch(e){}}
// Same viewBox width and L/R gutters as the temperature and wind graphs, so "now"
// is the same screen x. Future hours stay at least MINCOL css px wide; when twelve
// of them do not fit beside now, that region scrolls and the now line stays put.
function chart(hr,frameW){
 const A=window.LPAxis;if(!A||frameW<40)return'';
 const {W,L,R}=A,rg=A.range(),xn=+A.x(rg.now,rg).toFixed(1);
 const past=hr.filter(h=>h._past),fut=hr.filter(h=>!h._past),nP=past.length,nF=fut.length;if(!nF)return'';
 const yI=14,Tp=38,CH=96,AX=Tp+CH,yH=AX+13,yAP=AX+23,yP=AX+38,yA=AX+54,yS=AX+71,yG=AX+83,H=AX+90;
 const c0=Date.parse(fut[0].startTime);
 let frac=(rg.now-c0)/HOUR;if(!isFinite(frac))frac=0;frac=Math.min(0.999,Math.max(0,frac));
 const u=W/frameW,minCWf=MINCOL*u;
 let CWf=(W-R-xn)/Math.max(0.25,nF-frac);
 if(CWf<minCWf)CWf=minCWf;
 if(frac>0.02)CWf=Math.min(CWf,Math.max(minCWf*0.85,(xn-L-4)/frac));
 const x0=Math.max(L,xn-frac*CWf),pastW=Math.max(0,x0-L),pCW=nP?pastW/nP:0;
 const scroll=nF*CWf>(W-R-x0)+0.8;
 const tight=CWf<36,iconFs=tight?13:15,tFs=tight?10:(N===6?13:12),hFs=tight?10.5:11.5,pFs=tight?9:10,sFs=tight?10:11,gFs=tight?8.5:9.5;
 const ob=(obs||[]).filter(o=>o.t>=c0-(nP+0.5)*HOUR&&o.t<=rg.now+6e4);
 const ts=hr.map(h=>h.temperature).filter(ok).concat(ob.map(o=>o.v));
 let lo=Math.min(...ts),hi=Math.max(...ts);
 if(!ts.length||!(hi>=lo)){lo=20;hi=40;}
 const nearFz=lo<=40&&hi>=24;if(nearFz){lo=Math.min(lo,32);hi=Math.max(hi,32);}
 if(hi-lo<8){const m=(hi+lo)/2;lo=m-4;hi=m+4;}
 const mn=lo-(hi-lo)*0.12,mx=hi+(hi-lo)*0.28;
 const y=t=>Tp+(mx-t)*CH/(mx-mn),py=p=>AX-p/100*CH,xPast=i=>L+(i+.5)*pCW,xFut=i=>(i+.5)*CWf;
 const xAt=t=>t<=c0?(nP&&pastW>0?L+Math.max(0,Math.min(1,(t-(c0-nP*HOUR))/(nP*HOUR)))*(x0-L):L):x0+Math.max(0,(t-c0)/HOUR)*CWf;
 let bg='';
 bg+=`<rect class="plotbox" x="${L}" y="${Tp}" width="${W-L-R}" height="${AX-Tp}" fill="none"/>`;
 bg+=`<line class="plotL" x1="${L}" x2="${L}" y1="0" y2="${H}" stroke="#fff" stroke-opacity="0" stroke-width="1.5"/>`;
 bg+=`<line class="plotR" x1="${W-R}" x2="${W-R}" y1="0" y2="${H}" stroke="#fff" stroke-opacity="0" stroke-width="1.5"/>`;
 if(xn>L)bg+=`<rect x="${L}" y="${Tp}" width="${(Math.min(xn,W-R)-L).toFixed(1)}" height="${AX-Tp}" fill="#ffffff0d"/>`;
 if(nearFz){const fy=Math.max(Tp,Math.min(AX,y(32)));
  bg+=`<rect x="${L}" y="${fy}" width="${W-L-R}" height="${AX-fy}" fill="rgba(127,216,255,0.10)"/>`;
  bg+=`<line x1="${L}" x2="${W-R}" y1="${fy}" y2="${fy}" stroke="#7fd8ff" stroke-width="1.2" stroke-dasharray="6 3"/>`;
  bg+=pill(W-4,fy-4,'32°F','#7fd8ff',10,'end');}
 bg+=`<line x1="${L}" x2="${W-R}" y1="${AX}" y2="${AX}" stroke="#ffffff44"/>`;
 const gold=[];
 past.forEach((h,i)=>{const x=xPast(i),[a,ap]=hrLbl(h.startTime);
  if(i)bg+=`<line x1="${(L+i*pCW).toFixed(1)}" x2="${(L+i*pCW).toFixed(1)}" y1="${Tp}" y2="${AX}" stroke="#ffffff14"/>`;
  bg+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${AX}" y2="${AX+3}" stroke="#ffffff55"/><text x="${x.toFixed(1)}" y="${yH}" fill="#ffffffaa" font-size="${hFs}" font-weight="600" text-anchor="middle">${a}</text><text x="${x.toFixed(1)}" y="${yAP}" fill="#ffffff88" font-size="8.5" text-anchor="middle">${ap}</text>`;
  if(ok(h.temperature)){gold.push([x,h.temperature]);bg+=`<circle cx="${x.toFixed(1)}" cy="${y(h.temperature).toFixed(1)}" r="2.2" fill="#ffd166" fill-opacity=".6"/>`;
   if(pCW>34)bg+=pill(x,y(h.temperature)-6,h.temperature+'°','#ffd166',tFs,'middle');}});
 if(ok(fut[0].temperature))gold.push([x0+0.5*CWf,fut[0].temperature]);
 if(gold.length>1)bg+=`<polyline points="${gold.map(p=>`${p[0].toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
 if(ob.length>1){const op=ob.map(o=>`${xAt(o.t).toFixed(1)},${y(o.v).toFixed(1)}`).join(' ');
  bg+=`<polyline points="${op}" fill="none" stroke="#0b3d5c" stroke-width="5" stroke-linejoin="round" stroke-opacity=".7"/><polyline points="${op}" fill="none" stroke="#5ff2ff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  const lo_=ob[ob.length-1];
  ob.forEach(o=>{if(o!==lo_&&new Date(o.t).getUTCMinutes()!==0)return;bg+=`<circle cx="${xAt(o.t).toFixed(1)}" cy="${y(o.v).toFixed(1)}" r="${o===lo_?3.4:2.4}" fill="#5ff2ff" stroke="#0b3d5c" stroke-width="1"/>`;});
  bg+=pill(Math.min(xAt(lo_.t),xn)-4,Math.min(AX-4,y(lo_.v)+16),Math.round(lo_.v)+'°','#5ff2ff',tFs,'end');}
 const bgSvg=`<svg class="axis" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Past ${nP} hours and next ${nF} hours. The dashed line is now, in line with the graphs below.">${bg}</svg>`;
 let fs='';
 const cl=fut.map((h,i)=>ok(h.sky)?i:null);let seg=[];const flush=()=>{if(seg.length){const a=seg[0],b=seg[seg.length-1];
  const pts=seg.map(i=>`${xFut(i).toFixed(1)},${py(fut[i].sky).toFixed(1)}`).join(' ');
  fs+=`<polygon points="${xFut(a).toFixed(1)},${AX} ${pts} ${xFut(b).toFixed(1)},${AX}" fill="rgba(160,140,200,0.25)"/><polyline points="${pts}" fill="none" stroke="#8f78d0" stroke-width="1.5" stroke-dasharray="4 3"/>`;}seg=[];};
 cl.forEach(v=>v==null?flush():seg.push(v));flush();
 const bw=Math.min(CWf*0.62,26);
 fut.forEach((h,i)=>{const p=h.probabilityOfPrecipitation?.value||0;if(!p)return;const x=xFut(i);
  fs+=`<rect x="${(x-bw/2).toFixed(1)}" y="${py(p).toFixed(1)}" width="${bw.toFixed(1)}" height="${(p/100*CH).toFixed(1)}" fill="#2b7bd6" rx="1.5"/>`;});
 const fpts=fut.map((h,i)=>ok(h.temperature)?`${xFut(i).toFixed(1)},${y(h.temperature).toFixed(1)}`:null).filter(Boolean);
 if(fpts.length>1)fs+=`<polyline points="${fpts.join(' ')}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
 fut.forEach((h,i)=>{if(!ok(h.temperature))return;const x=xFut(i),yy=y(h.temperature);
  fs+=pill(x,yy-6,h.temperature+'°','#ffd166',tFs,'middle')+`<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.4" fill="#ffd166"/>`;});
 fut.forEach((h,i)=>{const x=xFut(i),[a,ap]=hrLbl(h.startTime),p=h.probabilityOfPrecipitation?.value||0,sp=h._s,g=h.gust,d=DIRS[h.windDirection],b=band(Math.max(sp||0,g||0));
  if(b)fs+=`<rect x="${(i*CWf).toFixed(1)}" y="${AX+44}" width="${CWf.toFixed(1)}" height="${H-AX-44}" fill="${b.f}"/>`;
  if(i)fs+=`<line x1="${(i*CWf).toFixed(1)}" x2="${(i*CWf).toFixed(1)}" y1="${Tp}" y2="${AX}" stroke="#ffffff14"/>`;
  fs+=`<text x="${x.toFixed(1)}" y="${yI+6}" font-size="${iconFs}" text-anchor="middle"><title>${esc(h.shortForecast||'')}</title>${icon(h.shortForecast,!h.isDaytime)}</text>`;
  fs+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${AX}" y2="${AX+3}" stroke="#ffffff88"/><text x="${x.toFixed(1)}" y="${yH}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${a}</text><text x="${x.toFixed(1)}" y="${yAP}" fill="#ffffffbb" font-size="8.5" text-anchor="middle">${ap}</text>`;
  fs+=`<text x="${x.toFixed(1)}" y="${yP}" fill="${p?'#9fd3ff':'#ffffff55'}" font-size="${pFs}" font-weight="${p>=30?700:400}" text-anchor="middle">${p}%</text>`;
  if(d!=null)fs+=`<g transform="translate(${x.toFixed(1)},${yA}) rotate(${(d+180)%360})"><path d="M0,-6 L3.6,2.6 L0,0.8 L-3.6,2.6 Z" fill="${band(sp||0)?.c||'#e6ecf2'}"/></g>`;
  fs+=`<text x="${x.toFixed(1)}" y="${yS}" fill="${band(sp||0)?.c||'#6ee7b7'}" font-size="${sFs}" font-weight="700" text-anchor="middle">${ok(sp)?sp:'–'}</text>`;
  fs+=`<text x="${x.toFixed(1)}" y="${yG}" fill="${band(g||0)?.c||'#f78fb3'}" font-size="${gFs}" font-weight="${ok(g)&&g>=30?700:500}" text-anchor="middle">${ok(g)?'g'+Math.round(g):''}</text>`;});
 const futVb=nF*CWf,futCss=futVb*frameW/W;
 const futSvg=`<svg viewBox="0 0 ${futVb.toFixed(2)} ${H}" preserveAspectRatio="none" style="width:${futCss.toFixed(2)}px;height:100%;display:block">${fs}</svg>`;
 const fg=`<svg class="hfg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line class="nowline" x1="${xn}" x2="${xn}" y1="2" y2="${AX}" stroke="#f4f8ff" stroke-width="1.25" stroke-dasharray="3 2.5"/>${pill(xn,Tp-4,'now','#fff',9,'middle',600)}</svg>`;
 const left=(x0/W*100).toFixed(4),wid=((W-R-x0)/W*100).toFixed(4);
 return `<div class="hframe">${bgSvg}<div class="hfut" style="left:${left}%;width:${wid}%">${futSvg}</div>${fg}</div>${scroll?'<div class="n12hint">Swipe for later hours →</div>':''}`;
}
function summary(hr){const g=[];hr.forEach(h=>{const t=h.shortForecast||'';if(g.length&&g[g.length-1].t===t)g[g.length-1].e=h;else g.push({t,s:h,e:h,n:!h.isDaytime});});
 const f=t=>hrLbl(t).join(' ');
 return g.map(o=>`<span>${icon(o.t,o.n)} <b>${f(o.s.startTime)}${o.e!==o.s?'–'+f(o.e.startTime):''}</b> ${esc(o.t)}</span>`).join('');}
function paint(){
 const el=$('n12');if(!el||!last)return;
 const frameW=el.clientWidth;if(frameW<40)return;
 painting=true;lastW=frameW;
 const now=window.LPAxis?LPAxis.range().now:Date.now();
 const hr=last.filter(h=>Date.parse(h.endTime||h.startTime)>now).slice(0,N).map(h=>Object.assign({},h,{_s:spd(h.windSpeed)}));
 if(hr.length){const c0=Date.parse(hr[0].startTime),pa=[];for(let k=PAST;k>=1;k--){const t=c0-k*HOUR,f=last.find(h=>Date.parse(h.startTime)===t);pa.push({startTime:new Date(t).toISOString(),temperature:f?f.temperature:(lastG&&ok(lastG[t])?lastG[t]:null),_past:true});}hr.unshift(...pa);}
 document.querySelectorAll('#n12t button').forEach(b=>b.classList.toggle('on',+b.dataset.n===N));
 const head=$('n12h');if(head)head.textContent=`Next ${N} hours`;
 if(hr.length<PAST+2){el.innerHTML='<div class="nod">Hourly forecast not available</div>';painting=false;return;}
 const fh=hr.filter(h=>!h._past);
 el.innerHTML=chart(hr,frameW)+`<div class="lg"><span><i class="tp"></i>Forecast °F</span><span><i class="ob"></i>Observed (station)</span><span><i class="rn"></i>Rain %</span>${fh.some(h=>ok(h.sky))?'<span><i class="cd"></i>Cloud %</span>':''}<span><i class="fz"></i>Freezing</span><span>➤ Wind mph · g = gust</span><span><i class="bw"></i>Watch 30+</span><span><i class="ba"></i>Advisory 45+</span><span><i class="bx"></i>Warning 58+</span></div><div class="n12x">${summary(fh)}</div>`;
 painting=false;
}
window.renderNext12=function(hourly,gridT){if(hourly)last=hourly;if(gridT)lastG=gridT;if(obs===null){obs=[];loadObs();}paint();};
document.addEventListener('click',e=>{const b=e.target.closest('#n12t button');if(!b)return;N=+b.dataset.n;localStorage.setItem('lpw-n12',N);renderNext12();});
const n12el=$('n12');
if(n12el&&window.ResizeObserver)new ResizeObserver(()=>{if(painting)return;const w=n12el.clientWidth;if(w>40&&Math.abs(w-lastW)>1)renderNext12();}).observe(n12el);
setInterval(()=>{renderNext12();loadObs();},5*60*1000);
})();
