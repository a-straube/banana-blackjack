// Load player name from setup.html
const savedName = localStorage.getItem("playerName") || "Player";
document.getElementById("player-name-display").textContent = savedName;

// =========================
// DOM ELEMENTS
// =========================
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const doubleBtn = document.getElementById("double-btn");
const newGameBtn = document.getElementById("newgame-btn");
const playBtn = document.getElementById("play-btn");

const playerHandDiv = document.getElementById("player-hand");
const dealerHandDiv = document.getElementById("dealer-hand");

const msgBox = document.getElementById("message-box");
const moneyDisplay = document.getElementById("player-money");
const betDisplay = document.getElementById("bet-amount");

const chipButtons = document.querySelectorAll(".chip");

const roundModal       = document.getElementById("round-modal");
const roundResultText  = document.getElementById("round-result-text");
const modalNewGameBtn  = document.getElementById("modal-newgame-btn");
const modalEndGameBtn  = document.getElementById("modal-endgame-btn");

const placeBetBtn = document.getElementById("place-bet-btn");
const betInput    = document.getElementById("bet-input");

var betLocked = false;


// =========================
// UTILITY FUNCTIONS
// =========================

async function revealDealerHoleCard() {
    const dealerDiv = document.getElementById("dealer-hand");
    if (!dealerDiv) return;

    // first dealer card that is face-down
    const hiddenCard = dealerDiv.querySelector(".card.flipped");
    if (!hiddenCard) return;

    // tiny pause before the flip 
    await delay(150);

    // removing .flipped triggers the CSS rotateY animation
    hiddenCard.classList.remove("flipped");

    // wait for the flip to finish so we don't instantly redraw over it
    await delay(350);
}

// Show messages with fade-in effect
function showMessage(msg, type="info") {
    msgBox.textContent = msg;
    msgBox.className = `message ${type}`;
}


function prepareForNewRound() {
    gameState.playerHand = [];
    gameState.dealerHand = [];
    resetBet();     
    turnFlag = 3;    // "round over" / idle state
    betLocked = false; // must lock a new bet next round
}

function canPlaceBetNow() {
    const state = getGameState();

    const noCards =
        state.playerHand.length === 0 &&
        state.dealerHand.length === 0;

    const roundOver = state.turnFlag === 3;
    const gameOver  = state.turnFlag === 4;

    // you can bet:
    //  - before any round (no cards)
    //  - or after a round is over / game over
    return noCards || roundOver || gameOver;
}

// Update money, bets, hands, totals, and messages
function renderGame() {
    const state = getGameState();

    moneyDisplay.textContent = "Bananas:" + state.money;
    betDisplay.textContent = state.bet;

    renderHand(playerHandDiv, state.playerHand, true);
    renderHand(dealerHandDiv, state.dealerHand, state.turnFlag !== 0);

    document.getElementById("player-total").textContent = "Total: " + state.playerTotal;
    document.getElementById("dealer-total").textContent = "Total: " + (state.turnFlag === 0 ? "?" : state.dealerTotal); 
    updateMessages(state);

    // ---------- BUTTON STATES ----------
    const playerTurn = 
    state.turnFlag === 0 && state.playerHand.length > 0 && state.dealerHand.length > 0;
    hitBtn.disabled   = !playerTurn;
    standBtn.disabled = !playerTurn;
    doubleBtn.disabled = !(
    playerTurn &&
    state.playerHand.length === 2 &&
    state.money >= state.bet);

    // define round status
    const roundOver = (state.turnFlag === 3);
    const gameOver  = (state.turnFlag === 4);
    const noCards   = (state.playerHand.length === 0 &&
                       state.dealerHand.length === 0);

    // active round = we have cards AND it's not over
    const roundActive = !noCards && !roundOver && !gameOver;

    // Play enabled only when:
    //  - there is NO active round
    //  - AND there's a bet placed
    playBtn.disabled = roundActive || state.bet <= 0 || !betLocked;
}

// Render hand with card flipping animation
function renderHand(container, cards, showAll = false) {
    container.innerHTML = "";
    cards.forEach((cardCode, index) => {
        const card = document.createElement("div");
        card.className = "card";
        // suit/rank parsing
        if (cardCode.length === 2) {
            card.setAttribute("data-suit", cardCode[1]);
            card.setAttribute("data-number", cardCode[0]);
        } else if (cardCode.length === 3) {
            card.setAttribute("data-suit", cardCode[2]);
            card.setAttribute("data-number", cardCode[0] + cardCode[1]);
        }
        // hide the FIRST dealer card while it's the player's turn
        if (!showAll && container.id === "dealer-hand" && index === 0) {
            card.classList.add("flipped");   // face-down
        }
        container.appendChild(card);
    });
}

// Update message box based on turnFlag
function updateMessages(state) {
    switch (state.turnFlag) {
        case 0: showMessage("Your turn.", "info"); break;
        case 1: showMessage("Dealer's turn...", "info"); break;
        case 3: showMessage("Round over.", "success"); break;
        case 4: showMessage("Game over!", "error"); break;
        case 5: showMessage("Bet too large!", "error"); break;
        default: showMessage(""); break;
    }
}

// Delay utility for animations
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =========================
// BETTING LOGIC
// =========================
chipButtons.forEach(chip => {
    chip.addEventListener("click", () => {

        // block betting during an active round
        if (!canPlaceBetNow()) {
            showMessage("You can't change your bet during a round.", "error");
            return;
        }

        const amount = parseInt(chip.dataset.value, 10);

        betLocked = false;

        const result = setBet(amount);

        if (result !== 1) {
            showMessage("Not enough bananas to make that bet.", "error");
            return;
        }

        renderGame();

        const state = getGameState();
        showMessage(`Current bet: ${state.bet} bananas. Click Place Bet to lock it in.`, "info");
    });
});

if (placeBetBtn) {
    placeBetBtn.addEventListener("click", () => {
        if (!canPlaceBetNow()) {
            showMessage("You can't change your bet during a round.", "error");
            return;
        }

        const state = getGameState();

        if (state.bet <= 0) {
            showMessage("Click a chip to place a bet first.", "error");
            return;
        }

        // lock the current bet
        betLocked = true;
        renderGame();

        showMessage(`Bet locked in: ${state.bet} bananas. Press Play to start!.`, "success");

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });
    });
}

// =========================
// GAME FLOW
// =========================

function flipFirstDealerCard() {
    const dealerDiv = document.getElementById('dealer-hand');
    if (!dealerDiv) return;

    const firstDealerCard = dealerDiv.querySelector('.card');
    if (firstDealerCard) {
        firstDealerCard.classList.add('flipped');
    }
}

playBtn.addEventListener("click", async () => {
    const before = getGameState();
    if (before.bet <= 0) {
        showMessage("Place a bet first.", "error");
        return;
    }

    // deal the initial cards
    startNewRound();
    renderGame();
    flipFirstDealerCard();

    // check if the round is already over 
    const after = getGameState();
    if (after.turnFlag === 3) {
        await delay(800);
        await finishRound();
    }
});

hitBtn.addEventListener("click", async () => {
    const stateBefore = getGameState();
    if (stateBefore.turnFlag !== 0) return;   // only during player's turn

    playerHit();
    renderGame();

    const stateAfter = getGameState();

    // If the hit ended the round (bust or exactly 21),
    // flip the dealer's hidden card, then finish the round.
    if (stateAfter.turnFlag === 3) {
        await revealDealerHoleCard();
        await finishRound();
    }
});

standBtn.addEventListener("click", async () => {
    const state = getGameState();
    if (state.turnFlag !== 0) return;  

    // Animate the hidden dealer card flipping over
    await revealDealerHoleCard();

    // Now actually pass control to the dealer
    playerStand();
    await dealerTurn();
    await finishRound();
});

doubleBtn.addEventListener("click", async () => {
    doubleDown();
    renderGame();

    const state = getGameState();

    if (state.turnFlag === 1) {
        // Player doubled, didn't bust → dealer still needs to play
        await dealerTurn();
        await finishRound();
    } else if (state.turnFlag === 3) {
        // Player busted (or round otherwise ended) immediately on the double card
        await finishRound();
    }
});

newGameBtn.addEventListener("click", () => {
    window.location.href = "/";
});

// =========================
// DEALER TURN LOGIC
// =========================
async function dealerTurn() {
    // Make sure dealer is in their turn
    renderGame();

    // small pause before dealer starts drawing
    await delay(600);

    // While dealer should keep hitting, do ONE hit at a time
    while (!checkDealerStand()) {
        dealerHitOnceForUI();   
        renderGame();
        await delay(400);     
    }

    // Dealer stands, end their turn
    dealerStand();              // sets turnFlag = 3
    renderGame();
}

// =========================
// ROUND FINISH & SCORE
// =========================

function showRoundModal(outcome) {
    if (!roundModal || !roundResultText) return;

    if (outcome === "win") {
        roundResultText.textContent = "YOU WIN!";
    } else if (outcome === "lose") {
        roundResultText.textContent = "YOU LOSE!";
    } else {
        roundResultText.textContent = "PUSH";
    }

    roundModal.classList.remove("hidden");
}

if (modalNewGameBtn) {
    modalNewGameBtn.addEventListener("click", () => {
        // hide the overlay
        roundModal.classList.add("hidden");

        // clear hands + bet, go back to betting state
        prepareForNewRound();
        renderGame();

        // tell the player what to do next
        showMessage("Place a new bet to start the next round.", "info");
    });
}

if (modalEndGameBtn) {
    modalEndGameBtn.addEventListener("click", () => {
        window.location.href = "/";
    });
}
async function finishRound() {
    roundFinish();
    renderGame();

    const state = getGameState();
    const moneyWon    = state.money - 2500;
    const playerTotal = state.playerTotal;
    const dealerTotal = state.dealerTotal;

    // figure out win / lose / push
    var outcome;
    if (playerTotal > 21 && dealerTotal <= 21) {
        outcome = "lose";
    } else if (dealerTotal > 21 && playerTotal <= 21) {
        outcome = "win";
    } else if (playerTotal > dealerTotal) {
        outcome = "win";
    } else if (playerTotal < dealerTotal) {
        outcome = "lose";
    } else {
        outcome = "push";
    }

    // show the overlay
    await delay(1200)
    showRoundModal(outcome);

    // get stored player name
    let playerName = localStorage.getItem("playerName");
    if (!playerName || !playerName.trim()) {
        // if somehow missing, send them back to setup
        window.location.href = "/setup.html";
        return;
    }
    playerName = playerName.trim();

    // send score to backend (still happens automatically)
    try {
        await fetch("/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: playerName,
                moneyWon: moneyWon,
                win: outcome === "win" ? 1 : 0
            })
        });
    } catch (err) {
        showMessage("Error sending score to server.", "error");
        return;
    }

    // refresh leaderboard if this page has one
    await loadLeaderboard();
}

// =========================
// LEADERBOARD
// =========================
async function loadLeaderboard() {
    // If this page has no leaderboard, quietly do nothing
    const leaderboard = document.getElementById("high-score-list");
    if (!leaderboard) return;

    try {
        const res = await fetch("/scores?sort=money");
        const data = await res.json();

        leaderboard.innerHTML = "";

        data.scores.forEach(score => {
            const li = document.createElement("li");
            li.className = "high-score-row";
            li.innerHTML = `
                <span class="high-score-player-name">${score.name}</span>
                <span class="high-score-player-score">${score.moneyWon}</span>
            `;
            leaderboard.appendChild(li);
        });
    } catch (err) {
        showMessage("Error loading leaderboard.", "error");
    }
}

// =========================
// PLAYER NAME LOGIC
// =========================

if (setNameBtn) {
    setNameBtn.addEventListener("click", () => {
        const entered = nameInput.value.trim();

        if (entered === "") {
            showMessage("Please enter your name.", "error");
            return;
        }

        // Update UI
        nameDisplay.textContent = entered;

        // Save for later (game uses this!)
        localStorage.setItem("playerName", entered);

        // Optional: hide input after name is set
        // document.getElementById("name-entry").style.display = "none";
    });
}

// Load saved name on refresh
window.addEventListener("load", () => {
    const saved = localStorage.getItem("playerName");
    if (saved) {
        nameDisplay.textContent = saved;
    }
});

// =========================
// INITIAL RENDER
// =========================
renderGame();
loadLeaderboard();