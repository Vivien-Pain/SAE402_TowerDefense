AFRAME.registerComponent('smart-animator', {
    init: function() {
        this.el.addEventListener('model-loaded', () => {
            let mesh = this.el.getObject3D('mesh');
            let stats = this.el.getAttribute('enemy-stats');
            if (mesh && mesh.animations && mesh.animations.length > 0) {
                let anims = mesh.animations.map(a => a.name);
                const findAnim = keyword => {
                    if (!keyword) return anims[0];
                    let found = anims.find(a => a.toLowerCase().includes(keyword.toLowerCase()));
                    return found || anims[0];
                };
                let realWalk = findAnim(stats.walkAnim);
                this.el.setAttribute('enemy-stats', {
                    walkAnim: realWalk, attackAnim: findAnim(stats.attackAnim),
                    hitAnim: findAnim(stats.hitAnim), deathAnim: findAnim(stats.deathAnim)
                });
                this.el.setAttribute('animation-mixer', `clip: ${realWalk}; loop: repeat; crossFadeDuration: 0.2`);
            }
        });
    }
});

AFRAME.registerComponent('plane-manager', {
    init: function () {
        this.el.sceneEl.addEventListener('child-attached', (evt) => {
            let el = evt.detail.el;
            setTimeout(() => {
                if (el.components && el.components['xr-plane'] && el.components['xr-plane'].data.orientation === 'horizontal') {
                    el.classList.add('climbable');
                    el.setAttribute('material', { color: '#00FF00', opacity: 0.3, transparent: true, wireframe: true, side: 'double' });
                    el.object3D.visible = true;
                }
            }, 500);
        });
    }
});

AFRAME.registerComponent('enemy-spawner', {
    schema: { waveInterval: { type: 'number', default: 5000 }, spawnInterval: { type: 'number', default: 3000 } },
    init: function () {
        if (!this.el.sceneEl.hasAttribute('plane-manager')) this.el.sceneEl.setAttribute('plane-manager', '');
        this.timer = 0; this.waveCount = 1; this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true; this.enemiesPerWave = 5;
    },
    tick: function (time, timeDelta) {
        this.timer += timeDelta;
        if (this.isWaveActive) {
            if (this.timer >= this.data.spawnInterval) {
                this.spawnRandomEnemy();
                this.timer = 0;
                this.enemiesSpawnedInWave++;
                if (this.enemiesSpawnedInWave >= this.enemiesPerWave) { this.isWaveActive = false; this.timer = 0; }
            }
        } else if (this.timer >= this.data.waveInterval) {
            this.startNextWave();
            this.timer = 0;
        }
    },
    startNextWave: function() {
        this.waveCount++; this.enemiesPerWave += 2; this.enemiesSpawnedInWave = 0; this.isWaveActive = true;
        let hud = document.getElementById('hud-hp');
        if(hud) {
            let oldColor = hud.getAttribute('color');
            hud.setAttribute('color', 'yellow');
            setTimeout(() => hud.setAttribute('color', oldColor), 1000);
        }
    },
    spawnRandomEnemy: function () {
        let rand = Math.random(), type = 'demon';
        if (this.waveCount >= 2 && rand > 0.5) type = 'skeleton';
        if (this.waveCount >= 3 && rand > 0.75) type = 'orc';
        if (this.waveCount >= 4 && rand > 0.9) type = 'dragon';
        this.createEnemy(type);
    },
    createEnemy: function (type) {
        let data = MOB_DATA[type];
        if(!data) return;
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');
        let angle = Math.random() * Math.PI * 2, dist = 4;
        enemy.setAttribute('position', { x: Math.cos(angle) * dist, y: 0.5, z: Math.sin(angle) * dist });
        enemy.setAttribute('scale', data.scale);
        enemy.setAttribute('gltf-model', data.model);
        enemy.setAttribute('enemy-stats', {
            hp: data.hp, speed: data.speed, damage: data.damage, reward: data.reward, offsetY: data.offsetY,
            isFlying: data.isFlying, attackAnim: data.attackAnim, walkAnim: data.walkAnim, hitAnim: data.hitAnim, deathAnim: data.deathAnim
        });
        enemy.setAttribute('smart-animator', '');
        let sensor = document.createElement('a-entity');
        sensor.setAttribute('position', '0 2.0 -0.5');
        sensor.setAttribute('raycaster', { objects: '.climbable', direction: {x: 0, y: -1, z: 0}, far: 4, interval: 0 });
        sensor.classList.add('altitude-sensor');
        enemy.appendChild(sensor);
        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

AFRAME.registerComponent('enemy-stats', {
    schema: { hp: {default: 1}, speed: {default: 1}, damage: {default: 1}, reward: {default: 10}, offsetY: {default: 0}, isFlying: {default: false}, attackAnim: {default: 'Attack'}, walkAnim: {default: 'Walk'}, hitAnim: {default: 'HitReact'}, deathAnim: {default: 'Death'} },
    init: function() { this.isDead = false; this.isAttacking = false; this.hitTimeout = null; },
    takeHit: function() {
        if (this.isDead) return;
        this.data.hp--;
        let el = this.el;
        if (this.data.hp <= 0) {
            this.isDead = true;
            el.setAttribute('animation-mixer', `clip: ${this.data.deathAnim}; loop: once; crossFadeDuration: 0.2`);
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 1500);
        } else if (!this.isAttacking) {
            el.setAttribute('animation-mixer', `clip: ${this.data.hitAnim}; loop: once; crossFadeDuration: 0.1`);
            clearTimeout(this.hitTimeout);
            this.hitTimeout = setTimeout(() => {
                if (!this.isDead && !this.isAttacking) el.setAttribute('animation-mixer', `clip: ${this.data.walkAnim}; loop: repeat; crossFadeDuration: 0.2`);
            }, 500);
        }
    }
});

AFRAME.registerComponent('enemy-walker', {
    tick: function (time, timeDelta) {
        let stats = this.el.components['enemy-stats'];
        if(!stats || stats.isDead || stats.isAttacking) return;
        let pos = this.el.object3D.position, dx = 0 - pos.x, dz = 0 - pos.z, dist = Math.sqrt(dx*dx + dz*dz);
        this.el.object3D.rotation.y = Math.atan2(dx, dz);
        if (dist < 0.3) {
            stats.isAttacking = true;
            this.el.setAttribute('animation-mixer', `clip: ${stats.data.attackAnim}; loop: once; crossFadeDuration: 0.2`);
            let system = this.el.sceneEl.systems['game-manager'];
            setTimeout(() => {
                if(system) system.takeDamage(stats.data.damage);
                if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
            }, 1000);
            return;
        }
        let move = (stats.data.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
        let sensorEl = this.el.querySelector('.altitude-sensor'), floorY = 0;
        if (sensorEl && sensorEl.components.raycaster) {
            let ray = sensorEl.components.raycaster, intersections = ray.intersectedEls;
            if (intersections.length > 0) {
                let hit = ray.getIntersection(intersections[0]);
                if (hit) floorY = hit.point.y;
            }
        }
        let targetY = floorY + stats.data.offsetY;
        this.el.object3D.position.y += (targetY - pos.y) * (targetY > pos.y + 0.1 ? 0.2 : 0.1);
    }
});