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
let N=+(localStorage.getItem('lpw-n12')||12);if(N!==6&&N!==12)N=12;let last=null;
function chart(hr){
 const n=hr.length,CW=N===6?60:31,L=4,R=4,W=L+n*CW+R;
 const yI=14,T=38,CH=96,AX=T+CH,yH=AX+13,yAP=AX+23,yP=AX+38,yA=AX+54,yS=AX+71,yG=AX+83,H=AX+90;
 const ts=hr.map(h=>h.temperature);let lo=Math.min(...ts),hi=Math.max(...ts);
 const nearFz=lo<=40&&hi>=24;if(nearFz){lo=Math.min(lo,32);hi=Math.max(hi,32);}
 if(hi-lo<8){const m=(hi+lo)/2;lo=m-4;hi=m+4;}
 const mn=lo-(hi-lo)*0.12,mx=hi+(hi-lo)*0.28; // headroom for value labels
 const cx=i=>L+CW*(i+.5),y=t=>T+(mx-t)*CH/(mx-mn),py=p=>AX-p/100*CH;let s='';
 // column guides + wind risk tint
 hr.forEach((h,i)=>{const b=band(Math.max(h._s||0,h.gust||0));
  if(b)s+=`<rect x="${L+CW*i}" y="${AX+44}" width="${CW}" height="${H-AX-44}" fill="${b.f}"/>`;
  if(i)s+=`<line x1="${L+CW*i}" x2="${L+CW*i}" y1="${T}" y2="${AX}" stroke="#ffffff14"/>`;});
 s+=`<line x1="${L}" x2="${W-R}" y1="${AX}" y2="${AX}" stroke="#ffffff44"/>`;
 // cloud cover (same soft purple area, dashed outline as 7-day)
 const cl=hr.map((h,i)=>ok(h.sky)?i:null);let seg=[];const flush=()=>{if(seg.length){const a=seg[0],b=seg[seg.length-1],x0=seg.length>1?cx(a):cx(a)-CW/2,x1=seg.length>1?cx(b):cx(a)+CW/2;
  const pts=seg.length>1?seg.map(i=>`${cx(i).toFixed(1)},${py(hr[i].sky).toFixed(1)}`).join(' '):`${x0},${py(hr[a].sky)} ${x1},${py(hr[a].sky)}`;
  s+=`<polygon points="${x0},${AX} ${pts} ${x1},${AX}" fill="rgba(160,140,200,0.25)"/><polyline points="${pts}" fill="none" stroke="#8f78d0" stroke-width="1.5" stroke-dasharray="4 3"/>`;}seg=[];};
 cl.forEach(v=>v==null?flush():seg.push(v));flush();
 // precip chance bars (same blue as 7-day)
 const bw=Math.min(CW*0.62,26);
 hr.forEach((h,i)=>{const p=h.probabilityOfPrecipitation?.value||0;if(p)s+=`<rect x="${(cx(i)-bw/2).toFixed(1)}" y="${py(p).toFixed(1)}" width="${bw.toFixed(1)}" height="${(p/100*CH).toFixed(1)}" fill="#2b7bd6" rx="1.5"/>`;});
 // freezing line + tint
 if(nearFz){const fy=Math.max(T,Math.min(AX,y(32)));
  s+=`<rect x="${L}" y="${fy}" width="${W-L-R}" height="${AX-fy}" fill="rgba(127,216,255,0.10)"/><line x1="${L}" x2="${W-R}" y1="${fy}" y2="${fy}" stroke="#7fd8ff" stroke-width="1.2" stroke-dasharray="6 3"/>`+pill(W-R-2,fy-4,'32°F','#7fd8ff',10,'end');}
 // temperature line + labels
 const pts=hr.map((h,i)=>`${cx(i).toFixed(1)},${y(h.temperature).toFixed(1)}`).join(' ');
 const lbP=[],lbT=[];hr.forEach((h,i)=>{const m=pill(cx(i),y(h.temperature)-6,h.temperature+'°','#ffd166',N===6?13:12,'middle').split('/>');lbP.push(m[0]+'/>');lbT.push(m.slice(1).join('/>'));});s+=lbP.join('');
 s+=`<polyline points="${pts}" fill="none" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
 hr.forEach((h,i)=>{const yy=y(h.temperature);s+=`<circle cx="${cx(i)}" cy="${yy}" r="2.4" fill="#ffd166"/>`+lbT[i];});
 // icons, hour ticks, precip %, wind
 hr.forEach((h,i)=>{const x=cx(i),[a,ap]=hrLbl(h.startTime),p=h.probabilityOfPrecipitation?.value||0,sp=h._s,g=h.gust,d=DIRS[h.windDirection];
  s+=`<text x="${x}" y="${yI+6}" font-size="15" text-anchor="middle"><title>${esc(h.shortForecast||'')}</title>${icon(h.shortForecast,!h.isDaytime)}</text>`;
  s+=`<line x1="${x}" x2="${x}" y1="${AX}" y2="${AX+3}" stroke="#ffffff88"/><text x="${x}" y="${yH}" fill="#fff" font-size="11.5" font-weight="600" text-anchor="middle">${a}</text><text x="${x}" y="${yAP}" fill="#ffffffbb" font-size="8.5" text-anchor="middle">${ap}</text>`;
  s+=`<text x="${x}" y="${yP}" fill="${p?'#9fd3ff':'#ffffff55'}" font-size="10" font-weight="${p>=30?700:400}" text-anchor="middle">${p}%</text>`;
  if(d!=null)s+=`<g transform="translate(${x},${yA}) rotate(${(d+180)%360})"><path d="M0,-6 L3.6,2.6 L0,0.8 L-3.6,2.6 Z" fill="${band(sp||0)?.c||'#e6ecf2'}"/></g>`;
  s+=`<text x="${x}" y="${yS}" fill="${band(sp||0)?.c||'#6ee7b7'}" font-size="11" font-weight="700" text-anchor="middle">${ok(sp)?sp:'–'}</text>`;
  s+=`<text x="${x}" y="${yG}" fill="${band(g||0)?.c||'#f78fb3'}" font-size="9.5" font-weight="${ok(g)&&g>=30?700:500}" text-anchor="middle">${ok(g)?'g'+Math.round(g):''}</text>`;});
 return`<svg viewBox="0 0 ${W} ${H}" style="min-width:${N===6?300:340}px" role="img" aria-label="Next ${n} hours forecast">${s}</svg>`;}
function summary(hr){const g=[];hr.forEach(h=>{const t=h.shortForecast||'';if(g.length&&g[g.length-1].t===t)g[g.length-1].e=h;else g.push({t,s:h,e:h,n:!h.isDaytime});});
 const f=t=>hrLbl(t).join(' ');
 return g.map(o=>`<span>${icon(o.t,o.n)} <b>${f(o.s.startTime)}${o.e!==o.s?'–'+f(o.e.startTime):''}</b> ${esc(o.t)}</span>`).join('');}
window.renderNext12=function(hourly){if(hourly)last=hourly;const el=$('n12');if(!el||!last)return;
 const now=Date.now(),hr=last.filter(h=>Date.parse(h.endTime||h.startTime)>now).slice(0,N).map(h=>Object.assign({},h,{_s:spd(h.windSpeed)}));
 document.querySelectorAll('#n12t button').forEach(b=>b.classList.toggle('on',+b.dataset.n===N));$('n12h').textContent=`Next ${N} hours`;
 if(hr.length<2){el.innerHTML='<div class="nod">Hourly forecast not available</div>';return;}
 el.innerHTML=`<div class="n12s">${chart(hr)}</div><div class="lg"><span><i class="tp"></i>Temp °F</span><span><i class="rn"></i>Rain %</span>${hr.some(h=>ok(h.sky))?'<span><i class="cd"></i>Cloud %</span>':''}<span><i class="fz"></i>Freezing</span><span>➤ Wind mph · g = gust</span><span><i class="bw"></i>Watch 30+</span><span><i class="ba"></i>Advisory 45+</span><span><i class="bx"></i>Warning 58+</span></div><div class="n12x">${summary(hr)}</div>`;};
document.addEventListener('click',e=>{const b=e.target.closest('#n12t button');if(!b)return;N=+b.dataset.n;localStorage.setItem('lpw-n12',N);renderNext12();});
setInterval(()=>renderNext12(),5*60*1000);
})();
