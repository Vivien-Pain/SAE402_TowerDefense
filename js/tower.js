AFRAME.registerComponent('tower-logic', {
    schema: { type: { type: 'string', default: 'basic_turret' } },
    init: function () {
        this.level = 0;
        let data = TOWER_DATA[this.data.type];
        this.hp = data.hp || 0;
        this.maxHp = this.hp;
        this.isShield = this.data.type === 'shield_turret';

        this.el.sceneEl.systems['game-manager'].registerTower(this.el, this.isShield);

        if (this.isShield) {
            this.el.classList.add('shield-tower');
            return;
        }

        this.fireRate = data.fireRate;
        this.range = data.range;
        this.damage = data.damage;
        this.stunDuration = data.stunDuration || 0;
        this.timer = 0;

        let soundId = this.data.type === 'lighting_turret' ? '#snd-zap' : '#snd-magic';
        this.el.setAttribute('sound', `src: ${soundId}; volume: 0.15; positional: true; refDistance: 1; poolSize: 4`);
    },
    remove: function () {
        this.el.sceneEl.systems['game-manager'].unregisterTower(this.el, this.isShield);
    },
    canUpgrade: function() {
        let data = TOWER_DATA[this.data.type];
        return data.upgrades && this.level < data.upgrades.length;
    },
    getUpgradeCost: function() {
        if (!this.canUpgrade()) return 0;
        return TOWER_DATA[this.data.type].upgrades[this.level].cost;
    },
    upgrade: function() {
        if (!this.canUpgrade()) return;

        let data = TOWER_DATA[this.data.type];
        let upgradeData = data.upgrades[this.level];
        this.level++;

        if (this.isShield) {
            this.maxHp += upgradeData.hpBonus;
            this.hp += upgradeData.hpBonus;
        } else {
            if (upgradeData.damage) this.damage = upgradeData.damage;
            if (upgradeData.fireRate) this.fireRate = upgradeData.fireRate;
            if (upgradeData.stunDuration) this.stunDuration = upgradeData.stunDuration;
        }

        let currentScale = this.el.getAttribute('scale') || {x:1, y:1, z:1};
        let newScale = {
            x: currentScale.x * 1.15,
            y: currentScale.y * 1.15,
            z: currentScale.z * 1.15
        };
        this.el.setAttribute('animation__upgrade', `property: scale; to: ${newScale.x} ${newScale.y} ${newScale.z}; dur: 300; easing: easeOutElastic`);
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
        let gameSystem = this.el.sceneEl.systems['game-manager'];
        let enemies = gameSystem ? gameSystem.enemies : [];
        let myPos = this.el.object3D.position;
        let closest = null;
        let minDistSq = this.range * this.range;
        let isHighTower = myPos.y > 0.4;

        for (let i = 0; i < enemies.length; i++) {
            let enemy = enemies[i];
            if (!enemy.object3D) continue;

            let stats = enemy.components['enemy-stats'];
            if (stats && stats.data.isFlying && !isHighTower) continue;

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
        bullet.damage = this.damage;
        bullet.stunDuration = this.stunDuration;

        if (this.data.type === 'lighting_turret') {
            bullet.setAttribute('geometry', 'primitive: cylinder; radius: 0.01; height: 0.2');
            bullet.setAttribute('material', 'color: #00ffff; emissive: #0088ff; emissiveIntensity: 2');
            bullet.effect = 'stun';
        } else {
            bullet.setAttribute('geometry', 'primitive: cylinder; radius: 0.015; height: 0.2');
            bullet.setAttribute('material', 'color: #ffaa00; emissive: #ff5500; emissiveIntensity: 1');
            bullet.effect = 'normal';
        }

        bullet.setAttribute('projectile', '');
        this.el.sceneEl.appendChild(bullet);

        if(this.el.components.sound) this.el.components.sound.playSound();
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
        let distSq = dx*dx + dy*dy + dz*dz;

        if (distSq < 0.04) {
            let stats = this.el.target.components['enemy-stats'];
            if (stats) {
                stats.takeHit(this.el.damage);
                if (this.el.effect === 'stun') {
                    stats.applyStun(this.el.stunDuration || 1000);
                }
            }
            this.el.parentNode.removeChild(this.el);
            return;
        }

        let dist = Math.sqrt(distSq);
        this.el.object3D.lookAt(targetPos.x, targetY, targetPos.z);
        this.el.object3D.rotateX(Math.PI / 2);

        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});