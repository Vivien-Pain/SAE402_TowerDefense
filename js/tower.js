/* js/tower.js - Version Complète et Corrigée */

// COMPOSANT 1 : Permet de placer les tours en cliquant sur le sol
AFRAME.registerComponent('tower-maker', {
    init: function () {
        this.el.addEventListener('click', (evt) => {
            // On vérifie l'argent via le game-manager
            let gameSystem = this.el.sceneEl.systems['game-manager'];

            // Si le système n'existe pas ou qu'on n'a pas 20 gold, on ne fait rien
            if (gameSystem && gameSystem.tryBuyTower(20)) {
                let point = evt.detail.intersection.point;
                this.spawnTower(point);
            } else {
                console.log("Pas assez d'argent ou Manager absent !");
            }
        });
    },

    spawnTower: function (position) {
        let tower = document.createElement('a-entity');

        // Apparence (Cube Bleu)
        tower.setAttribute('geometry', { primitive: 'box', width: 0.2, height: 0.6, depth: 0.2 });
        tower.setAttribute('material', { color: '#0055FF' });

        // Position (un peu surélevé)
        tower.setAttribute('position', { x: position.x, y: position.y + 0.3, z: position.z });

        // On attache le "cerveau" de la tour
        tower.setAttribute('tower-logic', '');

        this.el.sceneEl.appendChild(tower);
    }
});

// COMPOSANT 2 : Le cerveau de la tour (Vise et Tire)
AFRAME.registerComponent('tower-logic', {
    init: function () {
        this.fireRate = 5000; // TIR LENT : 5 secondes de recharge
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
            // Vérifie si l'ennemi est toujours vivant (attaché à la scène)
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

// COMPOSANT 3 : Le projectile (Avance et inflige des dégâts)
AFRAME.registerComponent('projectile-behavior', {
    init: function() {
        this.speed = 6;
    },

    tick: function (time, timeDelta) {
        // Si la cible n'existe plus, on détruit la balle
        if (!this.el.target || !this.el.target.parentNode) {
            this.el.parentNode.removeChild(this.el);
            return;
        }

        let currentPos = this.el.object3D.position;
        let targetPos = this.el.target.object3D.position;

        // Calcul distance
        let dx = targetPos.x - currentPos.x;
        let dy = targetPos.y - currentPos.y;
        let dz = targetPos.z - currentPos.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // IMPACT
        if (dist < 0.2) {
            // On récupère les stats de l'ennemi pour lui faire mal
            let stats = this.el.target.components['enemy-stats'];
            if (stats) {
                stats.takeHit(); // Enlève 1 PV
            } else {
                // Fallback (si pas de stats) : Mort instantanée
                if (this.el.target.parentNode) this.el.target.parentNode.removeChild(this.el.target);
            }

            // Destruction du projectile
            this.el.parentNode.removeChild(this.el);
            return;
        }

        // Mouvement
        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    }
});