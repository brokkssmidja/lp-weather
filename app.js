const URL_='https://api.nysmesonet.org/data/index.php/geojson/nysm/latest';
const $=id=>document.getElementById(id);
const F=c=>c*9/5+32, MPH=m=>m*2.23694, IN=mm=>mm/25.4, INHG=h=>h*0.02953;
const r=(v,d=0)=>v==null||isNaN(v)?'--':(+v).toFixed(d);
const DIRS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const card=d=>d==null?'':DIRS[Math.round(d/22.5)%16];
function dewC(t,rh){const a=17.625,b=243.04,g=Math.log(rh/100)+a*t/(b+t);return b*g/(a-g);}
function feelsF(tf,rh,mph){
  if(tf<=50&&mph>3)return 35.74+0.6215*tf-35.75*mph**0.16+0.4275*tf*mph**0.16;
  if(tf>=80)return -42.379+2.04901523*tf+10.14333127*rh-.22475541*tf*rh-.00683783*tf*tf-.05481717*rh*rh+.00122874*tf*tf*rh+.00085282*tf*rh*rh-.00000199*tf*tf*rh*rh;
  return tf;}
function slp(p,elev,tc){return p*Math.pow(1-0.0065*elev/(tc+0.0065*elev+273.15),-5.257);}
async function load(){
  $('err').textContent='';$('time').textContent='Loading…';
  try{
    const res=await fetch(URL_,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
    const j=await res.json();const f=j.features.find(x=>x.properties.STID==='LKPL');if(!f)throw new Error('Station not found');
    window.LKPL={lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]};
    const p=f.properties,tf=F(p.TAIR),mph=MPH(p.WSPD||0);
    $('temp').textContent=r(tf)+'°F';$('tempc').textContent=r(p.TAIR)+'°C';
    const fl=feelsF(tf,p.RELH,mph);$('feels').textContent=Math.round(fl)!==Math.round(tf)?'Feels like '+r(fl)+'°F':'\u00a0';
    $('wind').textContent=`${card(p.WDIR)} ${r(mph)} mph, gust ${r(MPH(p.WMAX))}`;
    $('rh').textContent=r(p.RELH)+'%';
    $('dew').textContent=r(F(dewC(p.TAIR,p.RELH)))+'°F';
    $('pres').textContent=`${r(INHG(p.PRES),2)} / ${r(INHG(slp(p.PRES,p.ELEV,p.TAIR)),2)} in`;
    $('p1').textContent=`${r(IN(p.PRECIP6H),2)} / ${r(IN(p.PRECIP1D),2)} in`;
    $('p2').textContent=`${r(IN(p.PRECIP3D),2)} / ${r(IN(p.PRECIP7D),2)} in`;
    $('snow').textContent=p.SNOW_DEPTH==null?'n/a':r(p.SNOW_DEPTH/2.54,1)+' in';
    $('elev').textContent=r(p.ELEV*3.28084)+' ft';
    $('time').textContent='Observed '+new Date(p.TIME).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit',month:'short',day:'numeric'})+' ET';
  }catch(e){$('err').textContent='Could not load: '+e.message;$('time').textContent='';}
}
$('refresh').onclick=()=>{load();window.loadForecast&&loadForecast(true);};load();setInterval(load,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
