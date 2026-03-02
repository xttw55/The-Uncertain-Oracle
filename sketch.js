let answers = [];
let cards = [];
let chosen = false;
let chosenText = "";

let cardBackImg;
let gestureLog = [];
let sessionStartMs = 0;

let started = false;
let lockedQuestion = "";

let fistHold = 0;
let cooldown = 0;

const NUM_CARDS = 68;

//BGM
let bgm;
let bgmStarted = false;


function preload() {
  loadJSON(
    "tarot.json",
    (data) => {
      answers = data.answers || [];
      console.log(" loaded answers:", answers.length);
    },
    (err) => {
      console.error(" failed to load tarot.json", err);
      answers = [];
    }
  );

  // card back image
  cardBackImg = loadImage("assets/card-back.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("monospace");

  resetCards();

  // BGM init
  bgm = new Audio("assets/bgm.mp3");
  bgm.loop = true;
  bgm.volume = 0.3;


  // start MediaPipe
  HandTracker.start();

  // confirm button
  const btn = document.getElementById("confirm");
  const input = document.getElementById("question");

  btn.onclick = () => {
    lockedQuestion = (input.value || "").trim();
    if (!lockedQuestion) lockedQuestion = "(no question)";
    started = true;
    gestureLog = [];
    sessionStartMs = millis();

    // start BGM on user click
    if (bgm && !bgmStarted) {
      bgm.play()
        .then(() => console.log("BGM playing "))
        .catch((err) => console.error("BGM play failed ", err));
      bgmStarted = true;
    }


    input.disabled = true;
    btn.disabled = true;
    btn.innerText = "Started";
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetCards();
}

function resetCards() {
  chosen = false;
  chosenText = "";
  fistHold = 0;
  cooldown = 0;
  gestureLog = [];
  sessionStartMs = millis();

  cards = [];
  for (let i = 0; i < NUM_CARDS; i++) {
    cards.push({
      x: random(width * 0.1, width * 0.9),
      y: random(height * 0.15, height * 0.9),
      a: random(-0.25, 0.25),
      vx: 0,
      vy: 0
    });
  }
}

function draw() {
  background(255);

  const hand = HandTracker.getHand();

  // show question UI text state
  drawTopText();

  // if not started yet, still show the cards and the hand panel

  updateCards(hand);

  // gesture trail 
  if (hand && hand.landmarks) {
    logGesture(hand.landmarks);
  }
  drawGestureTrail();

  drawCards();

  // selection 
  if (started && !chosen) {
    tryChoose(hand);
  }

  // answer overlay
  if (chosen) {
    drawAnswerOverlay();
  }

  // UI panel
  drawHandUI(hand);

  // cooldown
  if (cooldown > 0) cooldown--;
}

function drawTopText() {
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);

  if (!started) {
    text("Type your question → Click Confirm to start.", 18, 18);
  } else {
    text("Swipe to shuffle · Fist (hold) to select · Press R to reset", 18, 18);
  }

  if (lockedQuestion) {
    textSize(12);
    fill(0, 140);
    text("Question: " + lockedQuestion, 18, 40);
  }
}

function updateCards(hand) {
  // simple “swipe” shuffle driven by palm x velocity 
  if (hand && hand.landmarks) {
    const lm = hand.landmarks;
    const vx = getPalmVX(lm);

    // if swiping add impulse
    if (abs(vx) > 0.004) {
      for (const c of cards) {
        c.vx += random(-1, 1) * vx * 420;
        c.vy += random(-1, 1) * vx * 320;
      }
    }
  }


  for (const c of cards) {
    c.x += c.vx;
    c.y += c.vy;

    // friction
    c.vx *= 0.88;
    c.vy *= 0.88;

    // bounds bounce
    const padX = 40;
    const padY = 60;
    if (c.x < padX) { c.x = padX; c.vx *= -0.6; }
    if (c.x > width - padX) { c.x = width - padX; c.vx *= -0.6; }
    if (c.y < padY) { c.y = padY; c.vy *= -0.6; }
    if (c.y > height - padY) { c.y = height - padY; c.vy *= -0.6; }
  }
}

function drawCards() {
  const w = min(210, width * 0.24);
  const h = w * 1.4;

  imageMode(CENTER);

  for (const c of cards) {
    push();
    translate(c.x, c.y);
    rotate(c.a);
    if (cardBackImg) {
      image(cardBackImg, 0, 0, w, h);
    } else {
      // fallback if image missing
      stroke(0);
      fill(245);
      rect(0, 0, w, h, 18);
      noStroke();
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("ANSWER", 0, h * 0.32);
    }
    pop();
  }
}

function tryChoose(hand) {
  if (!hand || !hand.landmarks) {
    fistHold = max(0, fistHold - 1);
    return;
  }

  const lm = hand.landmarks;
  const isFist = detectFist(lm);

  if (cooldown === 0 && isFist) fistHold++;
  else fistHold = max(0, fistHold - 1);

  
  if (fistHold > 18) {
    chosen = true;
    chosenText = pickAnswer();
    fistHold = 0;
    cooldown = 30;
  }
}

function pickAnswer() {
  if (!answers || answers.length === 0) return "No answers loaded.";
  const idx = floor(random(answers.length));
  return answers[idx];
}

function drawAnswerOverlay() {
  // translucent overlay
  fill(0, 140);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, height / 2, width, height);

  const cardW = min(560, width * 0.76);
  const cardH = min(320, height * 0.52);

  fill(255);
  stroke(0);
  strokeWeight(2);
  rect(width / 2, height / 2, cardW, cardH, 18);

  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);

  textSize(16);
  text("YOUR QUESTION", width / 2, height / 2 - cardH * 0.30);

  textSize(13);
  fill(0, 160);
  text(lockedQuestion, width / 2, height / 2 - cardH * 0.20);

  fill(0);
  textSize(22);
  text("ANSWER", width / 2, height / 2 - 10);

  textSize(18);
  text(chosenText, width / 2, height / 2 + cardH * 0.18);
}

function keyPressed() {
  if (key === "r" || key === "R") {

    resetCards();
    chosen = false;
    chosenText = "";

    // reset question state
    started = false;
    lockedQuestion = "";

    // re-enable UI
    const input = document.getElementById("question");
    const btn = document.getElementById("confirm");
    if (input) {
      input.value = "";
      input.disabled = false;
    }
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Confirm";
    }

    // reset palm
    lastPalmX = null;
  }
}

// HAND Gesture as Data 

function logGesture(lm) {
  const t = (millis() - sessionStartMs) / 1000;
  gestureLog.push({ t, x: lm[0].x, y: lm[0].y });
  if (gestureLog.length > 420) gestureLog.shift();
}

function drawGestureTrail() {
  if (!gestureLog.length) return;

  noFill();
  stroke(0, 18);
  strokeWeight(2);
  beginShape();
  for (const p of gestureLog) {
    const px = (1 - p.x) * width;
    const py = p.y * height;
    vertex(px, py);
  }
  endShape();
}

// palm
let lastPalmX = null;
function getPalmVX(lm) {
  const x = lm[0].x; 
  if (lastPalmX === null) lastPalmX = x;
  const vx = x - lastPalmX;
  lastPalmX = x;
  return vx;
}

// fist detection: average tip distance to palm center small => fist
function detectFist(lm) {
  const palm = { x: (lm[0].x + lm[9].x) / 2, y: (lm[0].y + lm[9].y) / 2 };
  const tips = [lm[8], lm[12], lm[16], lm[20]];

  let s = 0;
  for (const t of tips) s += Math.hypot(t.x - palm.x, t.y - palm.y);
  const open = s / tips.length;

  return open < 0.11;
}

// UI
function drawHandUI(hand) {
  const boxW = 210;
  const boxH = 160;
  const x = width - boxW - 18;
  const y = height - boxH - 18;

  // black panel
  noStroke();
  fill(0);
  rectMode(CORNER);
  rect(x, y, boxW, boxH, 12);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  text("Hand debug", x + 10, y + 8);

  if (!hand || !hand.landmarks) {
    fill(255, 140);
    text("No hand detected", x + 10, y + 28);
    return;
  }

  const lm = hand.landmarks;

  fill(255, 200);
  text("Swipe → shuffle", x + 10, y + 28);
  text("Fist (hold) → select", x + 10, y + 44);
  text("Press R → reset", x + 10, y + 60);


  const pad = 10;
  const ox = x + pad;
  const oy = y + 78;
  const w = boxW - pad * 2;
  const h = boxH - 88;

  // draw points
  noStroke();
  fill(255);
  for (let i = 0; i < lm.length; i++) {
    const px = ox + (1 - lm[i].x) * w;
    const py = oy + lm[i].y * h;
    circle(px, py, 3);
  }
}

// BGM
// If user never clicks Confirm but clicks on canvas, start BGM anyway.
function mousePressed() {
  if (bgm && !bgmStarted) {
    bgm.play()
      .then(() => console.log("BGM playing "))
      .catch((err) => console.error("BGM play failed ", err));
    bgmStarted = true;
  }
}