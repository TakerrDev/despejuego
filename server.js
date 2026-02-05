console.log("arrancando...");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const GameEngine = require("./gameEngine");

const app = express();
const server = http.createServer(app);

const io = new Server(server);   // ✅ primero io

const game = new GameEngine(io); // ✅ luego engine

app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.on("buzz", (playerId) => {

  const tag = playerId === 1 ? "🔴 J1" : "🔵 J2";

  console.log(`BUZZ → ${tag}`);

  game.buzz(playerId);
});

});

server.listen(3000, "0.0.0.0", () => {
  console.log("🚀 SERVER OK 3000");
});

// -------- ADMIN TECLADO --------

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (key) => {

  if (key === "\u0003") process.exit(); // ctrl+c

  key = key.toString().trim().toLowerCase();

  if (key === "") game.confirmAnswer();   // ENTER
  if (key === "n") game.nextQuestion();

  // comodines J1
  if (key === "q") game.useFifty(1);
  if (key === "w") game.usePublic(1);
  if (key === "e") game.useSteal(1);

  // comodines J2
  if (key === "u") game.useFifty(2);
  if (key === "i") game.usePublic(2);
  if (key === "o") game.useSteal(2);

    // RESTORE J1
    if (key === "a") game.addLifeline(1, "fifty");
    if (key === "s") game.addLifeline(1, "public");
    if (key === "d") game.addLifeline(1, "steal");

    // RESTORE J2
    if (key === "j") game.addLifeline(2, "fifty");
    if (key === "k") game.addLifeline(2, "public");
    if (key === "l") game.addLifeline(2, "steal");


  if (["1","2","3","4"].includes(key))
    game.adminSelect(parseInt(key)-1);
});

