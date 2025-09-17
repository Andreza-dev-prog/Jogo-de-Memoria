/* script.js - Jogo da Memória (corrigido para modo difícil) */

/* -------------------------
   Elementos do DOM
   ------------------------- */
const boardEl        = document.getElementById('board');
const difficultyEl   = document.getElementById('difficulty');
const restartBtn     = document.getElementById('restart');
const movesEl        = document.getElementById('moves');
const matchesEl      = document.getElementById('matches');
const timerEl        = document.getElementById('timer');
const winModal       = document.getElementById('winModal');
const finalTime      = document.getElementById('finalTime');
const finalMoves     = document.getElementById('finalMoves');
const playAgain      = document.getElementById('playAgain');
const closeModal     = document.getElementById('closeModal');

/* -------------------------
   Pool de símbolos (mínimo 18 para 36 cartas)
   ------------------------- */
const emojis = [
  '🐶','🐱','🦊','🐻','🐼','🐵','🦁','🐷','🐸',
  '🦄','🐝','🐙','🦋','🐴','🐧','🦖','🦉','🐨'
];

/* -------------------------
   Estado do jogo
   ------------------------- */
let state = {
  gridSize: 16,        // 16 por padrão (4x4). Hard = 36
  cards: [],
  firstCard: null,
  secondCard: null,
  lock: false,
  moves: 0,
  matches: 0,
  timerId: null,
  seconds: 0
};

/* -------------------------
   Inicialização / reinício
   ------------------------- */
function startGame(){
  const diff = difficultyEl.value;
  boardEl.className = 'board ' + diff;

  // definir gridSize: hard -> 36, senão 16
  state.gridSize = (diff === 'hard') ? 36 : 16;

  resetState();
  buildCards(state.gridSize);
  renderBoard();
  startTimer();
}

/* Zera o estado e UI */
function resetState(){
  state.cards = [];
  state.firstCard = null;
  state.secondCard = null;
  state.lock = false;
  state.moves = 0;
  state.matches = 0;
  state.seconds = 0;
  clearInterval(state.timerId);

  movesEl.textContent = '0';
  matchesEl.textContent = '0';
  timerEl.textContent = '00:00';
  hideModal();
}

/* -------------------------
   Construção das cartas
   ------------------------- */
function buildCards(count){
  const pairCount = count / 2;

  // Garantir símbolos suficientes: se emojis.length < pairCount, repetir emojis até alcançar
  let pool = emojis.slice();
  if(pool.length < pairCount){
    const needed = pairCount - pool.length;
    // repetir os primeiros emojis para completar (visualmente pode repetir ícones)
    for(let i=0;i<needed;i++){
      pool.push(emojis[i % emojis.length]);
    }
  }

  // selecionar os primeiros pairCount símbolos embaralhados
  pool = shuffleArray(pool);
  const chosen = pool.slice(0, pairCount);

  // criar pares e embaralhar
  const cardValues = shuffleArray([...chosen, ...chosen]);
  state.cards = cardValues.map((val, idx) => ({ id: idx, val, matched: false, flipped: false }));
}

/* -------------------------
   Renderização do tabuleiro
   ------------------------- */
function renderBoard(){
  boardEl.innerHTML = '';
  state.cards.forEach(card => {
    const cardWrap = document.createElement('div');
    cardWrap.className = 'card';
    cardWrap.setAttribute('data-id', card.id);
    cardWrap.setAttribute('role','button');
    cardWrap.setAttribute('aria-label','Carta');
    cardWrap.tabIndex = 0;

    const inner = document.createElement('div');
    const back = document.createElement('div'); back.className='face back'; back.textContent='?';
    const front = document.createElement('div'); front.className='face front'; front.textContent=card.val;
    inner.appendChild(back); inner.appendChild(front);
    cardWrap.appendChild(inner);

    if(card.flipped) cardWrap.classList.add('flip');
    if(card.matched) cardWrap.classList.add('hidden');

    // handlers
    cardWrap.addEventListener('click', () => onCardClick(card.id));
    cardWrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(card.id); }
    });

    boardEl.appendChild(cardWrap);
  });
}

/* -------------------------
   Interação com cartas
   ------------------------- */
function onCardClick(id){
  if(state.lock) return;

  const card = state.cards.find(c => c.id === id);
  if(!card || card.flipped || card.matched) return;

  flipCard(card.id);

  if(!state.firstCard){
    state.firstCard = card;
    return;
  }

  if(state.firstCard && !state.secondCard && state.firstCard.id !== card.id){
    state.secondCard = card;
    state.moves++;
    movesEl.textContent = state.moves;
    checkMatch();
  }
}

function flipCard(id){
  const card = state.cards.find(c => c.id === id);
  if(!card) return;
  card.flipped = true;
  const el = boardEl.querySelector(`[data-id="${id}"]`);
  if(el) el.classList.add('flip');
}

function unflipCard(id){
  const card = state.cards.find(c => c.id === id);
  if(!card) return;
  card.flipped = false;
  const el = boardEl.querySelector(`[data-id="${id}"]`);
  if(el) el.classList.remove('flip');
}

/* -------------------------
   Verificação de pares e vitória
   ------------------------- */
function checkMatch(){
  if(!state.firstCard || !state.secondCard) return;
  state.lock = true;

  const isMatch = state.firstCard.val === state.secondCard.val;

  if(isMatch){
    // marcar como matched
    state.firstCard.matched = true;
    state.secondCard.matched = true;
    state.matches++;
    matchesEl.textContent = state.matches;

    // animação curta antes de esconder (garante que o flip seja visto)
    setTimeout(() => {
      const elA = boardEl.querySelector(`[data-id="${state.firstCard.id}"]`);
      const elB = boardEl.querySelector(`[data-id="${state.secondCard.id}"]`);
      if(elA) elA.classList.add('hidden');
      if(elB) elB.classList.add('hidden');

      resetPick();
      checkWin();
    }, 450);
  } else {
    // não é par: desvira após um curto atraso
    setTimeout(() => {
      unflipCard(state.firstCard.id);
      unflipCard(state.secondCard.id);
      resetPick();
    }, 700);
  }
}

function resetPick(){
  state.firstCard = null;
  state.secondCard = null;
  state.lock = false;
}

/* Verifica se todos os pares foram encontrados */
function checkWin(){
  const pairCount = state.gridSize / 2;
  if(state.matches === pairCount){
    stopTimer();
    finalTime.textContent = formatTime(state.seconds);
    finalMoves.textContent = state.moves;
    showModal();
  }
}

/* -------------------------
   Temporizador
   ------------------------- */
function startTimer(){
  clearInterval(state.timerId);
  state.seconds = 0;
  timerEl.textContent = formatTime(state.seconds);
  state.timerId = setInterval(() => {
    state.seconds++;
    timerEl.textContent = formatTime(state.seconds);
  }, 1000);
}

function stopTimer(){
  clearInterval(state.timerId);
}

function formatTime(totalSeconds){
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/* -------------------------
   Utilitários
   ------------------------- */
function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------------------------
   UI Helpers: modal
   ------------------------- */
function showModal(){ winModal.classList.remove('hidden'); }
function hideModal(){ winModal.classList.add('hidden'); }

/* -------------------------
   Eventos e start inicial
   ------------------------- */
restartBtn.addEventListener('click', startGame);
difficultyEl.addEventListener('change', startGame);
playAgain.addEventListener('click', startGame);
closeModal.addEventListener('click', hideModal);

// inicia primeira vez
startGame();
