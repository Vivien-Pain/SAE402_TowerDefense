/* js/spawner.js - Version Complète et Corrigée */

AFRAME.registerComponent('enemy-spawner', {
    schema: {
        interval: { type: 'number', default: 1500 } // Intervalle de base
    },

    init: function () {
        this.timer = 0;
        this.waveCount = 0;
    },

    tick: function (time, timeDelta) {
        this.timer += timeDelta;

        // Accélération progressive des vagues
        let dynamicInterval = Math.max(600, this.data.interval - (this.waveCount * 20));

        if (this.timer >= dynamicInterval) {
            this.spawnRandomEnemy();
            this.timer = 0;
            this.waveCount++;
        }
    },

    spawnRandomEnemy: function () {
        let rand = Math.random();
        let type = 'goblin';

        if (rand > 0.85) type = 'orc';       // 15% Chance Orc
        else if (rand > 0.65) type = 'knight'; // 20% Chance Knight

        this.createEnemy(type);
    },

    createEnemy: function (type) {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy'); // CRUCIAL pour que les tours visent

        // Position aléatoire (cercle de 5m)
        let angle = Math.random() * Math.PI * 2;
        let dist = 5;
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;
        enemy.setAttribute('position', { x: x, y: 0.5, z: z });

        // CONFIGURATION DES TYPES
        if (type === 'goblin') {
            // Faible mais Rapide
            enemy.setAttribute('geometry', { primitive: 'sphere', radius: 0.12 });
            enemy.setAttribute('material', { color: '#FF4444' });
            enemy.setAttribute('enemy-stats', { hp: 1, speed: 1.2, damage: 1 });
        }
        else if (type === 'orc') {
            // Résistant (Tank) mais Lent
            enemy.setAttribute('geometry', { primitive: 'box', width: 0.35, height: 0.5, depth: 0.35 });
            enemy.setAttribute('material', { color: '#4CAF50' });
            enemy.setAttribute('enemy-stats', { hp: 5, speed: 0.4, damage: 5 });
        }
        else if (type === 'knight') {
            // Équilibré + Bouclier
            enemy.setAttribute('geometry', { primitive: 'cylinder', radius: 0.15, height: 0.45 });
            enemy.setAttribute('material', { color: '#2196F3' });
            enemy.setAttribute('enemy-stats', { hp: 3, speed: 0.7, damage: 2 });

            // Ajout visuel du bouclier
            let shield = document.createElement('a-entity');
            shield.setAttribute('geometry', { primitive: 'box', width: 0.2, height: 0.25, depth: 0.05 });
            shield.setAttribute('material', { color: '#FFD700' });
            shield.setAttribute('position', { x: 0, y: 0, z: -0.2 });
            enemy.appendChild(shield);
        }

        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

// GESTION DES PV ET DEGATS
AFRAME.registerComponent('enemy-stats', {
    schema: {
        hp: { type: 'number', default: 1 },
        speed: { type: 'number', default: 1 },
        damage: { type: 'number', default: 1 }
    },

    takeHit: function() {
        this.data.hp--;

        // Feedback visuel (Clignotement blanc)
        let el = this.el;
        let oldColor = el.getAttribute('material').color;
        el.setAttribute('material', 'color', '#FFFFFF');
        setTimeout(() => {
            el.setAttribute('material', 'color', oldColor);
        }, 100);

        if (this.data.hp <= 0) {
            this.die();
        }
    },

    die: function() {
        // Gain d'argent possible ici (ex: +5 gold)
        // this.el.sceneEl.systems['game-manager'].addMoney(5);
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
});

// DEPLACEMENT
AFRAME.registerComponent('enemy-walker', {
    tick: function (time, timeDelta) {
        let stats = this.el.getAttribute('enemy-stats');
        if (!stats) return;

        let currentPos = this.el.object3D.position;
        let dx = 0 - currentPos.x;
        let dz = 0 - currentPos.z;
        let distance = Math.sqrt(dx*dx + dz*dz);

        // Atteint la base
        if (distance < 0.5) {
            let gameSystem = this.el.sceneEl.systems['game-manager'];
            if (gameSystem) gameSystem.takeDamage(stats.damage);
            if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
            return;
        }

        // Avance
        let move = (stats.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / distance) * move;
        this.el.object3D.position.z += (dz / distance) * move;
    }
});