const STORAGE_KEY = "quizAppState";

const screens = {
  start: document.getElementById("start-screen"),
  loading: document.getElementById("loading-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen"),
  error: document.getElementById("error-screen"),
};

const els = {
  amount: document.getElementById("amount"),
  difficulty: document.getElementById("difficulty"),
  category: document.getElementById("category"),
  startBtn: document.getElementById("start-btn"),
  questionText: document.getElementById("question-text"),
  optionsContainer: document.getElementById("options-container"),
  nextBtn: document.getElementById("next-btn"),
  questionCounter: document.getElementById("question-counter"),
  scoreDisplay: document.getElementById("score-display"),
  progressFill: document.getElementById("progress-fill"),
  timer: document.getElementById("timer"),
  finalScore: document.getElementById("final-score"),
  totalQuestions: document.getElementById("total-questions"),
  scoreMessage: document.getElementById("score-message"),
  resultsUl: document.getElementById("results-ul"),
  restartBtn: document.getElementById("restart-btn"),
  backBtn: document.getElementById("back-btn"),
  errorMessage: document.getElementById("error-message"),
};

let state = {
  settings: { amount: 10, difficulty: "medium", category: "" },
  questions: [],
  currentIndex: 0,
  score: 0,
  answers: [], // { selected, correct, isCorrect }
  answered: false,
};

let timerInterval = null;
let timeLeft = 15;
const TIMER_ENABLED = true;
const TIMER_SECONDS = 15;

// ---------- Helpers ----------
function decodeHTML(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function saveState() {
  const toSave = {
    settings: state.settings,
    questions: state.questions,
    currentIndex: state.currentIndex,
    score: state.score,
    answers: state.answers,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.questions || !data.questions.length) return false;
    state.settings = data.settings || state.settings;
    state.questions = data.questions;
    state.currentIndex = data.currentIndex ?? 0;
    state.score = data.score ?? 0;
    state.answers = data.answers || [];
    return true;
  } catch {
    return false;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  state = {
    settings: { amount: 10, difficulty: "medium", category: "" },
    questions: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    answered: false,
  };
}

// ---------- Categories ----------
async function loadCategories() {
  try {
    const res = await fetch("https://opentdb.com/api_category.php");
    const data = await res.json();
    const select = els.category;
    data.trivia_categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn("Could not load categories", err);
  }
}

// ---------- Fetch Questions ----------
async function fetchQuestions() {
  const { amount, difficulty, category } = state.settings;
  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (difficulty) url += `&difficulty=${difficulty}`;
  if (category) url += `&category=${category}`;

  showScreen("loading");

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.response_code !== 0 || !data.results || data.results.length === 0) {
      els.errorMessage.textContent =
        "سؤالی یافت نشد / No questions found for the selected settings.";
      showScreen("error");
      return;
    }

    state.questions = data.results.map((q) => {
      const incorrect = q.incorrect_answers.map(decodeHTML);
      const correct = decodeHTML(q.correct_answer);
      const options = shuffle([correct, ...incorrect]);
      return {
        question: decodeHTML(q.question),
        correct,
        options,
        category: q.category,
        difficulty: q.difficulty,
      };
    });

    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.answered = false;
    saveState();
    renderQuestion();
    showScreen("quiz");
  } catch (err) {
    console.error(err);
    els.errorMessage.textContent =
      "Failed to load questions. Please check your connection and try again.";
    showScreen("error");
  }
}

// ---------- Timer ----------
function startTimer() {
  if (!TIMER_ENABLED) {
    els.timer.classList.add("hidden");
    return;
  }
  stopTimer();
  timeLeft = TIMER_SECONDS;
  els.timer.classList.remove("hidden", "warning");
  els.timer.textContent = `${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    els.timer.textContent = `${timeLeft}s`;
    if (timeLeft <= 5) els.timer.classList.add("warning");
    if (timeLeft <= 0) {
      stopTimer();
      if (!state.answered) {
        // Auto-mark as unanswered / wrong
        handleAnswer(null);
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ---------- Render Question ----------
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  state.answered = false;
  els.nextBtn.disabled = true;
  els.nextBtn.textContent =
    state.currentIndex === state.questions.length - 1
      ? "See Results"
      : "Next Question";

  els.questionText.textContent = q.question;
  els.questionCounter.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  els.scoreDisplay.textContent = `Score: ${state.score}`;

  const progress = ((state.currentIndex) / state.questions.length) * 100;
  els.progressFill.style.width = `${progress}%`;

  els.optionsContainer.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleAnswer(opt));
    els.optionsContainer.appendChild(btn);
  });

  // Restore previous answer if revisiting (from localStorage resume)
  const prev = state.answers[state.currentIndex];
  if (prev) {
    state.answered = true;
    els.nextBtn.disabled = false;
    highlightAnswers(prev.selected, q.correct);
  } else {
    startTimer();
  }
}

function highlightAnswers(selected, correct) {
  const buttons = els.optionsContainer.querySelectorAll(".option");
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === correct) {
      btn.classList.add("correct");
    }
    if (selected && btn.textContent === selected && selected !== correct) {
      btn.classList.add("incorrect");
    }
    if (selected && btn.textContent === selected) {
      btn.classList.add("selected");
    }
  });
}

function handleAnswer(selected) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.currentIndex];
  const isCorrect = selected === q.correct;
  if (isCorrect) state.score++;

  state.answers[state.currentIndex] = {
    selected,
    correct: q.correct,
    isCorrect,
  };

  highlightAnswers(selected, q.correct);
  els.nextBtn.disabled = false;
  els.scoreDisplay.textContent = `Score: ${state.score}`;
  saveState();
}

// ---------- Next / Results ----------
function goNext() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    saveState();
    renderQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  stopTimer();
  els.progressFill.style.width = "100%";
  els.finalScore.textContent = state.score;
  els.totalQuestions.textContent = state.questions.length;

  const pct = Math.round((state.score / state.questions.length) * 100);
  if (pct >= 80) els.scoreMessage.textContent = "Excellent work! 🎉";
  else if (pct >= 50) els.scoreMessage.textContent = "Good job! Keep practicing.";
  else els.scoreMessage.textContent = "Keep practicing, you'll improve!";

  els.resultsUl.innerHTML = "";
  state.questions.forEach((q, i) => {
    const ans = state.answers[i] || {};
    const li = document.createElement("li");
    const userPart =
      ans.selected == null
        ? `<span class="user-wrong">No answer (time up)</span>`
        : ans.isCorrect
        ? ""
        : `<span class="user-wrong">Your answer: ${ans.selected}</span>`;

    li.innerHTML = `
      <span class="q-text">${i + 1}. ${q.question}</span>
      <span class="correct-answer">Correct: ${q.correct}</span>
      ${userPart}
    `;
    els.resultsUl.appendChild(li);
  });

  showScreen("result");
  // Keep state so refresh still shows results if desired; clear on restart
}

// ---------- Event Listeners ----------
els.startBtn.addEventListener("click", () => {
  state.settings = {
    amount: parseInt(els.amount.value, 10),
    difficulty: els.difficulty.value,
    category: els.category.value,
  };
  fetchQuestions();
});

els.nextBtn.addEventListener("click", goNext);

els.restartBtn.addEventListener("click", () => {
  clearState();
  stopTimer();
  // Restore form values
  els.amount.value = "10";
  els.difficulty.value = "medium";
  els.category.value = "";
  showScreen("start");
});

els.backBtn.addEventListener("click", () => {
  clearState();
  showScreen("start");
});

// ---------- Init ----------
async function init() {
  await loadCategories();

  // Restore form from last settings if any
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.settings) {
        els.amount.value = data.settings.amount || 10;
        els.difficulty.value = data.settings.difficulty || "medium";
        els.category.value = data.settings.category || "";
      }
    } catch {}
  }

  // Resume in-progress quiz if exists
  if (loadState() && state.questions.length > 0) {
    if (state.currentIndex >= state.questions.length) {
      showResults();
    } else {
      renderQuestion();
      showScreen("quiz");
    }
  } else {
    showScreen("start");
  }
}

init();
