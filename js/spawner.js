AFRAME.registerComponent('plane-manager', {
    init: function () {
        this.el.sceneEl.addEventListener('child-attached', (evt) => {
            let el = evt.detail.el;
            setTimeout(() => {
                if (el.components && el.components['xr-plane']) {
                    let orientation = el.components['xr-plane'].data.orientation;
                    if (orientation === 'horizontal') {
                        el.classList.add('climbable');
                        el.setAttribute('material', {
                            color: '#00FF00',
                            opacity: 0.3,
                            transparent: true,
                            wireframe: true,
                            side: 'double'
                        });
                        el.object3D.visible = true;
                    }
                }
            }, 500);
        });
    }
});

// 2. SPAWNER
AFRAME.registerComponent('enemy-spawner', {
    schema: {
        waveInterval: { type: 'number', default: 5000 },
        spawnInterval: { type: 'number', default: 3000 }
    },

    init: function () {
        if (!this.el.sceneEl.hasAttribute('plane-manager')) {
            this.el.sceneEl.setAttribute('plane-manager', '');
        }
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
        this.enemiesPerWave += 2;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;

        let hud = document.getElementById('hud-hp');
        if(hud) {
            let oldColor = hud.getAttribute('color');
            hud.setAttribute('color', 'yellow');
            setTimeout(() => hud.setAttribute('color', oldColor), 1000);
        }
    },

    spawnRandomEnemy: function () {
        let rand = Math.random();
        let type = 'demon';
        if (this.waveCount >= 2 && rand > 0.5) type = 'skeleton';
        if (this.waveCount >= 3 && rand > 0.75) type = 'orc';
        if (this.waveCount >= 4 && rand > 0.9) type = 'dragon';
        this.createEnemy(type);
    },

    createEnemy: function (type) {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');

        let angle = Math.random() * Math.PI * 2;
        let dist = 4; // Spawn à 4m
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;

        enemy.setAttribute('position', { x: x, y: 0.5, z: z });

        if (type === 'demon') {
            enemy.setAttribute('scale', '0.15 0.15 0.15');
            enemy.setAttribute('gltf-model', '#model-demon');
            enemy.setAttribute('enemy-stats', { hp: 2, speed: 0.8, damage: 1, reward: 5, offsetY: 0, isFlying: false });
        }
        else if (type === 'skeleton') {
            enemy.setAttribute('scale', '0.2 0.2 0.2');
            enemy.setAttribute('gltf-model', '#model-skeleton');
            // HP réduits de 10 à 6
            enemy.setAttribute('enemy-stats', { hp: 6, speed: 0.5, damage: 5, reward: 30, offsetY: 0, isFlying: false });
        }
        else if (type === 'orc') {
            enemy.setAttribute('scale', '0.45 0.45 0.45');
            enemy.setAttribute('gltf-model', '#model-orc');
            enemy.setAttribute('enemy-stats', { hp: 10, speed: 0.3, damage: 8, reward: 25, offsetY: 0, isFlying: false });
        }
        else if (type === 'dragon') {
            enemy.setAttribute('scale', '0.15 0.15 0.15');
            enemy.setAttribute('gltf-model', '#model-dragon');
            enemy.setAttribute('enemy-stats', { hp: 8, speed: 0.6, damage: 4, reward: 40, offsetY: 1.2, isFlying: true });
        }

        let sensor = document.createElement('a-entity');
        sensor.setAttribute('position', '0 2.0 -0.5');
        sensor.setAttribute('raycaster', {
            objects: '.climbable',
            direction: {x: 0, y: -1, z: 0},
            far: 4,
            showLine: true,
            interval: 0
        });
        sensor.setAttribute('line', {color: 'red', opacity: 0.6});
        sensor.classList.add('altitude-sensor');

        enemy.appendChild(sensor);
        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

AFRAME.registerComponent('enemy-stats', {
    schema: {
        hp: {default: 1}, speed: {default: 1}, damage: {default: 1}, reward: {default: 10},
        offsetY: {default: 0}, isFlying: {default: false}
    },
    takeHit: function() {
        this.data.hp--;
        let el = this.el;

        el.setAttribute('visible', 'false');
        setTimeout(() => { if(el.parentNode) el.setAttribute('visible', 'true'); }, 50);

        if (this.data.hp <= 0) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
        }
    }
});

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

        let sensorEl = this.el.querySelector('.altitude-sensor');
        let floorY = 0;

        if (sensorEl && sensorEl.components.raycaster) {
            let ray = sensorEl.components.raycaster;
            let intersections = ray.intersectedEls;
            if (intersections.length > 0) {
                let hit = ray.getIntersection(intersections[0]);
                if (hit) floorY = hit.point.y;
            }
        }

        let targetY = floorY + stats.offsetY;

        if (targetY > this.el.object3D.position.y + 0.1) {
            this.el.object3D.position.y += (targetY - this.el.object3D.position.y) * 0.2;
        } else {
            this.el.object3D.position.y += (targetY - this.el.object3D.position.y) * 0.1;
        }
    }
});