const fs = require("fs");

class GameEngine {
  constructor(io) {
    this.io = io;

    this.phase = "IDLE";

    this.currentPlayer = null;
    this.selectedAnswer = null;

    this.questions = this.loadQuestions();
    this.currentQuestionIndex = -1;

    this.scores = { 1: 0, 2: 0 };


    this.lifelines = {
        1: { fifty: 1, public: 1, steal: 1 },
        2: { fifty: 1, public: 1, steal: 1 }
        };
  }

  setPhase(newPhase) {
  this.phase = newPhase;

  console.log("→ PHASE:", newPhase);

  this.io.emit("phase", newPhase);
}

useFifty(playerId) {

  if (this.phase !== "WAITING_ADMIN_SELECTION" &&
      this.phase !== "WAITING_CONFIRM") return;

  if (this.lifelines[playerId].fifty <= 0) return;

  this.lifelines[playerId].fifty--;

  const q = this.questions[this.currentQuestionIndex];

  const wrong = [0,1,2,3].filter(i => i !== q.correct);

  const removed = wrong
    .sort(()=>Math.random()-0.5)
    .slice(0,2);

  console.log(`50/50 usado por J${playerId}`);

  this.io.emit("lifeline50", removed);
  this.io.emit("lifelineUpdate", {
    playerId,
    lifelines: this.lifelines[playerId]
  });
}

usePublic(playerId) {

  if (this.lifelines[playerId].public <= 0) return;

  this.lifelines[playerId].public--;

  console.log(`PUBLICO usado por J${playerId}`);

  this.io.emit("lifelinePublic", playerId);
  this.io.emit("lifelineUpdate", {
    playerId,
    lifelines: this.lifelines[playerId]
  });
}

useSteal(playerId) {

  if (this.phase !== "WAITING_ADMIN_SELECTION") return;

  if (this.lifelines[playerId].steal <= 0) return;

  this.lifelines[playerId].steal--;

  this.currentPlayer = playerId;

  console.log(`⚡ TURNO ROBADO por J${playerId}`);

  this.io.emit("turnStolen", playerId);
  this.io.emit("lifelineUpdate", {
    playerId,
    lifelines: this.lifelines[playerId]
  });
  
}
addLifeline(playerId, type, amount = 1) {

  if (!this.lifelines[playerId][type] && this.lifelines[playerId][type] !== 0)
    return;

  this.lifelines[playerId][type] += amount;

  console.log(`➕ J${playerId} gana ${amount} ${type}`);

  this.io.emit("lifelineUpdate", {
    playerId,
    lifelines: this.lifelines[playerId]
  });
}

  // -------------------
  // CSV
  // -------------------
    loadQuestions() {
    const raw = fs.readFileSync("questions.csv", "utf8");

    return raw
        .split("\n")
        .slice(1)
        .filter(l => l.trim() !== "")
        .map(line => {

        const [q,a,b,c,d,correct] = line.split(";");

        return {
            text: q,
            answers: [a,b,c,d],
            correct: parseInt(correct) - 1 // 1-based → 0-based
        };
        });
    }
  // -------------------
  // Estados
  // -------------------
  nextQuestion() {

  this.currentQuestionIndex++;

  if (this.currentQuestionIndex >= this.questions.length) {

    let winner = null;

    if (this.scores[1] > this.scores[2]) winner = 1;
    else if (this.scores[2] > this.scores[1]) winner = 2;
    else winner = 0; // empate

    this.io.emit("gameOver", {
      winner,
      scores: this.scores
    });

    this.phase = "GAME_OVER";

    return;
  }

  /* normal */
  const q = this.questions[this.currentQuestionIndex];

  this.phase = "WAIT_BUZZ";
  this.currentPlayer = null;
  this.selectedAnswer = null;

  this.io.emit("newQuestion", q);
}


  buzz(playerId) {

    if (this.phase !== "WAITING_BUZZ") {
        console.log(`IGNORADO buzz de J${playerId} (fase ${this.phase})`);
        return;
    }
    
    if (this.currentPlayer !== null) return;

    this.currentPlayer = playerId;

    console.log(`ACEPTADO buzz de J${playerId}`);

    this.setPhase("WAITING_ADMIN_SELECTION");

    this.io.emit("buzzed", playerId);
}


  adminSelect(answerIndex) {
    if (
        this.phase !== "WAITING_ADMIN_SELECTION" &&
        this.phase !== "WAITING_CONFIRM"
    ) return;


    this.selectedAnswer = answerIndex;
    
    this.setPhase("WAITING_CONFIRM");

    this.io.emit("answerSelected", answerIndex);
  }

  confirmAnswer() {
    if (this.phase !== "WAITING_CONFIRM") return;

    const q = this.questions[this.currentQuestionIndex];

    const correct = (this.selectedAnswer === q.correct);

    if (correct) this.scores[this.currentPlayer]++;

    this.setPhase("SHOW_RESULT");

    this.io.emit("answerResult", {
      correct,
      correctIndex: q.correct,
      scores: this.scores
    });
  }
}

module.exports = GameEngine;
