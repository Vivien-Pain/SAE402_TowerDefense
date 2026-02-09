/* js/main.js */
AFRAME.registerSystem('game-manager', {
    init: function () {
        this.money = 100;
        this.lives = 10;
        this.isGameOver = false;

        // Écouteur pour mettre à jour l'interface (si on en a une)
        console.log("Game Manager Initialisé. Argent:", this.money);
    },

    // Fonction appelée quand on veut acheter une tour
    tryBuyTower: function (cost) {
        if (this.money >= cost) {
            this.money -= cost;
            console.log("Tour achetée ! Reste : " + this.money);
            return true;
        } else {
            console.log("Pas assez d'argent !");
            return false;
        }
    },

    // Fonction appelée quand un ennemi atteint la base
    takeDamage: function (amount) {
        this.lives -= amount;
        console.log("Dégâts reçus ! Vies restantes : " + this.lives);
        if (this.lives <= 0) {
            this.gameOver();
        }
    },

    gameOver: function () {
        this.isGameOver = true;
        console.log("GAME OVER");
        // Ici on pourra afficher un texte "Perdu"
    }
});