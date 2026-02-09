AFRAME.registerComponent('enemy-spawner', {
    schema: {
        waveInterval: { type: 'number', default: 5000 },
        spawnInterval: { type: 'number', default: 1500 }
    },

    init: function () {
        this.timer = 0;
        this.waveCount = 1;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;
        this.enemiesPerWave = 5;
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
        this.enemiesPerWave += 3;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;
        console.log("Wave " + this.waveCount + " started!");
    },

    spawnRandomEnemy: function () {
        let rand = Math.random();
        let type = 'goblin';

        if (this.waveCount > 2 && rand > 0.7) type = 'orc';
        if (this.waveCount > 3 && rand > 0.5) type = 'knight';

        this.createEnemy(type);
    },

    createEnemy: function (type) {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');

        let angle = Math.random() * Math.PI * 2;
        let dist = 5;
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;
        enemy.setAttribute('position', { x: x, y: 0.5, z: z });

        if (type === 'goblin') {
            enemy.setAttribute('geometry', { primitive: 'sphere', radius: 0.12 });
            enemy.setAttribute('material', { color: '#FF4444' });
            enemy.setAttribute('enemy-stats', { hp: 1, speed: 1.0, damage: 1, reward: 5 });
        }
        else if (type === 'orc') {
            enemy.setAttribute('geometry', { primitive: 'box', width: 0.35, height: 0.5, depth: 0.35 });
            enemy.setAttribute('material', { color: '#4CAF50' });
            enemy.setAttribute('enemy-stats', { hp: 6, speed: 0.4, damage: 5, reward: 15 });
        }
        else if (type === 'knight') {
            enemy.setAttribute('geometry', { primitive: 'cylinder', radius: 0.15, height: 0.45 });
            enemy.setAttribute('material', { color: '#2196F3' });
            enemy.setAttribute('enemy-stats', { hp: 3, speed: 0.6, damage: 2, reward: 10 });

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

AFRAME.registerComponent('enemy-stats', {
    schema: {
        hp: { type: 'number', default: 1 },
        speed: { type: 'number', default: 1 },
        damage: { type: 'number', default: 1 },
        reward: { type: 'number', default: 5 }
    },

    takeHit: function() {
        this.data.hp--;
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
        let gameSystem = this.el.sceneEl.systems['game-manager'];
        if(gameSystem) gameSystem.addMoney(this.data.reward);
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
});

AFRAME.registerComponent('enemy-walker', {
    tick: function (time, timeDelta) {
        let stats = this.el.getAttribute('enemy-stats');
        if (!stats) return;

        let currentPos = this.el.object3D.position;
        let dx = 0 - currentPos.x;
        let dz = 0 - currentPos.z;
        let distance = Math.sqrt(dx*dx + dz*dz);

        if (distance < 0.5) {
            let gameSystem = this.el.sceneEl.systems['game-manager'];
            if (gameSystem) gameSystem.takeDamage(stats.damage);
            if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
            return;
        }

        let move = (stats.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / distance) * move;
        this.el.object3D.position.z += (dz / distance) * move;
    }
});