AFRAME.registerComponent('tower-logic', {
    schema: { type: { type: 'string', default: 'basic_turret' } },
    init: function () {
        let data = TOWER_DATA[this.data.type];
        this.hp = data.hp || 0;
        this.isShield = this.data.type === 'shield_turret';

        // Enregistre la tour dans la mémoire globale
        this.el.sceneEl.systems['game-manager'].registerTower(this.el, this.isShield);

        if (this.isShield) {
            this.el.classList.add('shield-tower');
            return;
        }

        this.fireRate = data.fireRate;
        this.range = data.range;
        this.timer = 0;
    },
    remove: function () {
        // Nettoie la mémoire si la tour est détruite
        this.el.sceneEl.systems['game-manager'].unregisterTower(this.el, this.isShield);
    },
    takeDamage: function(amount) {
        if (!this.isShield) return;
        this.hp -= amount;
        if (this.hp <= 0 && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    },
    tick: function (time, timeDelta) {
        if (this.isShield) return;

        this.timer += timeDelta;
        if (this.timer >= this.fireRate) {
            let target = this.findClosestEnemy();
            if (target) {
                this.fire(target);
                this.timer = 0;
            }
        }
    },
    findClosestEnemy: function () {
        // OPTIMISATION : Utilise la liste en mémoire, sans querySelectorAll
        let gameSystem = this.el.sceneEl.systems['game-manager'];
        let enemies = gameSystem ? gameSystem.enemies : [];
        let myPos = this.el.object3D.position;
        let closest = null;

        // Optimisation Math.sqrt : on compare les carrés des distances
        let minDistSq = this.range * this.range;
        let isHighTower = myPos.y > 0.4;

        for (let i = 0; i < enemies.length; i++) {
            let enemy = enemies[i];
            if (!enemy.object3D) continue;

            let stats = enemy.getAttribute('enemy-stats');
            if (stats && stats.isFlying && !isHighTower) continue;

            let distSq = myPos.distanceToSquared(enemy.object3D.position);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closest = enemy;
            }
        }
        return closest;
    },
    fire: function (target) {
        let bullet = document.createElement('a-entity');
        let pos = this.el.object3D.position;
        let data = TOWER_DATA[this.data.type];
        let firePos = { x: pos.x, y: pos.y + data.offsetY + 0.05, z: pos.z };

        bullet.setAttribute('position', firePos);
        bullet.target = target;
        bullet.damage = data.damage;

        if (this.data.type === 'lighting_turret') {
            bullet.setAttribute('geometry', 'primitive: cylinder; radius: 0.01; height: 0.2');
            bullet.setAttribute('material', 'color: #00ffff; emissive: #0088ff; emissiveIntensity: 3');
            bullet.effect = 'stun';
        } else {
            bullet.setAttribute('geometry', 'primitive: cylinder; radius: 0.015; height: 0.2');
            bullet.setAttribute('material', 'color: #ffaa00; emissive: #ff5500; emissiveIntensity: 2');
            bullet.effect = 'normal';
        }

        bullet.setAttribute('projectile', '');
        this.el.sceneEl.appendChild(bullet);

        let shootSound = document.createElement('a-entity');
        let soundId = this.data.type === 'lighting_turret' ? '#snd-zap' : '#snd-magic';
        shootSound.setAttribute('sound', `src: ${soundId}; autoplay: true; volume: 0.15; positional: true; refDistance: 1`);
        shootSound.setAttribute('position', firePos);
        this.el.sceneEl.appendChild(shootSound);
        setTimeout(() => { if (shootSound.parentNode) shootSound.parentNode.removeChild(shootSound); }, 2000);

        let flash = document.createElement('a-entity');
        flash.setAttribute('geometry', 'primitive: sphere; radius: 0.08');
        flash.setAttribute('material', `color: #ffffff; emissive: ${this.data.type === 'lighting_turret' ? '#00ffff' : '#ffff00'}; emissiveIntensity: 4; transparent: true; opacity: 0.9`);
        flash.setAttribute('position', firePos);
        flash.setAttribute('animation__scale', 'property: scale; to: 0 0 0; dur: 150; easing: easeOutQuad');
        flash.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 150; easing: easeOutQuad');
        this.el.sceneEl.appendChild(flash);

        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 150);
    }
});

AFRAME.registerComponent('projectile', {
    init: function() { this.speed = 10; },
    tick: function (time, timeDelta) {
        if (!this.el.target || !this.el.target.parentNode) {
            this.el.parentNode.removeChild(this.el);
            return;
        }

        let currentPos = this.el.object3D.position;
        let targetPos = this.el.target.object3D.position;
        let targetY = targetPos.y + 0.3;

        let dx = targetPos.x - currentPos.x;
        let dy = targetY - currentPos.y;
        let dz = targetPos.z - currentPos.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        this.el.object3D.lookAt(targetPos.x, targetY, targetPos.z);
        this.el.object3D.rotateX(Math.PI / 2);

        if (dist < 0.2) {
            let stats = this.el.target.components['enemy-stats'];
            if (stats) {
                stats.takeHit(this.el.damage);
                if (this.el.effect === 'stun') {
                    stats.applyStun(TOWER_DATA['lighting_turret'].stunDuration);
                }
            }
            this.createImpactEffect(currentPos, this.el.effect);
            this.el.parentNode.removeChild(this.el);
            return;
        }
        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    },
    createImpactEffect: function(pos, effect) {
        let impact = document.createElement('a-entity');
        impact.setAttribute('geometry', 'primitive: sphere; radius: 0.1');

        if (effect === 'stun') {
            impact.setAttribute('material', 'color: #00ccff; emissive: #00ffff; emissiveIntensity: 3; wireframe: true; transparent: true');
        } else {
            impact.setAttribute('material', 'color: #ff4400; emissive: #ff0000; emissiveIntensity: 3; wireframe: true; transparent: true');
        }

        impact.setAttribute('position', pos);
        impact.setAttribute('animation__scale', 'property: scale; to: 2.5 2.5 2.5; dur: 200; easing: easeOutQuad');
        impact.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 200; easing: easeOutQuad');
        this.el.sceneEl.appendChild(impact);
        setTimeout(() => { if (impact.parentNode) impact.parentNode.removeChild(impact); }, 200);

        let impactSound = document.createElement('a-entity');
        impactSound.setAttribute('sound', `src: #snd-boom; autoplay: true; volume: 0.2; positional: true; refDistance: 1`);
        impactSound.setAttribute('position', pos);
        this.el.sceneEl.appendChild(impactSound);
        setTimeout(() => { if (impactSound.parentNode) impactSound.parentNode.removeChild(impactSound); }, 2000);
    }
});