AFRAME.registerSystem('game-manager', {
    init: function () {
        this.money = 40;
        this.lives = 20;
        this.isGameOver = false;
        console.log("Game Manager Initialized");
    },

    tryBuyTower: function (cost) {
        if (this.money >= cost) {
            this.money -= cost;
            return true;
        }
        return false;
    },

    takeDamage: function (amount) {
        this.lives -= amount;
        if (this.lives <= 0) {
            console.log("GAME OVER");
            this.isGameOver = true;
        }
    },

    addMoney: function(amount) {
        this.money += amount;
    }
});