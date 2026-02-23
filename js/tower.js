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
        let bullet = document.createElement('a-entity');
        let pos = this.el.object3D.position;
        let data = TOWER_DATA[this.data.type];
        let firePos = { x: pos.x, y: pos.y + data.offsetY + 0.05, z: pos.z };

        // --- AMÉLIORATION : Visuel du projectile type "Laser" ---
        bullet.setAttribute('geometry', 'primitive: cylinder; radius: 0.015; height: 0.2');
        bullet.setAttribute('material', 'color: #ffaa00; emissive: #ff5500; emissiveIntensity: 2');
        bullet.setAttribute('position', firePos);
        bullet.target = target;
        bullet.setAttribute('projectile', '');
        this.el.sceneEl.appendChild(bullet);
        // --------------------------------------------------------

        // --- NOUVEAUTÉ : Muzzle Flash (Éclair de départ) ---
        let flash = document.createElement('a-entity');
        flash.setAttribute('geometry', 'primitive: sphere; radius: 0.08');
        flash.setAttribute('material', 'color: #ffffff; emissive: #ffff00; emissiveIntensity: 4; transparent: true; opacity: 0.9');
        flash.setAttribute('position', firePos);
        // Animation pour faire disparaître le flash instantanément
        flash.setAttribute('animation__scale', 'property: scale; to: 0 0 0; dur: 150; easing: easeOutQuad');
        flash.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 150; easing: easeOutQuad');
        this.el.sceneEl.appendChild(flash);

        // Nettoyage du flash après l'animation
        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 150);
        // ---------------------------------------------------
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

        // On vise un peu au-dessus des pieds de l'ennemi (le torse)
        let targetY = targetPos.y + 0.3;

        let dx = targetPos.x - currentPos.x;
        let dy = targetY - currentPos.y;
        let dz = targetPos.z - currentPos.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // --- NOUVEAUTÉ : Orientation du laser vers la cible ---
        this.el.object3D.lookAt(targetPos.x, targetY, targetPos.z);
        this.el.object3D.rotateX(Math.PI / 2); // Ajustement car c'est un cylindre
        // ------------------------------------------------------

        if (dist < 0.2) {
            let stats = this.el.target.components['enemy-stats'];
            if (stats) stats.takeHit();

            // --- NOUVEAUTÉ : Effet d'impact (Explosion de particules) ---
            this.createImpactEffect(currentPos);
            // ------------------------------------------------------------

            this.el.parentNode.removeChild(this.el);
            return;
        }
        let move = (this.speed * timeDelta) / 1000;
        this.el.object3D.position.x += (dx / dist) * move;
        this.el.object3D.position.y += (dy / dist) * move;
        this.el.object3D.position.z += (dz / dist) * move;
    },

    // Fonction qui génère l'effet visuel lors du contact
    createImpactEffect: function(pos) {
        let impact = document.createElement('a-entity');
        impact.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
        impact.setAttribute('material', 'color: #ff4400; emissive: #ff0000; emissiveIntensity: 3; wireframe: true; transparent: true');
        impact.setAttribute('position', pos);

        // Animation d'expansion et d'effacement
        impact.setAttribute('animation__scale', 'property: scale; to: 2.5 2.5 2.5; dur: 200; easing: easeOutQuad');
        impact.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 200; easing: easeOutQuad');

        this.el.sceneEl.appendChild(impact);

        // Nettoyage de l'entité
        setTimeout(() => { if (impact.parentNode) impact.parentNode.removeChild(impact); }, 200);
    }
});