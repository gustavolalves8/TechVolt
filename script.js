const $ = (selector) => document.querySelector(selector);
const RATE = 0.30;

let power = 0;
let energy = 0;
let running = true;
let demo = false;
let samples = 0;
let sumPower = 0;
let peak = 0;
let history = [];
let data = Array(60).fill(0);

const formatNumber = (value, decimals = 2) =>
  Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}


function updateSolarScene(){
  const pct=Math.max(0,Math.min(100,power/10));
  const sun=$('#sun'), panel=$('#solarPanel'), flow=$('#energyFlow'), scenePower=$('#scenePower'), scenePercent=$('#scenePercent'), status=$('#sceneStatus');
  if(scenePower) scenePower.textContent=`${Math.round(power)} W`;
  if(scenePercent) scenePercent.textContent=`${Math.round(pct)}%`;
  if(status) status.textContent=power>700?'Geração alta':power>250?'Geração ativa':'Aguardando geração';
  if(sun) sun.style.filter=`brightness(${0.7+pct/220})`;
  if(sun) sun.style.opacity=String(.55+pct/220);
  if(panel) panel.style.boxShadow=`0 20px 45px rgba(0,0,0,.7),0 0 ${8+pct/2}px rgba(255,212,0,${.03+pct/3500})`;
  if(flow) flow.style.opacity=String(.25+pct/120);
  document.documentElement.style.setProperty('--solar-speed', `${Math.max(.45,2.1-pct/70)}s`);
}

function setPower(value) {
  power = Math.max(0, Math.min(1000, Number(value) || 0));

  const slider = $('#slider');
  if (slider) slider.value = Math.round(power / 10) * 10;

  setText('#sliderText', `${Math.round(power)} W`);
  setText('#percent', `${Math.round(power / 10)}%`);
  setText('#power', Math.round(power));

  const meter = $('#meter');
  if (meter) meter.style.width = `${power / 10}%`;

  updateSolarScene();

  if (slider) {
    const percent = power / 10;
    slider.style.background =
      `linear-gradient(90deg, #ffd400 0%, #ffd400 ${percent}%, #252525 ${percent}%, #252525 100%)`;
  }
}

function updateDashboard() {
  const bonus = energy * RATE;

  setText('#energy', formatNumber(energy));
  setText('#bonus', `R$ ${formatNumber(bonus)}`);
  setText('#avg', samples ? Math.round(sumPower / samples) : 0);
  setText('#goal', `${Math.min(100, Math.round((energy / 20) * 100))}%`);
  setText('#sumE', `${formatNumber(energy)} kWh`);
  setText('#sumB', `R$ ${formatNumber(bonus)}`);
  setText('#peak', `${Math.round(peak)} W`);
  setText('#samples', samples);
}

function renderHistory() {
  const rows = $('#rows');
  if (!rows) return;

  rows.innerHTML = history.length
    ? history.map(item => `
        <tr>
          <td>${item.time}</td>
          <td>${Math.round(item.power)} W</td>
          <td>${formatNumber(item.energy)} kWh</td>
          <td>R$ ${formatNumber(item.bonus)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">Nenhuma amostra ainda.</td></tr>';
}

function drawChart() {
  const canvas = $('#graph');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Grade
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = i * height / 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const paddingLeft = 45 * ratio;
  const maxPower = 1000;

  const point = (value, index) => ({
    x: paddingLeft + index * (width - paddingLeft) / (data.length - 1),
    y: height - (Math.max(0, value) / maxPower) * (height - 10 * ratio)
  });

  // Área
  ctx.beginPath();
  data.forEach((value, index) => {
    const p = point(value, index);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(width, height);
  ctx.lineTo(paddingLeft, height);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,212,0,.08)';
  ctx.fill();

  // Linha
  ctx.beginPath();
  data.forEach((value, index) => {
    const p = point(value, index);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = '#ffd400';
  ctx.lineWidth = 2 * ratio;
  ctx.stroke();

  // Ponto atual
  const last = point(data[data.length - 1], data.length - 1);
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4 * ratio, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd400';
  ctx.shadowColor = '#ffd400';
  ctx.shadowBlur = 12 * ratio;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function simulationTick() {
  if (running) {
    if (demo) {
      // Simulação suave da geração, como se viesse do potenciômetro/ESP32.
      const time = Date.now() / 1000;
      const wave1 = (Math.sin(time * 1.2) + 1) / 2;
      const wave2 = (Math.sin(time * 0.43) + 1) / 2;
      const target = Math.max(20, Math.min(1000, wave1 * 650 + wave2 * 250 + 70));
      power += (target - power) * 0.12;
      setPower(power);
    }

    // W -> kWh. O loop roda aproximadamente a cada frame, por isso usamos
    // o tempo real decorrido entre frames em vez de assumir 1/60 s.
    const now = performance.now();
    const elapsedHours = lastFrameTime ? (now - lastFrameTime) / 3600000 : 0;
    energy += power * elapsedHours;

    samples++;
    sumPower += power;
    peak = Math.max(peak, power);

    data.push(power);
    data.shift();

    // Registra uma linha no histórico aproximadamente a cada 5 frames.
    if (samples % 5 === 0) {
      history.unshift({
        time: new Date().toLocaleTimeString('pt-BR'),
        power,
        energy,
        bonus: energy * RATE
      });
      history = history.slice(0, 18);
      renderHistory();
    }

    updateDashboard();
    drawChart();
  }

  lastFrameTime = performance.now();
  requestAnimationFrame(simulationTick);
}

let lastFrameTime = performance.now();

const slider = $('#slider');
if (slider) {
  slider.addEventListener('input', (event) => {
    demo = false;
    setText('#mode', 'MANUAL');
    setPower(event.target.value);
  });
}

const demoButton = $('#demo');
if (demoButton) {
  demoButton.addEventListener('click', () => {
    demo = true;
    running = true;
    setText('#mode', 'SIMULAÇÃO');
    setPower(power || 300);
  });
}

const heroButton = $('#startHero');
if (heroButton) {
  heroButton.addEventListener('click', () => {
    const dashboard = $('#dashboard');
    if (dashboard) dashboard.scrollIntoView({ behavior: 'smooth' });
    demo = true;
    running = true;
    setText('#mode', 'SIMULAÇÃO');
    setPower(power || 300);
  });
}

const pauseButton = $('#pause');
if (pauseButton) {
  pauseButton.addEventListener('click', () => {
    running = !running;
    pauseButton.textContent = running ? 'Ⅱ PAUSAR' : '▶ CONTINUAR';
    setText('#mode', running ? (demo ? 'SIMULAÇÃO' : 'MANUAL') : 'PAUSADO');
    lastFrameTime = performance.now();
  });
}

const resetButton = $('#reset');
if (resetButton) {
  resetButton.addEventListener('click', () => {
    power = 0;
    energy = 0;
    samples = 0;
    sumPower = 0;
    peak = 0;
    history = [];
    data.fill(0);
    demo = false;
    running = true;
    lastFrameTime = performance.now();

    setPower(0);
    setText('#mode', 'SIMULAÇÃO');
    if (pauseButton) pauseButton.textContent = 'Ⅱ PAUSAR';
    renderHistory();
    updateDashboard();
    drawChart();
  });
}

const clearButton = $('#clear');
if (clearButton) {
  clearButton.addEventListener('click', () => {
    history = [];
    renderHistory();
  });
}

window.addEventListener('resize', drawChart);

setPower(0);
renderHistory();
updateDashboard();
drawChart();
requestAnimationFrame(simulationTick);

// Mobile: keep the interactive chart responsive after orientation changes.
window.addEventListener("orientationchange",()=>setTimeout(drawChart,250));
