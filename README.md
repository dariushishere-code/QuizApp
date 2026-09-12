# Quiz App

A single-page quiz application built with HTML, CSS, and vanilla JavaScript. It fetches multiple-choice questions from the Open Trivia Database API.

## Features

- **Start screen** with:
  - Number of questions (5 / 10 / 15 / 20)
  - Difficulty (Any / Easy / Medium / Hard)
  - Category (loaded from Open Trivia DB, optional)
- **Quiz screen**:
  - Question + 4 shuffled options
  - Immediate feedback (correct / incorrect highlighting)
  - Question counter and live score
  - Progress bar
  - Optional 15-second timer per question
- **Results screen**:
  - Final score
  - Short list of all questions with correct answers (and your wrong answers if any)
  - "Start Again" button
- **Persistence**: Settings, questions, current index, score and answers are saved in `localStorage`. Refreshing the page or closing the tab lets you continue where you left off.
- Loading state while fetching questions
- Empty-result handling: shows “No questions found” message

## API

- Categories: `https://opentdb.com/api_category.php`
- Questions: `https://opentdb.com/api.php?amount=N&category=ID&difficulty=LEVEL&type=multiple`

## How to run

Open `index.html` in a modern browser (or serve the folder with any static server).

```bash
# optional: simple local server
npx serve .
```

## Files

- `index.html` – structure
- `style.css` – dark modern UI
- `script.js` – logic, API, localStorage, timer
