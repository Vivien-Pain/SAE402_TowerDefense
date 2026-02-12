// COMPOSANT LOGIQUE DE LA TOUR (TIR)
AFRAME.registerComponent('tower-logic', {
    init: function () {
        this.fireRate = 1000; // Tir toutes les secondes
        this.timer = 0;
        this.range = 5; // Portée de 5 mètres
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
            if (!enemy.object3D) return;
            let dist = myPos.distanceTo(enemy.object3D.position);
            if (dist < minDist && dist <= this.range) {
                minDist = dist;
                closest = enemy;
            }
        });
        return closest;
    },

    fire: function (target) {
        // Création du projectile
        let bullet = document.createElement('a-entity');
        bullet.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
        bullet.setAttribute('material', { color: 'yellow' });

        let pos = this.el.object3D.position;
        bullet.setAttribute('position', { x: pos.x, y: pos.y + 0.5, z: pos.z });

        bullet.target = target;
        bullet.setAttribute('projectile', '');
        this.el.sceneEl.appendChild(bullet);
    }
});

// COMPOSANT PROJECTILE
AFRAME.registerComponent('projectile', {
    init: function() { this.speed = 10; },
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
            // Impact !
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