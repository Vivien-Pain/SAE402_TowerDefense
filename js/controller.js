/* js/controller.js - Gestion de la Manette et Construction Sécurisée */

AFRAME.registerComponent('ar-game-controller', {
    init: function () {
        this.reticle = document.getElementById('reticle');
        this.hitTestSource = null;
        this.inputSource = null;
        this.isHitTestReady = false;

        // 1. Démarrage Session AR
        this.el.sceneEl.renderer.xr.addEventListener('sessionstart', async () => {
            const session = this.el.sceneEl.renderer.xr.getSession();

            // On surveille les connexions de manettes
            session.addEventListener('inputsourceschange', () => {
                this.checkInputSources(session);
            });
            this.checkInputSources(session);

            // Ecoute du bouton "Trigger" (Gâchette) pour construire
            session.addEventListener('select', () => this.tryBuild());
        });
    },

    // Cherche la manette DROITE pour le rayon
    checkInputSources: async function(session) {
        let sources = Array.from(session.inputSources);
        let targetSource = sources.find(s => s.targetRayMode === 'tracked-pointer' && s.handedness === 'right');

        // Fallback : n'importe quelle manette si pas de droite
        if (!targetSource) {
            targetSource = sources.find(s => s.targetRayMode === 'tracked-pointer');
        }

        if (targetSource && this.inputSource !== targetSource) {
            this.inputSource = targetSource;
            // On demande le Hit-Test natif (très fiable pour l'AR)
            this.hitTestSource = await session.requestHitTestSource({
                space: targetSource.targetRaySpace
            });
            console.log("🎮 Manette détectée :", targetSource.handedness);
        }
    },

    tick: function () {
        if (!this.hitTestSource) return;

        const frame = this.el.sceneEl.frame;
        const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

        if (frame) {
            const results = frame.getHitTestResults(this.hitTestSource);
            if (results.length > 0) {
                const pose = results[0].getPose(refSpace);

                // --- 1. VÉRIFICATION DE LA SURFACE (Pas de mur/plafond) ---
                let normal = new THREE.Vector3(0, 1, 0).applyQuaternion(pose.transform.orientation);

                if (normal.y < 0.8) {
                    this.reticle.setAttribute('visible', 'false');
                    this.isHitTestReady = false;
                    return;
                }

                // --- 2. SÉCURITÉ DE DISTANCE ---
                let cameraEl = document.querySelector('a-camera');
                let cameraPos = cameraEl ? cameraEl.object3D.position : new THREE.Vector3(0,0,0);

                let hitPos = pose.transform.position;

                let dx = cameraPos.x - hitPos.x;
                let dz = cameraPos.z - hitPos.z;
                let distance = Math.sqrt(dx*dx + dz*dz);

                if (distance > 0.3) {
                    this.reticle.setAttribute('visible', 'true');
                    this.reticle.object3D.position.copy(hitPos);

                    // CORRECTION ICI : On réinitialise la rotation globale à zéro.
                    // Le HTML s'occupe de coucher le rond et de dresser la tige.
                    this.reticle.object3D.quaternion.identity();

                    this.isHitTestReady = true;
                    return;
                }
            }
        }

        this.reticle.setAttribute('visible', 'false');
        this.isHitTestReady = false;
    },

    tryBuild: function() {
        if (this.isHitTestReady && this.reticle.getAttribute('visible') === true) {
            let gameSystem = this.el.sceneEl.systems['game-manager'];

            if (gameSystem && gameSystem.tryBuyTower(50)) {
                this.spawnTower(this.reticle.object3D.position);
            }
        }
    },

    spawnTower: function(pos) {
        let tower = document.createElement('a-entity');

        // Visuel Tour
        let geom = document.createElement('a-entity');
        geom.setAttribute('gltf-model', '#model-turret');
        geom.setAttribute('scale', '0.2 0.2 0.2');
        geom.setAttribute('position', '0 0.15 0');

        tower.appendChild(geom);
        tower.setAttribute('tower-logic', '');
        tower.setAttribute('position', pos);
        this.el.sceneEl.appendChild(tower);
    }
});