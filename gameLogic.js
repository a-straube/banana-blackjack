// Tracks the full state of the game: deck, hands, and player's money/bet.
var gameState = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    money: 2500,
    bet: 0
};

// Turn flag: 0 = player turn, 1 = dealer turn, 2 = error (unused),
// 3 = round over, 4 = game over (no money / max rounds), 5 = bet too big.
var turnFlag = 0

// Counts how many rounds have fully finished (used by outer controller / session logic).
var roundCount = 0   // how many rounds have fully finished

// Sets the player's bet for this round and subtracts it from their money.
function setBet(amount){

    if(gameState.money < amount){
        // Player tried to bet more than they have.
        turnFlag = 5
    } else {
        gameState.money -= amount
        gameState.bet += amount
        return 1
    }
}

// Resets the current bet back to zero after a round is resolved.
function resetBet(){
    gameState.bet = 0
}

// Checks if the game should end (no money or max rounds reached).
function checkGameOver(){

    // Player out of money.
    if(gameState.money <= 0){
        turnFlag = 4
        return 1
    }
    // Too many rounds have been played.
    if (roundCount >= 5){
        turnFlag = 4   // reuse 4 to mean "game over"
        return 1
    }

    return 0 
}

// Creates a fresh 52-card deck with rank, suit, value, and card code.
function createDeck(){ 

    var suits = ['H', 'C', 'D', 'S']; 
    var ranks = [
        { rank: "A", value: 1},
        { rank: "2", value: 2},
        { rank: "3", value: 3},
        { rank: "4", value: 4},
        { rank: "5", value: 5},
        { rank: "6", value: 6},
        { rank: "7", value: 7},
        { rank: "8", value: 8},
        { rank: "9", value: 9},
        { rank: "10", value: 10},
        { rank: "J", value: 10},
        { rank: "Q", value: 10},
        { rank: "K", value: 10}
    ]
    var deck = [];

    for(var i = 0; i < suits.length; i++){
        for(var j = 0; j < ranks.length; j++){
            deck.push({
                suit: suits[i],
                rank: ranks[j].rank,
                value: ranks[j].value,
                card: ranks[j].rank + suits[i]
            })
        }
    }
    return deck
}

// Shuffles the given deck in-place using random swaps.
function shuffleDeck(deck){
    for(var i = 0; i < deck.length; i++){
        var tempCard = deck[i]
        var randomIndex = Math.floor(Math.random() * deck.length)
        deck[i] = deck[randomIndex]
        deck[randomIndex] = tempCard
    }
}

// Calculates the best total for a hand by treating Aces as 11 or 1.
function adjustAce(hand) {
    // Step 1: calculate total assuming all Aces are 11
    let total = 0;
    let aceCount = 0;

    for (let i = 0; i < hand.length; i++) {
        if (hand[i].rank === "A") {
            total += 11;
            aceCount++;
        } else {
            total += hand[i].value;
        }
    }

    // Step 2: If busted, convert some Aces from 11 -> 1
    while (total > 21 && aceCount > 0) {
        total -= 10;
        aceCount--;
    }

    return total;
}

// Checks for blackjack right after the initial deal (21 totals).
function checkBlackJack(totalPlayer, totalDealer){
    // 1 = player BJ, 2 = dealer BJ, 3 = both, 0 = none
    var blackJackFlag = 0

    if (totalPlayer == 21 && totalDealer == 21) {
        blackJackFlag = 3
    } else if (totalPlayer == 21) {
        blackJackFlag = 1
    } else if (totalDealer == 21) {
        blackJackFlag = 2
    }

    return blackJackFlag
}

// Returns the total value of a hand, with Ace logic applied.
function getHandTotal(hand){
    return adjustAce(hand)
}

// Deals the initial two cards to both player and dealer and sets turnFlag.
function dealInitialCard(){

    gameState.deck = createDeck()
    shuffleDeck(gameState.deck)

    // Reset hands
    gameState.playerHand = []
    gameState.dealerHand = []

    // Deal 2 cards to the player 
    for (var i = 0; i < 2; i++) {
        var randomIndexP = Math.floor(Math.random() * gameState.deck.length)
        var cardP = gameState.deck[randomIndexP]
        gameState.playerHand.push(cardP)
        gameState.deck.splice(randomIndexP, 1)
    }

    // Deal 2 cards to the dealer
    for (var j = 0; j < 2; j++) {
        var randomIndexD = Math.floor(Math.random() * gameState.deck.length)
        var cardD = gameState.deck[randomIndexD]
        gameState.dealerHand.push(cardD)
        gameState.deck.splice(randomIndexD, 1)
    }

    var totalPlayer = getHandTotal(gameState.playerHand)
    var totalDealer = getHandTotal(gameState.dealerHand)

    console.log("The dealers total is: " + totalDealer)
    console.log("The players total is: " + totalPlayer)

    // Only care about dealer blackjack if the PLAYER has blackjack
    var bjFlag = 0

    if (totalPlayer == 21) {
        // Now check if dealer also has blackjack
        bjFlag = checkBlackJack(totalPlayer, totalDealer)

        if (bjFlag == 3) {
            turnFlag = 3   // round over (both blackjack)
        } else if (bjFlag == 1) {
            turnFlag = 3   // round over, player wins with blackjack
        }
    } else {
        // No player blackjack, normal game → player starts
        turnFlag = 0
    }
}

// Checks if a total is a bust (over 21).
function checkBust(total){
    // 0 = no bust | 1 = bust
    if (total > 21) {
        return 1
    } else {
        return 0
    }
}

// Gives the player one new card and updates their total and turnFlag.
function playerHit(){
    var randomIndex = Math.floor(Math.random() * gameState.deck.length)
    var card = gameState.deck[randomIndex]
    gameState.playerHand.push({
        suit: card.suit,
        rank: card.rank, 
        value: card.value, 
        card: card.card
    })
    gameState.deck.splice(randomIndex, 1)

    console.log("Your new hand:", gameState.playerHand.map(c => c.card));
    
    var total = getHandTotal(gameState.playerHand)
    console.log("Your new total is: " + total)

    // If player hits 21 or higher, round will be finished.
    if(total >= 21){
        turnFlag = 3
    }
}

// Ends the player's turn and passes control to the dealer.
function playerStand(){
    console.log("the player chose to stand")
    turnFlag = 1
}

// Marks the dealer as finished and ends the round.
function dealerStand(){
    turnFlag = 3
}

// Decides if the dealer should hit again or stand based on their total.
function dealerLogic(){

    if(turnFlag == 3){
        return
    }

    if(checkDealerStand() > 0){
        dealerStand()
    } else {
        dealerHit()
    }
}

function dealerHitOnceForUI() {
    if (turnFlag == 3) {
        return;
    }

    console.log("Dealer decided to HIT (UI)");

    var randomIndex = Math.floor(Math.random() * gameState.deck.length);
    var card = gameState.deck[randomIndex];
    gameState.dealerHand.push(card);
    gameState.deck.splice(randomIndex, 1);

    console.log("Dealer's cards are now: " + gameState.dealerHand.map(c => c.card));
    console.log("Dealer total is now: " + getHandTotal(gameState.dealerHand));
}
// Gives the dealer one new card and then re-runs dealerLogic().
function dealerHit(){
    if(turnFlag == 3){
        return
    }
    console.log("Dealer decided to HIT")

    var randomIndex = Math.floor(Math.random() * gameState.deck.length);
    var card = gameState.deck[randomIndex];
    gameState.dealerHand.push(card);

    gameState.deck.splice(randomIndex, 1);

    console.log("Dealer's card now are:  " + gameState.dealerHand.map(c => c.card))
    var total = getHandTotal(gameState.dealerHand)
    console.log("Dealer's total is now: " + total)

    dealerLogic()
}

// Returns 1 if dealer should stand (17 or more), otherwise 0.
function checkDealerStand() {
    var total = getHandTotal(gameState.dealerHand);

    if (total >= 17) {
        return 1   // dealer should stand
    }
    return 0       // dealer should hit again
}

// Compares player and dealer totals and returns who has the higher score.
function compareTotals(){
    var player = getHandTotal(gameState.playerHand)
    var dealer = getHandTotal(gameState.dealerHand)

    // 1 = Player has more || 2 = Dealer has more || 0 = Both are tied
    var winner = 0

    if (player > dealer){
        winner = 1
        return winner
    } else if(dealer > player){
        winner = 2
        return winner
    } else if(dealer == player){
        winner = 0
        return winner
    }
}

// Handles the end of a round: busts, natural blackjack, or comparing totals.
function roundFinish(){
    // This function will only be called when the turn flag is 3 and both turns are over
    var playerTotal = getHandTotal(gameState.playerHand)
    var dealerTotal = getHandTotal(gameState.dealerHand)

    // First check who has a bust
    var hasPlayerBust = checkBust(playerTotal)   // 0 = no bust, 1 = bust
    var hasDealerBust = checkBust(dealerTotal)

    if (hasPlayerBust == 1) {
        console.log("Player has a bust! Dealer wins.")
        resolveBet(2)
        return 
    } else if (hasDealerBust == 1) {
        console.log("Dealer has a bust! Player wins.")
        resolveBet(1)
        return 
    }

    // If no busts, check for natural BlackJack (21 with exactly 2 cards)
    var playerNaturalBJ = (gameState.playerHand.length === 2 && playerTotal === 21)
    var dealerNaturalBJ = (gameState.dealerHand.length === 2 && dealerTotal === 21)

    if (playerNaturalBJ || dealerNaturalBJ) {

    if (playerNaturalBJ && dealerNaturalBJ) {
        console.log("Both hit natural BlackJack!! - TIE")
        resolveBet(0)
        return 0   // PUSH
    } 
    else if (playerNaturalBJ) {
        console.log("Player has natural BlackJack!!")
        resolveBet(1)
        return 1   // PLAYER WINS
    } 
    else {
        console.log("Dealer has natural BlackJack!!")
        resolveBet(2)
        return 2   // DEALER WINS
    }
}

    // If no busts and no natural BJ, compare totals to decide winner or tie.
    var totalDecider = compareTotals()

        if(totalDecider == 1){
        console.log("Player has WON!")
        resolveBet(1)
        return 1
        } 
        else if(totalDecider == 2){
        console.log("Dealer has WON!")
        resolveBet(2)
        return 2
    } else {
    console.log("Both are TIED -- PUSH")
    resolveBet(0)
    return 0
    }
}

// Updates the player's money based on round outcome and clears the bet.
function resolveBet(outcome) {
    let result;  // "win", "lose", or "push"

    if (outcome == 1) {
        // Player has WON: get back bet + winnings
        gameState.money += gameState.bet * 2;
        result = "win";
    } else if (outcome == 2) {
        // Dealer has WON: player already paid the bet when it was placed
        result = "lose";
    } else {
        // Tie / push: return the original bet to the player
        gameState.money += gameState.bet;
        result = "push";
    }

    // Save round history for scoreboard
    saveRoundHistory(result);

    resetBet();
}

// Returns a snapshot of the current game state for the UI / other code.
function getGameState(){
    return {
        playerHand: gameState.playerHand.map(c => c.card),
        dealerHand: gameState.dealerHand.map(c => c.card),
        playerTotal: getHandTotal(gameState.playerHand),
        dealerTotal: getHandTotal(gameState.dealerHand),
        money: gameState.money,
        bet: gameState.bet,
        turnFlag: turnFlag
    }
}

// Prepares the state for a new round and deals starting cards.
function startNewRound(){
    gameState.playerHand = []
    gameState.dealerHand = []

    turnFlag = 0

    dealInitialCard()
}

function doubleDown() {
    // Only allowed on player's turn AND only if they have exactly 2 cards
    if (turnFlag != 0) {
        console.log("Can't double down (not player's turn).");
        return;
    }

    if (gameState.playerHand.length !== 2) {
        console.log("Can only double on first move.");
        return;
    }

    if (gameState.money < gameState.bet) {
        console.log("Player doesn't have enough money to double.");
        return;
    }

    // Double the bet
    gameState.money -= gameState.bet;
    gameState.bet *= 2;

    console.log("DOUBLE DOWN! New bet is: " + gameState.bet);

    // One card only
    playerHit();

    // If player didn’t bust automatically -> force stand
    if (turnFlag == 0) {
        playerStand();
    }
}

// Runs a single round: deals, plays out player and dealer turns, then finishes.
function gamePlay(){

    //Checks if the player has run out of money or if the max rounds reached
    if (checkGameOver()) {
        console.log("Game over: either out of money or max rounds reached.")
        return
    }
    //This function is used to bet 
    setBet(2500)

    // Player's turn
    if(turnFlag == 0){

        dealInitialCard()

        console.log("Your hand:", gameState.playerHand.map(c => c.card))
        console.log("Dealer shows:", gameState.dealerHand[0].card)
        playerHit()

        if(turnFlag == 0){
            playerStand()
        }
    }

    // Dealer's Turn
    if(turnFlag == 1){
        console.log("Dealer shows 2nd card:", gameState.dealerHand[1].card);
        dealerLogic()
    }

    // Round Results
    if(turnFlag == 3){
        roundFinish()

        console.log("========================================")
        console.log("The players money pot is now: " + gameState.money)
        resetBet()
        return
    }
    if(turnFlag == 5){
        console.log("Player can't bet this amount of money")
    }
    if(turnFlag == 4 ){
        console.log("Player has no more money to bet")
    }
}

//Uncomment this to see how 1 round will go
// gamePlay()

function saveRoundHistory(result){
    const history = JSON.parse(localStorage.getItem("blackjackHistory")) || [];
    history.push({
        money: gameState.money,
        bet: gameState.bet,
        result: result
    });
    localStorage.setItem("blackjackHistory", JSON.stringify(history));
}