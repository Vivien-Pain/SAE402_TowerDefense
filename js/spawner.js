/* js/spawner.js - Capteur Anticipé & Debug Visuel */

// 1. GESTIONNAIRE DE PLANS (DEBUG)
AFRAME.registerComponent('plane-manager', {
    init: function () {
        this.el.sceneEl.addEventListener('child-attached', (evt) => {
            let el = evt.detail.el;
            // On attend que le plan soit prêt
            setTimeout(() => {
                if (el.components && el.components['xr-plane']) {
                    let orientation = el.components['xr-plane'].data.orientation;

                    // Si c'est une TABLE ou le SOL
                    if (orientation === 'horizontal') {
                        el.classList.add('climbable');

                        // DEBUG : On rend la table VISIBLE (Grillage Vert)
                        // Si tu ne vois pas de grillage vert sur ta table, le scan ne marche pas.
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
        // Force l'ajout du plane-manager
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
        let type = 'goblin';
        if (this.waveCount >= 2 && rand > 0.6) type = 'orc';
        if (this.waveCount >= 3 && rand > 0.8) type = 'knight';
        this.createEnemy(type);
    },

    createEnemy: function (type) {
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');

        let angle = Math.random() * Math.PI * 2;
        let dist = 4; // Spawn à 4m
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;

        // Spawn légèrement surélevé
        enemy.setAttribute('position', { x: x, y: 0.5, z: z });

        // Configuration avec OFFSET
        if (type === 'goblin') {
            enemy.setAttribute('geometry', { primitive: 'sphere', radius: 0.15 });
            enemy.setAttribute('material', { color: '#FF4444' });
            enemy.setAttribute('enemy-stats', { hp: 2, speed: 0.8, damage: 1, reward: 5, offsetY: 0.15 });
        }
        else if (type === 'orc') {
            enemy.setAttribute('geometry', { primitive: 'box', width: 0.4, height: 0.5, depth: 0.4 });
            enemy.setAttribute('material', { color: '#4CAF50' });
            enemy.setAttribute('enemy-stats', { hp: 6, speed: 0.4, damage: 3, reward: 20, offsetY: 0.25 });
        }
        else if (type === 'knight') {
            enemy.setAttribute('geometry', { primitive: 'cylinder', radius: 0.2, height: 0.6 });
            enemy.setAttribute('material', { color: '#2196F3' });
            enemy.setAttribute('enemy-stats', { hp: 10, speed: 0.5, damage: 5, reward: 30, offsetY: 0.3 });

            let shield = document.createElement('a-box');
            shield.setAttribute('color', 'gold');
            shield.setAttribute('depth', 0.05);
            shield.setAttribute('width', 0.3);
            shield.setAttribute('height', 0.4);
            shield.setAttribute('position', '0 0.2 0.25');
            enemy.appendChild(shield);
        }

        // --- CAPTEUR ANTICIPÉ (Satellite Avancé) ---
        let sensor = document.createElement('a-entity');
        // Position: 2m de haut, et 0.5m EN AVANT (-0.5 en Z local)
        sensor.setAttribute('position', '0 2.0 -0.5');

        sensor.setAttribute('raycaster', {
            objects: '.climbable',
            direction: {x: 0, y: -1, z: 0}, // Pointe vers le bas
            far: 4,                         // Portée longue
            showLine: true,                 // LIGNE VISIBLE (Debug)
            interval: 0                     // Scan à chaque frame (Réactif)
        });
        // Ligne rouge pour voir ce que l'ennemi regarde
        sensor.setAttribute('line', {color: 'red', opacity: 0.6});
        sensor.classList.add('altitude-sensor');

        // Boule de debug au bout du laser
        let debugBall = document.createElement('a-sphere');
        debugBall.setAttribute('radius', '0.05');
        debugBall.setAttribute('color', 'yellow');
        debugBall.setAttribute('visible', 'false');
        debugBall.classList.add('debug-ball');
        sensor.appendChild(debugBall);

        enemy.appendChild(sensor);

        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

// 3. STATS
AFRAME.registerComponent('enemy-stats', {
    schema: {
        hp: {default: 1}, speed: {default: 1}, damage: {default: 1}, reward: {default: 10},
        offsetY: {default: 0}
    },
    takeHit: function() {
        this.data.hp--;
        let el = this.el;
        el.setAttribute('material', 'color', 'white');
        setTimeout(() => { if(el.parentNode) el.setAttribute('material', 'color', 'red'); }, 100); // Retour au rouge par défaut (simplifié)

        if (this.data.hp <= 0) {
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
        }
    }
});

// 4. IA DEPLACEMENT (Avec Anticipation)
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

        // --- GESTION HAUTEUR ANTICIPÉE ---
        let sensorEl = this.el.querySelector('.altitude-sensor');
        let debugBall = sensorEl ? sensorEl.querySelector('.debug-ball') : null;

        let floorY = 0;
        let detected = false;

        if (sensorEl && sensorEl.components.raycaster) {
            let ray = sensorEl.components.raycaster;
            let intersections = ray.intersectedEls;
            if (intersections.length > 0) {
                let hit = ray.getIntersection(intersections[0]);
                if (hit) {
                    floorY = hit.point.y;
                    detected = true;

                    // Debug visuel : Montre où le laser tape
                    if(debugBall) {
                        debugBall.setAttribute('visible', 'true');
                        // Position locale (approximative pour debug)
                        debugBall.object3D.position.y = -hit.distance;
                    }
                }
            } else {
                if(debugBall) debugBall.setAttribute('visible', 'false');
            }
        }

        let targetY = floorY + stats.offsetY;

        // Lissage
        let currentY = this.el.object3D.position.y;

        // Si on détecte une table haute devant nous, on monte VITE
        if (targetY > currentY + 0.1) {
            this.el.object3D.position.y += (targetY - currentY) * 0.2;
        } else {
            this.el.object3D.position.y += (targetY - currentY) * 0.1;
        }
    }
});