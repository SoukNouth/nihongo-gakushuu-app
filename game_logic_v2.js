import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let isTracingMode = false;
let currentQuestionIndex = 0;
let currentPartIndex = 0;
let currentLetterIndex = 0;
let currentSlotIndex = 0;
let currentTracingLetter = ''; 
let strokes = []; 
let activeQuestions = []; 
let score = 0;
let mistakeMade = false; 

const tracingRules = {
  'い': 2, 
  'の': 1,
  'を': 3, 
  'が': 5,
  'は': 3,
  'に': 3,
  'で': 2
};


const problemDatabase = [
    {   
        category : 2,
        image: 'image/kuruma-green.png',
        parts: [
            { type: 'select', text: 'み' },
            { type: 'select', text: 'ど' },
            { type: 'select', text: 'り' },
            { type: 'trace',  text: 'の' },
            { type: 'select', text: 'く' },
            { type: 'select', text: 'る' },
            { type: 'select', text: 'ま' }
        ],
    },
    {   category : 2,
        image: 'image/kuruma-blue.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'お' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'く' },
            { type: 'select', text: 'る' },
            { type: 'select', text: 'ま' }
        ],
    },
    {   category : 2,
        image: 'image/kuruma-red.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'か' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'く' },
            { type: 'select', text: 'る' },
            { type: 'select', text: 'ま' }
        ],
    },
    {   category : 2,
        image: 'image/kuruma-white.png',
        parts: [
            { type: 'select', text: 'し' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'く' },
            { type: 'select', text: 'る' },
            { type: 'select', text: 'ま' }
        ],
    },
    {   category : 2,
        image: 'image/kuruma-black.png',
        parts: [
            { type: 'select', text: 'く' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'く' },
            { type: 'select', text: 'る' },
            { type: 'select', text: 'ま' }
        ],
    },
    {   category : 2,
        image: 'image/ie-yellow.png',
        parts: [
            { type: 'select', text: 'き' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'え' }
        ]
    },
    {   category : 2,
        image: 'image/ie-red.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'か' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'え' }
        ]
    },
    {   category : 2,
        image: 'image/ie-blue.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'お' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'え' }
        ]
    },

    {   category : 2,
        image: 'image/ie-green.png',
        parts: [
            { type: 'select', text: 'み' },
            { type: 'select', text: 'ど' },
            { type: 'select', text: 'り' },
            { type: 'trace',  text: 'の' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'え' }
        ]
    },

    {   category : 2,
        image: 'image/fuku-blue.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'お' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'ふ' },
            { type: 'select', text: 'く' }
        ]
    },
    {  
         category : 2,
        image: 'image/fuku-red.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'か' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'ふ' },
            { type: 'select', text: 'く' }
        ]
    },
    {
        category : 2,
        image: 'image/fuku-green.png',
        parts: [
            { type: 'select', text: 'み' },
            { type: 'select', text: 'ど' },
            { type: 'select', text: 'り' },
            { type: 'trace',  text: 'の' },
            { type: 'select', text: 'ふ' },
            { type: 'select', text: 'く' }
        ]
    },
    {
        category : 2,
        image: 'image/fuku-yellow.png',
        parts: [
            { type: 'select', text: 'き' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'ふ' },
            { type: 'select', text: 'く' }
        ]
    },
    {
    category : 2,
        image: 'image/kago-yellow.png',
        parts: [
            { type: 'select', text: 'き' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'か' },
            { type: 'select', text: 'ご' }
        ]
    },
    {
        category : 2,
        image: 'image/kago-green.png',
        parts: [
            { type: 'select', text: 'み' },
            { type: 'select', text: 'ど' },
            { type: 'select', text: 'り' },
            { type: 'trace',  text: 'の' },
            { type: 'select', text: 'か' },
            { type: 'select', text: 'ご' }
        ]
    },
    {
        category : 2,
        image: 'image/kago-red.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'か' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'か' },
            { type: 'select', text: 'ご' }
        ]
    },
     {
        category : 2,
        image: 'image/kago-blue.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'お' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'か' },
            { type: 'select', text: 'ご' }
        ]
    },
    {
        category : 2,
        image: 'image/isu-yellow.png',
        parts: [
            { type: 'select', text: 'き' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'ろ' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'す' }
        ]
    },
    {
        category : 2,
        image: 'image/isu-green.png',
        parts: [
            { type: 'select', text: 'み' },
            { type: 'select', text: 'ど' },
            { type: 'select', text: 'り' },
            { type: 'trace',  text: 'の' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'す' }
        ]
    },
    {
        category : 2,
        image: 'image/isu-red.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'か' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'す' }
        ]
    },
     {
        category : 2,
        image: 'image/isu-blue.png',
        parts: [
            { type: 'select', text: 'あ' },
            { type: 'select', text: 'お' },
            { type: 'trace',  text: 'い' },
            { type: 'select', text: 'い' },
            { type: 'select', text: 'す' }
        ]
    },
    
];


const hiragana = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', '　', 'ゆ', '　', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', '　', 'を', '　', 'ん',
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'
];

const gridContainer = document.getElementById('hiragana-container');
const tracingModal = document.getElementById('tracing-modal');


hiragana.forEach(char => {
    const button = document.createElement('button');
    button.textContent = char;
    if (char !== '　') {
        button.addEventListener('click', () => {
            checkAnswer(char); 
        });
    }
    gridContainer.appendChild(button);
});


const openMenuButton = document.getElementById('open-menu-btn');
const closeMenuButton = document.getElementById('close-menu-btn');
const menuModal = document.getElementById('menu-modal');

if(openMenuButton) openMenuButton.addEventListener('click', () => {
    menuModal.classList.add('is-visible');
});

if(closeMenuButton) closeMenuButton.addEventListener('click', () => {
    menuModal.classList.remove('is-visible');
});




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
    
    const question = activeQuestions[index];
    const imageElement = document.getElementById('question-image');
    
    
    imageElement.src = question.image;
    
    imageElement.onerror = function() {
        
        this.src = 'https://placehold.co/300x200?text=No+Image'; 
    };

    imageElement.onload = function() {
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    };
    
    const slotContainer = document.getElementById('answer-slots-container');
    slotContainer.innerHTML= '';

    question.parts.forEach((part, partIndex) => { 
        const letters = part.text.split(''); 
        
        letters.forEach(char => {
            const slot = document.createElement('div');
            slot.classList.add('answer-slot');
            slotContainer.appendChild(slot);
        });

        if (partIndex < question.parts.length - 1) {
            const space = document.createElement('div');
            space.classList.add('spacer'); 
            slotContainer.appendChild(space); 
        }
    });
}


function checkAnswer(clickedChar) {
    if (!activeQuestions || activeQuestions.length === 0) return;

    const question = activeQuestions[currentQuestionIndex];
    const currentPart = question.parts[currentPartIndex];
    
    if (currentPart.type === 'trace') return;

    const correctChar = currentPart.text[currentLetterIndex];

    if(clickedChar == correctChar){
        correctSound.currentTime = 0; 
        correctSound.play();
        console.log("Correct Select");
        
        const slots = document.querySelectorAll(".answer-slot");
        const nowSlot = slots[currentSlotIndex];
        nowSlot.textContent = clickedChar;

        currentSlotIndex++;
        currentLetterIndex++;

        if(currentLetterIndex >= currentPart.text.length){
            currentPartIndex++;
            currentLetterIndex = 0;
            
            if (currentPartIndex < question.parts.length) {
                const nextPart = question.parts[currentPartIndex];
                if (nextPart.type === 'trace') {
                    showTracingGuide(nextPart.text);
                    return; 
                }
            } else {
                if (!mistakeMade) score++; 
                setTimeout(() => loadQuestion(++currentQuestionIndex), 500);
            }
        }

    } else {
        wrongSound.currentTime = 0;
        wrongSound.play();
        console.log("Wrong Select");
    }
}

function showResultScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-visible';
    overlay.id = 'result-modal';

    const content = document.createElement('div');
    content.className = 'modal-content';
   
    const title = document.createElement('h2');
    title.textContent = "おめでとう！"; 
    
    const scoreText = document.createElement('h1');
    scoreText.textContent = `${score} / ${activeQuestions.length}`;
    scoreText.style.fontSize = "4em";
    scoreText.style.margin = "20px 0";
    scoreText.style.color = "#2ecc71"; 
    
    const controls = document.createElement('div');
    controls.className = 'modal-controls';
    
    const againBtn = document.createElement('button');
    againBtn.className = 'control-btn';
    againBtn.textContent = "もういちど"; 
    againBtn.style.background = "#3498db"; 
    againBtn.onclick = () => location.reload(); 
    
    const backBtn = document.createElement('button');
    backBtn.className = 'control-btn';
    backBtn.textContent = "もどる"; 
    backBtn.style.background = "#e74c3c"; 
    backBtn.onclick = () => {
        window.location.href = "page2.html";
    };
    
    controls.appendChild(againBtn);
    controls.appendChild(backBtn);
    
    content.appendChild(title);
    content.appendChild(scoreText);
    content.appendChild(controls);
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
    
    if(score === activeQuestions.length){
        const perfectSound = new Audio('tadashii.mp3'); 
        perfectSound.play();
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
    const brushSize = 25 * scale; 
    
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

  const validStrokes = strokes.filter(s => {
      let length = 0;
      for(let i=1; i<s.length; i++) {
          const dx = s[i].x - s[i-1].x;
          const dy = s[i].y - s[i-1].y;
          length += Math.sqrt(dx*dx + dy*dy);
      }
      return length > 10; 
  });

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
  
  return (coverage > 20 && errorRate < 50);
}

function acceptTracingAnswer() {
    const question = activeQuestions[currentQuestionIndex];
    const currentPart = question.parts[currentPartIndex];
    const char = currentPart.text;

    const slots = document.querySelectorAll(".answer-slot");
    const nowSlot = slots[currentSlotIndex];
    nowSlot.textContent = char;
    
    currentSlotIndex++;
    currentPartIndex++;
    currentLetterIndex = 0;
    isTracingMode = false;
    
    if (currentPartIndex < question.parts.length) {
        const nextPart = question.parts[currentPartIndex];
        if (nextPart.type === 'trace') {
            setTimeout(() => showTracingGuide(nextPart.text), 500);
            return;
        }
    } else {
         setTimeout(() => loadQuestion(++currentQuestionIndex), 500);
    }
}


document.getElementById('done-btn').onclick = () => {
  if (isTracingCorrect(currentTracingLetter)) {
    correctSound.currentTime = 0;
    correctSound.play();
    tracingModal.classList.remove('is-visible');
    acceptTracingAnswer(); 
  } else {
    wrongSound.currentTime = 0;
    wrongSound.play();
    mistakeMade = true; 
    alert("もういちど");
  }
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
    const category = categoryParam ? parseInt(categoryParam) : 2; 

    const countParam = params.get('count');
    const maxCount = countParam ? parseInt(countParam) : 5;

    try {
        await signInAnonymously(auth);
        console.log("Signed in anonymously");
    } catch (error) {
        console.error("Auth Error:", error);
       
    }

   
    let downloadedQuestions = [];
    try {
        const snapshot = await getDocs(collection(db, "questions"));
        snapshot.forEach(doc => {
           
            downloadedQuestions.push(doc.data());
        });
        console.log("Downloaded questions from Firebase:", downloadedQuestions.length);
    } catch (e) {
        console.error("Firebase Error (Continuing with local data only):", e);
        if(probCounter) probCounter.innerHTML = "DB Error (Using Local)";
    }

    
    const allQuestions = [...problemDatabase, ...downloadedQuestions];
    console.log("Total Combined Questions:", allQuestions.length);

 
    const filtered = allQuestions.filter(p => p.category === category);
    
    if(filtered.length === 0) {
        alert(`まだこのレベルの問題がありません！\n(No Level ${category} questions found)\n管理画面で追加してください。`);
        if(probCounter) probCounter.innerHTML = "0/0";
        return;
    }

    shuffleArray(filtered);
    activeQuestions = filtered.slice(0, Math.min(maxCount, filtered.length));

   
    if(probCounter) probCounter.innerHTML = `Loaded: ${downloadedQuestions.length} (DB) + ${problemDatabase.length} (Local)`;

    setTimeout(() => {
        loadQuestion(0);
    }, 10); 
});