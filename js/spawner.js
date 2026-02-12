// SPAWNER D'ENNEMIS
AFRAME.registerComponent('enemy-spawner', {
    schema: {
        spawnInterval: { type: 'number', default: 2000 }
    },
    init: function () {
        this.timer = 0;
        this.isWaveActive = true;
    },
    tick: function (time, timeDelta) {
        if (!this.isWaveActive) return;

        this.timer += timeDelta;
        if (this.timer >= this.data.spawnInterval) {
            this.spawnEnemy();
            this.timer = 0;
        }
    },
    spawnEnemy: function () {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');

        // Spawn en cercle à 4 mètres
        let angle = Math.random() * Math.PI * 2;
        let x = Math.cos(angle) * 4;
        let z = Math.sin(angle) * 4;

        // Y = 0 (Niveau du sol calibré par le Quest)
        enemy.setAttribute('position', { x: x, y: 0, z: z });

        // Apparence (Gobelin Rouge)
        enemy.setAttribute('geometry', { primitive: 'sphere', radius: 0.15 });
        enemy.setAttribute('material', { color: '#FF0000' });

        // Stats
        enemy.setAttribute('enemy-stats', { hp: 3, reward: 10, damage: 2 });
        enemy.setAttribute('enemy-walker', ''); // IA de mouvement

        this.el.sceneEl.appendChild(enemy);
    }
});

// STATS ENNEMI
AFRAME.registerComponent('enemy-stats', {
    schema: { hp: {default: 3}, reward: {default: 10}, damage: {default: 2} },
    takeHit: function() {
        this.data.hp--;
        // Flash blanc
        this.el.setAttribute('material', 'color', 'white');
        setTimeout(() => {
            if(this.el) this.el.setAttribute('material', 'color', '#FF0000');
        }, 100);

        if (this.data.hp <= 0) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
        }
    }
});

// IA DEPLACEMENT (Vers le joueur 0,0,0)
AFRAME.registerComponent('enemy-walker', {
    tick: function (time, timeDelta) {
        let pos = this.el.object3D.position;
        let dx = 0 - pos.x;
        let dz = 0 - pos.z;
        let dist = Math.sqrt(dx*dx + dz*dz);

        // Si touche le joueur
        if (dist < 0.3) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.takeDamage(this.el.getAttribute('enemy-stats').damage);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
            return;
        }

        // Avance
        let speed = 0.5; // m/s
        let move = (speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});