AFRAME.registerSystem('game-manager', {
    init: function () {
        this.money = 150;
        this.lives = 20;
        this.isGameOver = false;

        this.gameState = 'placing_base';
        this.basePosition = new THREE.Vector3(0, 0, 0);
        this.selectedTowerType = 'basic_turret';

        this.hpText = document.getElementById('hud-hp');
        this.goldText = document.getElementById('hud-gold');
        this.gameOverPanel = document.getElementById('game-over');
        this.updateUI();
    },

    setBasePosition: function(pos) {
        this.basePosition.copy(pos);
        this.gameState = 'playing';
    },

    updateUI: function() {
        // Ajout de l'écart (espaces) entre le texte et la valeur
        if(this.hpText) this.hpText.setAttribute('value', "HP :  " + this.lives);
        if(this.goldText) this.goldText.setAttribute('value', "GOLD :  " + this.money);
    },
    tryBuyTower: function (cost) {
        if (this.isGameOver || this.gameState !== 'playing') return false;

        if (this.money >= cost) {
            this.money -= cost;
            this.updateUI();
            return true;
        }
        return false;
    },
    addMoney: function(amount) {
        if (this.isGameOver) return;
        this.money += amount;
        this.updateUI();
    },
    takeDamage: function (amount) {
        if (this.isGameOver) return;
        this.lives -= amount;
        this.updateUI();

        let hud = document.querySelector('#hud-group');
        if(hud) {
            hud.setAttribute('position', '0 0.22 -0.6');
            setTimeout(() => hud.setAttribute('position', '0 0.2 -0.6'), 100);
        }
        if (this.lives <= 0) this.triggerGameOver();
    },
    triggerGameOver: function() {
        this.isGameOver = true;
        if (this.gameOverPanel) this.gameOverPanel.style.display = 'flex';
    }
});