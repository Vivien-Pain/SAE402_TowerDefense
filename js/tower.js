AFRAME.registerComponent('tower-maker', {
    init: function () {
        this.el.addEventListener('click', (evt) => {
            if (!evt.detail.intersection) return;
            let gameSystem = this.el.sceneEl.systems['game-manager'];
            if (!gameSystem) return;

            // PRIX AUGMENTÉ A 50
            if (gameSystem.tryBuyTower(50)) {
                let point = evt.detail.intersection.point;
                this.spawnTower(point);
            }
        });
    },

    spawnTower: function (position) {
        let tower = document.createElement('a-entity');
        tower.setAttribute('geometry', { primitive: 'box', width: 0.2, height: 0.6, depth: 0.2 });
        tower.setAttribute('material', { color: '#0055FF' });
        tower.setAttribute('position', { x: position.x, y: position.y + 0.3, z: position.z });
        tower.setAttribute('tower-logic', '');
        this.el.sceneEl.appendChild(tower);
    }
});

AFRAME.registerComponent('tower-logic', {
    init: function () {
        // TIR RALENTI A 4 SECONDES
        this.fireRate = 4000;
        this.timer = 0;
        this.range = 5;
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
        let myPos = this.el.object3D.position;
        let closest = null;
        let minDist = Infinity;

        enemies.forEach(enemy => {
            if (!enemy.parentNode) return;
            let dist = myPos.distanceTo(enemy.object3D.position);
            if (dist < minDist && dist <= this.range) {
                minDist = dist;
                closest = enemy;
            }
        });
        return closest;
    },

    fire: function (target) {
        let bullet = document.createElement('a-entity');
        bullet.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
        bullet.setAttribute('material', { color: 'yellow' });
        let pos = this.el.object3D.position;
        bullet.setAttribute('position', { x: pos.x, y: pos.y + 0.5, z: pos.z });
        bullet.target = target;
        bullet.setAttribute('projectile-behavior', '');
        this.el.sceneEl.appendChild(bullet);
    }
});

AFRAME.registerComponent('projectile-behavior', {
    init: function() { this.speed = 8; },
    tick: function (time, timeDelta) {
        if (!this.el.target || !this.el.target.parentNode) {
            this.el.parentNode.removeChild(this.el);
            return;
        }
        let currentPos = this.el.object3D.position;
        let targetPos = this.el.target.object3D.position;
        let dx = targetPos.x - currentPos.x;
        let dy = targetPos.y - currentPos.y;
        let dz = targetPos.z - currentPos.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < 0.2) {
            let stats = this.el.target.components['enemy-stats'];
            if (stats) stats.takeHit();
            else if (this.el.target.parentNode) this.el.target.parentNode.removeChild(this.el.target);
            this.el.parentNode.removeChild(this.el);
            return;
        }
        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});