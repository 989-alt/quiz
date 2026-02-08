// DOM 요소
const namesInput = document.getElementById('names');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const nameCount = document.getElementById('name-count');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// 랜덤 뽑기
const randomBtn = document.getElementById('random-btn');
const slotMachine = document.getElementById('slot-machine');
const slotName = document.getElementById('slot-name');
const randomResult = document.getElementById('random-result');
const winnerName = document.getElementById('winner-name');

// 팀 나누기
const teamCountInput = document.getElementById('team-count');
const teamBtn = document.getElementById('team-btn');
const teamResult = document.getElementById('team-result');

// 순서 정하기
const orderBtn = document.getElementById('order-btn');
const orderResult = document.getElementById('order-result');

// Confetti
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// --- 이름 목록 ---

function getNames() {
  return namesInput.value
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0);
}

function updateNameCount() {
  const names = getNames();
  nameCount.textContent = names.length > 0 ? `${names.length}명` : '';
}

namesInput.addEventListener('input', updateNameCount);

// localStorage 저장/불러오기
saveBtn.addEventListener('click', () => {
  localStorage.setItem('presentor-names', namesInput.value);
  saveBtn.textContent = '✅ 저장됨';
  setTimeout(() => { saveBtn.textContent = '💾 저장'; }, 1500);
});

loadBtn.addEventListener('click', () => {
  const saved = localStorage.getItem('presentor-names');
  if (saved) {
    namesInput.value = saved;
    updateNameCount();
    loadBtn.textContent = '✅ 불러옴';
    setTimeout(() => { loadBtn.textContent = '📂 불러오기'; }, 1500);
  } else {
    loadBtn.textContent = '❌ 없음';
    setTimeout(() => { loadBtn.textContent = '📂 불러오기'; }, 1500);
  }
});

// 자동 불러오기
const savedNames = localStorage.getItem('presentor-names');
if (savedNames) {
  namesInput.value = savedNames;
  updateNameCount();
}

// --- 탭 전환 ---

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
  });
});

// --- 랜덤 뽑기 (슬롯머신) ---

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

randomBtn.addEventListener('click', () => {
  const names = getNames();
  if (names.length < 2) {
    alert('이름을 2명 이상 입력해주세요!');
    return;
  }

  // 이전 결과 숨기기
  randomResult.classList.add('hidden');
  slotMachine.classList.remove('hidden');
  randomBtn.disabled = true;

  // 당첨자 미리 결정
  const winner = names[Math.floor(Math.random() * names.length)];

  // 슬롯머신 애니메이션
  slotMachine.classList.add('spinning');
  let count = 0;
  const totalSpins = 25 + Math.floor(Math.random() * 10);
  let delay = 50;

  function spin() {
    const randomName = names[Math.floor(Math.random() * names.length)];
    slotName.textContent = randomName;
    count++;

    if (count < totalSpins) {
      // 점점 느려지기
      if (count > totalSpins * 0.6) {
        delay += 15;
      }
      if (count > totalSpins * 0.8) {
        delay += 30;
      }
      setTimeout(spin, delay);
    } else {
      // 최종 당첨자 표시
      slotName.textContent = winner;
      slotMachine.classList.remove('spinning');

      setTimeout(() => {
        slotMachine.classList.add('hidden');
        randomResult.classList.remove('hidden');
        winnerName.textContent = winner;
        randomBtn.disabled = false;
        launchConfetti();
      }, 500);
    }
  }

  spin();
});

// --- 팀 나누기 ---

teamBtn.addEventListener('click', () => {
  const names = getNames();
  const teamCount = parseInt(teamCountInput.value);

  if (names.length < 2) {
    alert('이름을 2명 이상 입력해주세요!');
    return;
  }
  if (teamCount < 2 || teamCount > names.length) {
    alert(`팀 수는 2 ~ ${names.length} 사이로 입력해주세요!`);
    return;
  }

  const shuffled = shuffle(names);
  const teams = Array.from({ length: teamCount }, () => []);

  shuffled.forEach((name, i) => {
    teams[i % teamCount].push(name);
  });

  teamResult.innerHTML = teams.map((members, i) => `
    <div class="team-card">
      <h3>팀 ${i + 1} (${members.length}명)</h3>
      <div class="members">
        ${members.map(m => `<span class="member-tag">${m}</span>`).join('')}
      </div>
    </div>
  `).join('');
});

// --- 순서 정하기 ---

orderBtn.addEventListener('click', () => {
  const names = getNames();
  if (names.length < 2) {
    alert('이름을 2명 이상 입력해주세요!');
    return;
  }

  const shuffled = shuffle(names);

  orderResult.innerHTML = `
    <ul class="order-list">
      ${shuffled.map((name, i) => `
        <li class="order-item">
          <span class="order-number">${i + 1}</span>
          <span class="order-name">${name}</span>
        </li>
      `).join('')}
    </ul>
  `;
});

// --- Confetti ---

function launchConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#6c5ce7', '#fd79a8', '#00cec9', '#fdcb6e', '#e17055', '#00b894', '#e84393'];
  const total = 80;

  for (let i = 0; i < total; i++) {
    pieces.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * 200,
      w: 8 + Math.random() * 6,
      h: 6 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 120;

  function animate() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    frame++;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rotation += p.rotationSpeed;

      if (frame > maxFrames * 0.7) {
        p.opacity -= 0.03;
      }

      if (p.opacity <= 0) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  animate();
}

// 리사이즈 시 캔버스 크기 조정
window.addEventListener('resize', () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});
