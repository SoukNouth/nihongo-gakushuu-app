
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { localQuestions } from './local_questions.js';


const firebaseConfig = {
    apiKey: "AIzaSyAVvYZLRnhXw0r_L9qsWYKu2kQZmOyJSLs",
    authDomain: "nihongo-naraimashou.firebaseapp.com",
    projectId: "nihongo-naraimashou",
    storageBucket: "nihongo-naraimashou.appspot.com",
    messagingSenderId: "555772220708",
    appId: "1:555772220708:web:230347906896dd49390fb1"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


const correctSound = new Audio('tadashii.mp3');
const wrongSound = new Audio('machigai.mp3');

// ① 採点モード: localStorage から読み込む（デフォルト: オン）
const scoringEnabled = localStorage.getItem('scoringEnabled') !== 'false';

let isTracingMode = false;
let isPreTraceSelectMode = false; // ③ なぞる前に文字を選ぶ
let currentQuestionIndex = 0;
let currentPartIndex = 0;
let currentLetterIndex = 0;
let currentSlotIndex = 0;
let currentTracingLetter = '';
let strokes = [];
let activeQuestions = [];
let score = 0;
let mistakeMade = false;
let currentStudentId = null;
let currentCategory = 2;

const tracingRules = {
  'い': 2,
  'の': 1,
  'を': 3,
  'が': 5,
  'は': 3,
  'に': 3,
  'で': 2
};


const problemDatabase = localQuestions;


// ④ キーボードを２つのタブに分割
const hiraganaBasic = [
    'わ', 'ら', 'や', 'ま', 'は', 'な', 'た', 'さ', 'か', 'あ',
    '　', 'り', '　', 'み', 'ひ', 'に', 'ち', 'し', 'き', 'い',
    'を', 'る', 'ゆ', 'む', 'ふ', 'ぬ', 'つ', 'す', 'く', 'う',
    '　', 'れ', '　', 'め', 'へ', 'ね', 'て', 'せ', 'け', 'え',
    'ん', 'ろ', 'よ', 'も', 'ほ', 'の', 'と', 'そ', 'こ', 'お',
];

const hiraganaDakuten = [
    'ぱ', 'ば', 'だ', 'ざ', 'が',
    'ぴ', 'び', 'ぢ', 'じ', 'ぎ',
    'ぷ', 'ぶ', 'づ', 'ず', 'ぐ',
    'ぺ', 'べ', 'で', 'ぜ', 'げ',
    'ぽ', 'ぼ', 'ど', 'ぞ', 'ご',
];

// cols: キーボードの列数 (CSSのgrid-template-columnsと合わせる)
function buildGrid(container, chars, cols = 10) {
    chars.forEach((char, i) => {
        const button = document.createElement('button');
        button.textContent = char;
        button.classList.add(Math.floor(i / cols) % 2 === 0 ? 'row-dark' : 'row-light');
        button.classList.add('btn-fall-in');
        button.style.animationDelay = `${(Math.floor(i / cols) * 0.1).toFixed(2)}s`;
        if (char !== '　') {
            button.addEventListener('click', () => { checkAnswer(char); });
        }
        container.appendChild(button);
    });
}

const gridContainer = document.getElementById('hiragana-container');
const gridDakutenContainer = document.getElementById('hiragana-dakuten-container');
const tracingModal = document.getElementById('tracing-modal');

buildGrid(gridContainer, hiraganaBasic);
buildGrid(gridDakutenContainer, hiraganaDakuten, 5);

// ④ 1つの切り替えボタン: 押すたびに基本↔濁音を切り替える
let currentKeyboard = 'basic';
const keyboardToggleBtn = document.getElementById('keyboard-toggle-btn');

if (keyboardToggleBtn) {
    keyboardToggleBtn.addEventListener('click', () => {
        if (currentKeyboard === 'basic') {
            gridContainer.classList.add('hidden');
            gridDakutenContainer.classList.remove('hidden');
            keyboardToggleBtn.textContent = 'あかさ…';
            currentKeyboard = 'dakuten';
        } else {
            gridContainer.classList.remove('hidden');
            gridDakutenContainer.classList.add('hidden');
            keyboardToggleBtn.textContent = 'がざだ…';
            currentKeyboard = 'basic';
        }
    });
}

const openMenuButton = document.getElementById('open-menu-btn');
const closeMenuButton = document.getElementById('close-menu-btn');
const menuModal = document.getElementById('menu-modal');

if(openMenuButton) openMenuButton.addEventListener('click', () => {
    menuModal.classList.add('is-visible');
});

if(closeMenuButton) closeMenuButton.addEventListener('click', () => {
    menuModal.classList.remove('is-visible');
});


function showFeedback(type) {
    const el = document.getElementById(type === 'correct' ? 'feedback-maru' : 'feedback-batsu');
    if (!el) return;

    el.classList.add('show');

    setTimeout(() => {
        el.classList.remove('show');
    }, 600);
}



function loadQuestion(index) {
    if (index >= activeQuestions.length) {
         showResultScreen();
        return;
    }

    currentQuestionIndex = index;

    const probCounter = document.querySelector(".question-counter");
    if(probCounter) probCounter.innerHTML= (index + 1) + '/' + activeQuestions.length;

    currentPartIndex = 0;
    currentLetterIndex = 0;
    currentSlotIndex = 0;
    isPreTraceSelectMode = false;
    mistakeMade = false;

    const question = activeQuestions[index];
    const imageElement = document.getElementById('question-image');

    imageElement.classList.remove('img-fall-in');
    imageElement.removeAttribute('src');
    imageElement.style.opacity = '0';
    setTimeout(() => { imageElement.src = question.image; }, 10);

    imageElement.onerror = function() {
        this.src = 'https://placehold.co/300x200?text=No+Image';
    };

    imageElement.onload = function() {
        imageElement.style.opacity = '1';
        void imageElement.offsetWidth;
        imageElement.classList.add('img-fall-in');
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    };

    const slotContainer = document.getElementById('answer-slots-container');
    slotContainer.innerHTML = '';
    slotContainer.classList.remove('loaded');

    let slotIndex = 0;
    question.parts.forEach((part, partIndex) => {
        const letters = part.text.split('');

        letters.forEach(char => {
            const slot = document.createElement('div');
            slot.classList.add('answer-slot', 'slot-enter');
            slot.style.animationDelay = `${slotIndex * 0.07}s`;
            slotContainer.appendChild(slot);
            slotIndex++;
        });

        if (partIndex < question.parts.length - 1) {
            const space = document.createElement('div');
            space.classList.add('spacer');
            slotContainer.appendChild(space);
        }
    });

    requestAnimationFrame(() => slotContainer.classList.add('loaded'));
}

// ③ なぞる前に文字を選ぶモードに入る
function enterPreTraceSelectMode(letter) {
    currentTracingLetter = letter;
    isPreTraceSelectMode = true;
    const slots = document.querySelectorAll(".answer-slot");
    if (slots[currentSlotIndex]) {
        slots[currentSlotIndex].classList.add('slot-pre-trace');
    }
}

function checkAnswer(clickedChar) {
    if (!activeQuestions || activeQuestions.length === 0) return;

    // ③ プリトレースセレクトモード: なぞる文字を先に選ぶ
    if (isPreTraceSelectMode) {
        if (clickedChar === currentTracingLetter) {
            correctSound.currentTime = 0;
            correctSound.play();
            showFeedback('correct');
            isPreTraceSelectMode = false;
            document.querySelectorAll('.slot-pre-trace').forEach(s => s.classList.remove('slot-pre-trace'));
            showTracingGuide(currentTracingLetter);
        } else {
            wrongSound.currentTime = 0;
            wrongSound.play();
            showFeedback('wrong');
            mistakeMade = true;
        }
        return;
    }

    const question = activeQuestions[currentQuestionIndex];
    const currentPart = question.parts[currentPartIndex];

    if (currentPart.type === 'trace') return;

    const correctChar = currentPart.text[currentLetterIndex];

    if(clickedChar == correctChar){
        correctSound.currentTime = 0;
        correctSound.play();

        showFeedback('correct');

        const slots = document.querySelectorAll(".answer-slot");
        const nowSlot = slots[currentSlotIndex];
        nowSlot.textContent = clickedChar;
        nowSlot.classList.remove('slot-filled', 'slot-enter');
        void nowSlot.offsetWidth;
        nowSlot.classList.add('slot-filled');

        currentSlotIndex++;
        currentLetterIndex++;

        if(currentLetterIndex >= currentPart.text.length){
            currentPartIndex++;
            currentLetterIndex = 0;

            if (currentPartIndex < question.parts.length) {
                const nextPart = question.parts[currentPartIndex];
                if (nextPart.type === 'trace') {
                    // ③ 直接なぞりに進まず、まず文字を選ばせる
                    enterPreTraceSelectMode(nextPart.text);
                    return;
                }
            } else {
                if (!mistakeMade) score++;
                setTimeout(() => loadQuestion(++currentQuestionIndex), 800);
            }
        }

    } else {
        wrongSound.currentTime = 0;
        wrongSound.play();
        showFeedback('wrong');
        mistakeMade = true;
    }
}

function showResultScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-visible';
    overlay.id = 'result-modal';

    const content = document.createElement('div');
    content.className = 'modal-content result-content';

    const title = document.createElement('h2');
    title.textContent = "おめでとう！";

    const stars = document.createElement('div');
    stars.className = 'result-stars';
    stars.textContent = "⭐⭐⭐";

    const scoreText = document.createElement('div');
    scoreText.className = 'result-score';
    scoreText.textContent = `${score} / ${activeQuestions.length}`;

    const controls = document.createElement('div');
    controls.className = 'modal-controls';

    const againBtn = document.createElement('button');
    againBtn.className = 'modal-close-button result-btn-blue';
    againBtn.textContent = "もういちど";
    againBtn.onclick = () => location.reload();

    const backBtn = document.createElement('button');
    backBtn.className = 'modal-close-button result-btn-red';
    backBtn.textContent = "もどる";
    backBtn.onclick = () => {
        window.location.href = currentStudentId
            ? `page2.html?student=${currentStudentId}`
            : "page2.html";
    };

    controls.appendChild(againBtn);
    controls.appendChild(backBtn);

    content.appendChild(title);
    content.appendChild(stars);
    content.appendChild(scoreText);
    content.appendChild(controls);
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    if(score === activeQuestions.length){
        const perfectSound = new Audio('tadashii.mp3');
        perfectSound.play();
    }

    // スコアをFirestoreに保存
    if (currentStudentId) {
        addDoc(collection(db, "scores"), {
            studentId: currentStudentId,
            category: currentCategory,
            score,
            total: activeQuestions.length,
            date: new Date()
        }).catch(console.error);
    }
}


const tracingCanvas = document.getElementById('tracing-canvas');
const ctx = tracingCanvas.getContext('2d', { willReadFrequently: true });

const ghostCanvas = document.createElement('canvas');
const ghostCtx = ghostCanvas.getContext('2d', { willReadFrequently: true });

let isDrawing = false;
let currentStroke = [];


function getScale() {
    const wrapper = document.querySelector('.drawing-box');
    if (!wrapper) return 1;
    return wrapper.clientWidth / 300;
}

function setDrawingStyle() {
    const scale = getScale();
    const brushSize = 9 * scale;

    ctx.strokeStyle = "black";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
}

function resizeCanvas(){
   const wrapper = document.querySelector('.drawing-box');
   if(!wrapper) return;

   const width = wrapper.clientWidth;
   const height = wrapper.clientHeight;

   if (tracingCanvas.width !== width || tracingCanvas.height !== height) {
       tracingCanvas.width = width;
       tracingCanvas.height = height;
       ghostCanvas.width = width;
       ghostCanvas.height = height;

       if (isTracingMode && currentTracingLetter) {
           drawGhost(currentTracingLetter);
           redrawCanvas(currentTracingLetter);
       }
   }

   setDrawingStyle();
}


function showTracingGuide(letter) {
    isTracingMode = true;
    currentTracingLetter = letter;
    strokes = [];

    tracingModal.classList.add('is-visible');

    setTimeout(() => {
        resizeCanvas();
        drawGhost(letter);
        redrawCanvas(letter);
    }, 100);
}


function drawGhost(letter) {
    ghostCtx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
    const fontSize = Math.min(ghostCanvas.width, ghostCanvas.height) * 0.7;

    ghostCtx.font = `bold ${fontSize}px sans-serif`;
    ghostCtx.textAlign = "center";
    ghostCtx.textBaseline = "middle";
    ghostCtx.fillStyle = "black";

    const x = ghostCanvas.width / 2;
    const y = ghostCanvas.height / 2;

    ghostCtx.fillText(letter, x, y);

    const ghostWidth = Math.min(ghostCanvas.width, ghostCanvas.height) * 0.18;

    ghostCtx.strokeStyle = "black";
    ghostCtx.lineWidth = ghostWidth;
    ghostCtx.lineJoin = "round";
    ghostCtx.strokeText(letter, x, y);
}


function redrawCanvas(letter) {
  ctx.clearRect(0, 0, tracingCanvas.width, tracingCanvas.height);

  const fontSize = Math.min(tracingCanvas.width, tracingCanvas.height) * 0.7;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, tracingCanvas.width / 2, tracingCanvas.height / 2);

  setDrawingStyle();

  strokes.forEach(stroke => {
    ctx.beginPath();
    stroke.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });
}

function getPos(event) {
    const rect = tracingCanvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
   if (e.type === 'mousedown' && e.button !== 0) return;
   e.preventDefault();

   isDrawing = true;
   currentStroke = [];
   const pos = getPos(e);
   currentStroke.push(pos);

   ctx.beginPath();
   ctx.moveTo(pos.x, pos.y);
   ctx.lineTo(pos.x, pos.y);
   ctx.stroke();
}

function draw(e){
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.push(pos);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();

    if (currentStroke.length > 0) {
        strokes.push(currentStroke);
    }
}


function isTracingCorrect(letter) {
  const w = tracingCanvas.width;
  const h = tracingCanvas.height;

  const userImg = ctx.getImageData(0, 0, w, h).data;
  const ghostImg = ghostCtx.getImageData(0, 0, w, h).data;

  let targetPixels = 0;
  let filledPixels = 0;
  let overlapPixels = 0;

  for (let i = 0; i < userImg.length; i += 4) {
      const ghostAlpha = ghostImg[i+3];
      const userAlpha = userImg[i+3];
      const userRed = userImg[i];

      const isTarget = ghostAlpha > 50;
      const isUserInk = userAlpha > 100 && userRed < 100;

      if (isTarget) {
          targetPixels++;
      }

      if (isUserInk) {
          filledPixels++;
          if (isTarget) {
              overlapPixels++;
          }
      }
  }

  if (targetPixels === 0) return true;

  const coverage = (overlapPixels / targetPixels) * 100;
  const outside = filledPixels - overlapPixels;
  const errorRate = filledPixels > 0 ? (outside / filledPixels) * 100 : 100;

  return (coverage > 20 && errorRate < 10);
}

function acceptTracingAnswer() {
    const question = activeQuestions[currentQuestionIndex];
    const currentPart = question.parts[currentPartIndex];
    const char = currentPart.text;

    const slots = document.querySelectorAll(".answer-slot");
    const nowSlot = slots[currentSlotIndex];
    nowSlot.textContent = char;
    nowSlot.classList.remove('slot-filled', 'slot-enter', 'slot-pre-trace');
    void nowSlot.offsetWidth;
    nowSlot.classList.add('slot-filled');

    currentSlotIndex++;
    currentPartIndex++;
    currentLetterIndex = 0;
    isTracingMode = false;

    showFeedback('correct');

    if (currentPartIndex < question.parts.length) {
        const nextPart = question.parts[currentPartIndex];
        if (nextPart.type === 'trace') {
            // 次もなぞりの場合は先に文字選択
            setTimeout(() => enterPreTraceSelectMode(nextPart.text), 500);
            return;
        }
    } else {
         setTimeout(() => loadQuestion(++currentQuestionIndex), 800);
    }
}


// ① できたボタン: 採点モードで動作が変わる
document.getElementById('done-btn').onclick = () => {
    if (scoringEnabled) {
        // 採点オン: ピクセル判定で自動採点
        if (isTracingCorrect(currentTracingLetter)) {
            correctSound.currentTime = 0;
            correctSound.play();
            tracingModal.classList.remove('is-visible');
            acceptTracingAnswer();
        } else {
            wrongSound.currentTime = 0;
            wrongSound.play();
            mistakeMade = true;
            alert("ラインの中でなぞってください");
        }
    } else {
        // 採点オフ: 先生が手動で○×を判断する
        document.getElementById('done-btn').style.display = 'none';
        document.getElementById('teacher-judge').classList.remove('hidden');
        tracingCanvas.style.pointerEvents = 'none';
    }
};

// ① 先生の○ボタン
document.getElementById('judge-correct').onclick = () => {
    correctSound.currentTime = 0;
    correctSound.play();
    document.getElementById('teacher-judge').classList.add('hidden');
    document.getElementById('done-btn').style.display = '';
    tracingCanvas.style.pointerEvents = 'auto';
    tracingModal.classList.remove('is-visible');
    acceptTracingAnswer();
};

// ① 先生の×ボタン
document.getElementById('judge-wrong').onclick = () => {
    wrongSound.currentTime = 0;
    wrongSound.play();
    mistakeMade = true;
    document.getElementById('teacher-judge').classList.add('hidden');
    document.getElementById('done-btn').style.display = '';
    tracingCanvas.style.pointerEvents = 'auto';
    // キャンバスをクリアして書き直せるようにする
    strokes = [];
    redrawCanvas(currentTracingLetter);
};

document.getElementById('undo-btn').onclick = () => {
  strokes.pop();
  redrawCanvas(currentTracingLetter);
};

document.getElementById('clear-btn').onclick = () => {
  strokes = [];
  redrawCanvas(currentTracingLetter);
};


tracingCanvas.addEventListener('mousedown', startDrawing);
tracingCanvas.addEventListener('mousemove', draw);
tracingCanvas.addEventListener('mouseup', stopDrawing);
tracingCanvas.addEventListener('mouseleave', stopDrawing);

tracingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
tracingCanvas.addEventListener('touchmove', draw, { passive: false });
tracingCanvas.addEventListener('touchend', stopDrawing);


window.addEventListener('resize', resizeCanvas);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    score = 0;
    const probCounter = document.querySelector(".question-counter");
    if(probCounter) probCounter.innerHTML = "読込中...";

    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    currentCategory = categoryParam ? parseInt(categoryParam) : 2;
    const countParam = params.get('count');
    const maxCount = countParam ? parseInt(countParam) : 5;
    currentStudentId = params.get('student');

    try { await signInAnonymously(auth); } catch(e) { console.error("Auth Error:", e); }

    // 生徒情報の読み込み
    let student = null;
    if (currentStudentId) {
        try {
            const studentSnap = await getDoc(doc(db, "students", currentStudentId));
            if (studentSnap.exists()) {
                student = studentSnap.data();
                const nameEl = document.getElementById('student-name-display');
                if (nameEl) nameEl.textContent = student.name;
            }
        } catch(e) { console.error("Student load error:", e); }
    }

    // 問題の読み込み（Firestore IDも保存）
    let downloadedQuestions = [];
    try {
        const snapshot = await getDocs(collection(db, "questions"));
        snapshot.forEach(docSnap => {
            downloadedQuestions.push({ firestoreId: docSnap.id, ...docSnap.data() });
        });
    } catch(e) {
        console.error("Firebase Error (Continuing with local data only):", e);
        if(probCounter) probCounter.innerHTML = "DB Error (Using Local)";
    }

    const allQuestions = [...problemDatabase, ...downloadedQuestions];

    const assigned = student?.assignedQuestionIds;
    const hasAssignment = assigned && assigned.length > 0;
    const filtered = allQuestions.filter(p => {
        if (p.category !== currentCategory) return false;
        if (!hasAssignment) return true;
        const qid = p.firestoreId ?? p.id;
        return assigned.includes(qid);
    });

    if(filtered.length === 0) {
        alert(`まだこのレベルの問題がありません！\n管理画面で追加してください。`);
        if(probCounter) probCounter.innerHTML = "0/0";
        return;
    }

    shuffleArray(filtered);
    activeQuestions = filtered.slice(0, Math.min(maxCount, filtered.length));

    if(probCounter) probCounter.innerHTML = `1/${activeQuestions.length}`;

    setTimeout(() => { loadQuestion(0); }, 1000);
});
