const $=s=>document.querySelector(s), rate=.30;let power=0,energy=0,run=true,demo=false,samples=0,sum=0,peak=0,history=[],data=Array(60).fill(0),demoTarget=420,demoNextChange=0;const f=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const accent=(getComputedStyle(document.documentElement).getPropertyValue('--volt')||'#ffd400').trim();
const accentFill=(()=>{const h=accent.replace('#','');const n=parseInt(h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},.08)`})();
function setPower(v){power=Math.max(0,Math.min(1000,+v));$('#slider').value=Math.round(power/10)*10;$('#sliderText').textContent=Math.round(power)+' W';$('#percent').textContent=Math.round(power/10)+'%';$('#power').textContent=Math.round(power);$('#heroPower').textContent=Math.round(power)+' W';$('#meter').style.width=power/10+'%';$('#slider').style.background=`linear-gradient(90deg,${accent} ${power/10}%,#182423 ${power/10}%)`;visualPower(power);}

function visualPower(v){
  const card=document.querySelector('#solarCard'), powerEl=document.querySelector('#visualPower'), stage=document.querySelector('#solarStage');
  if(!card||!powerEl)return;
  const n=Math.round(Math.max(0,Math.min(1000,+v)));
  powerEl.textContent=n+' W';
  const active=run && n>0;
  card.classList.toggle('is-active',active);
  card.classList.toggle('is-strong',active && n>620);
  document.querySelector('#visualState').textContent=active?'GERAÇÃO ATIVA':(run?'AGUARDANDO':'PAUSADO');
  document.querySelector('#visualHint').textContent=active?'Energia fluindo para o ESP32':(run?'Ajuste a potência para iniciar':'Simulação pausada');
  if(stage)stage.style.setProperty('--intensity',(n/1000).toFixed(2));
  const ring=document.querySelector('#sunPowerRing');
  if(ring)ring.style.setProperty('--pct',(n/10).toFixed(1));
  const sun=document.querySelector('#sunArt');
  if(sun){const k=.82+(n/1000)*.34;sun.style.transform=`scale(${k})`;sun.style.transformOrigin='center'}
}

function update(){let b=energy*rate;$('#energy').textContent=f(energy);$('#bonus').textContent='R$ '+f(b);$('#heroEnergy').textContent=f(energy)+' kWh';$('#heroBonus').textContent='R$ '+f(b);$('#avg').textContent=samples?Math.round(sum/samples):0;$('#goal').textContent=Math.min(100,Math.round(energy/20*100))+'%';$('#sumE').textContent=f(energy)+' kWh';$('#sumB').textContent='R$ '+f(b);$('#peak').textContent=Math.round(peak)+' W';$('#samples').textContent=samples}
function rows(){let r=history.map(x=>`<tr><td>${x.t}</td><td>${Math.round(x.p)} W</td><td>${f(x.e)} kWh</td><td>R$ ${f(x.b)}</td></tr>`).join('');$('#rows').innerHTML=r||'<tr><td colspan="4">Nenhuma amostra ainda.</td></tr>'}
function chart(){let c=$('#graph'),r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;let x=c.getContext('2d'),w=c.width,h=c.height;x.clearRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.06)';for(let i=1;i<5;i++){x.beginPath();x.moveTo(0,i*h/5);x.lineTo(w,i*h/5);x.stroke()}let pad=45*d;x.beginPath();data.forEach((v,i)=>{let X=pad+i*(w-pad)/(data.length-1),Y=h-v/1000*h;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.lineTo(w,h);x.lineTo(pad,h);x.fillStyle=accentFill;x.fill();x.beginPath();data.forEach((v,i)=>{let X=pad+i*(w-pad)/(data.length-1),Y=h-v/1000*h;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.strokeStyle=accent;x.lineWidth=2*d;x.stroke()}
function tick(){if(run){if(demo){const now=Date.now();if(now>demoNextChange){demoTarget=90+Math.random()*760;demoNextChange=now+7000+Math.random()*6000}power+=(demoTarget-power)*.018;setPower(power)}energy+=power/3600000;samples++;sum+=power;peak=Math.max(peak,power);data.push(power);data.shift();if(samples%5===0){history.unshift({t:new Date().toLocaleTimeString('pt-BR'),p:power,e:energy,b:energy*rate});history=history.slice(0,18);rows()}update();chart()}requestAnimationFrame(tick)}
$('#slider').oninput=e=>{demo=false;$('#mode').textContent='MANUAL';setPower(e.target.value)};
$('#demo').onclick=()=>{demo=true;run=true;demoNextChange=0;$('#mode').textContent='SIMULAÇÃO';visualPower(power)};
$('#startHero').onclick=()=>{$('#dashboard').scrollIntoView({behavior:'smooth'});demo=true;run=true;demoNextChange=0;visualPower(power)};
$('#pause').onclick=()=>{run=!run;$('#pause').textContent=run?'Pausar':'Continuar';$('#mode').textContent=run?'SIMULAÇÃO':'PAUSADO';visualPower(power)};
$('#reset').onclick=()=>{power=energy=samples=sum=peak=0;demoTarget=420;demoNextChange=0;history=[];data.fill(0);demo=false;run=true;setPower(0);rows();update();chart();visualPower(power)};
$('#clear').onclick=()=>{history=[];rows()};
addEventListener('resize',chart);
setPower(0);rows();update();chart();tick();
