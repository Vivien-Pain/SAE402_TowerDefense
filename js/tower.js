AFRAME.registerComponent('tower-logic', {
    schema: { type: { type: 'string', default: 'basic_turret' } },
    init: function () {
        let data = TOWER_DATA[this.data.type];
        this.fireRate = data.fireRate;
        this.range = data.range;
        this.timer = 0;
    },
    tick: function (time, timeDelta) {
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
        let enemies = document.querySelectorAll('.enemy');
        let myPos = this.el.object3D.position, closest = null, minDist = Infinity, isHighTower = myPos.y > 0.4;
        enemies.forEach(enemy => {
            if (!enemy.object3D) return;
            let stats = enemy.getAttribute('enemy-stats');
            if (stats && stats.isFlying && !isHighTower) return;
            let dist = myPos.distanceTo(enemy.object3D.position);
            if (dist < minDist && dist <= this.range) { minDist = dist; closest = enemy; }
        });
        return closest;
    },
    fire: function (target) {
        let bullet = document.createElement('a-entity'), pos = this.el.object3D.position, data = TOWER_DATA[this.data.type];
        bullet.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
        bullet.setAttribute('material', { color: 'yellow' });
        bullet.setAttribute('position', { x: pos.x, y: pos.y + data.offsetY + 0.05, z: pos.z });
        bullet.target = target;
        bullet.setAttribute('projectile', '');
        this.el.sceneEl.appendChild(bullet);
    }
});

AFRAME.registerComponent('projectile', {
    init: function() { this.speed = 10; },
    tick: function (time, timeDelta) {
        if (!this.el.target || !this.el.target.parentNode) {
            this.el.parentNode.removeChild(this.el);
            return;
        }
        let currentPos = this.el.object3D.position, targetPos = this.el.target.object3D.position;
        let dx = targetPos.x - currentPos.x, dy = targetPos.y - currentPos.y, dz = targetPos.z - currentPos.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 0.2) {
            let stats = this.el.target.components['enemy-stats'];
            if (stats) stats.takeHit();
            this.el.parentNode.removeChild(this.el);
            return;
        }
        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});