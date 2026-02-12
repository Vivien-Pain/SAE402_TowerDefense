/* js/spawner.js - Équilibrage : Moins de spawn, moins d'or */

AFRAME.registerComponent('enemy-spawner', {
    schema: {
        waveInterval: { type: 'number', default: 5000 }, // Temps de pause entre les vagues
        // MODIFICATION ICI : 3000ms (3 secondes) au lieu de 2000ms
        spawnInterval: { type: 'number', default: 3000 }
    },

    init: function () {
        this.timer = 0;
        this.waveCount = 1;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;
        this.enemiesPerWave = 5;
        console.log("⚔️ Spawner Initialisé - Vague 1");
    },

    tick: function (time, timeDelta) {
        this.timer += timeDelta;

        if (this.isWaveActive) {
            if (this.timer >= this.data.spawnInterval) {
                this.spawnRandomEnemy();
                this.timer = 0;
                this.enemiesSpawnedInWave++;

                if (this.enemiesSpawnedInWave >= this.enemiesPerWave) {
                    this.isWaveActive = false;
                    this.timer = 0;
                    console.log("Fin de la vague, pause...");
                }
            }
        } else {
            if (this.timer >= this.data.waveInterval) {
                this.startNextWave();
                this.timer = 0;
            }
        }
    },

    startNextWave: function() {
        this.waveCount++;
        this.enemiesPerWave += 2;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;

        console.log(`⚠️ VAGUE ${this.waveCount} EN APPROCHE !`);
        let hud = document.getElementById('hud-hp');
        if(hud) {
            let oldColor = hud.getAttribute('color');
            hud.setAttribute('color', 'yellow');
            setTimeout(() => hud.setAttribute('color', oldColor), 1000);
        }
    },

    spawnRandomEnemy: function () {
        let rand = Math.random();
        let type = 'goblin';

        if (this.waveCount >= 2 && rand > 0.6) type = 'orc';
        if (this.waveCount >= 3 && rand > 0.8) type = 'knight';

        this.createEnemy(type);
    },

    createEnemy: function (type) {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');

        let angle = Math.random() * Math.PI * 2;
        let dist = 4;
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;

        enemy.setAttribute('position', { x: x, y: 0, z: z });

        // --- CONFIGURATION DES MOBS ---
        if (type === 'goblin') {
            enemy.setAttribute('geometry', { primitive: 'sphere', radius: 0.15 });
            enemy.setAttribute('material', { color: '#FF4444' });
            // MODIFICATION ICI : reward passe de 10 à 5
            enemy.setAttribute('enemy-stats', { hp: 2, speed: 0.8, damage: 1, reward: 5 });
        }
        else if (type === 'orc') {
            enemy.setAttribute('geometry', { primitive: 'box', width: 0.4, height: 0.5, depth: 0.4 });
            enemy.setAttribute('material', { color: '#4CAF50' });
            enemy.setAttribute('enemy-stats', { hp: 6, speed: 0.4, damage: 3, reward: 20 });
        }
        else if (type === 'knight') {
            enemy.setAttribute('geometry', { primitive: 'cylinder', radius: 0.2, height: 0.6 });
            enemy.setAttribute('material', { color: '#2196F3' });
            enemy.setAttribute('enemy-stats', { hp: 10, speed: 0.5, damage: 5, reward: 30 });

            let shield = document.createElement('a-box');
            shield.setAttribute('color', 'gold');
            shield.setAttribute('depth', 0.05);
            shield.setAttribute('width', 0.3);
            shield.setAttribute('height', 0.4);
            shield.setAttribute('position', '0 0.2 0.25');
            enemy.appendChild(shield);
        }

        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

// STATS ENNEMI
AFRAME.registerComponent('enemy-stats', {
    schema: { hp: {default: 1}, speed: {default: 1}, damage: {default: 1}, reward: {default: 10} },
    takeHit: function() {
        this.data.hp--;

        let el = this.el;
        let oldColor = el.getAttribute('material').color;
        el.setAttribute('material', 'color', 'white');
        setTimeout(() => {
            if(el.parentNode) el.setAttribute('material', 'color', oldColor);
        }, 100);

        if (this.data.hp <= 0) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
        }
    }
});

// IA DÉPLACEMENT
AFRAME.registerComponent('enemy-walker', {
    tick: function (time, timeDelta) {
        let stats = this.el.getAttribute('enemy-stats');
        if(!stats) return;

        let pos = this.el.object3D.position;
        let dx = 0 - pos.x;
        let dz = 0 - pos.z;
        let dist = Math.sqrt(dx*dx + dz*dz);

        this.el.object3D.rotation.y = Math.atan2(dx, dz);

        if (dist < 0.3) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.takeDamage(stats.damage);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
            return;
        }

        let move = (stats.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});