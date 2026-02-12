/* js/controller.js - Gestion de la Manette et Construction */

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
            // On demande le Hit-Test sur le rayon de la manette
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

                // On colle le réticule au sol visé
                this.reticle.setAttribute('visible', 'true');
                this.reticle.object3D.position.copy(pose.transform.position);
                this.reticle.object3D.quaternion.copy(pose.transform.orientation);
                this.isHitTestReady = true;
            } else {
                this.reticle.setAttribute('visible', 'false');
                this.isHitTestReady = false;
            }
        }
    },

    tryBuild: function() {
        if (this.isHitTestReady && this.reticle.getAttribute('visible')) {
            let gameSystem = this.el.sceneEl.systems['game-manager'];

            // Coût : 50 Gold
            if (gameSystem && gameSystem.tryBuyTower(50)) {
                this.spawnTower(this.reticle.object3D.position);
            }
        }
    },

    spawnTower: function(pos) {
        let tower = document.createElement('a-entity');

        // Visuel Tour (Bleu)
        let geom = document.createElement('a-box');
        geom.setAttribute('color', '#0055FF');
        geom.setAttribute('width', 0.15);
        geom.setAttribute('height', 0.4);
        geom.setAttribute('depth', 0.15);
        geom.setAttribute('position', '0 0.2 0');
        tower.appendChild(geom);

        // Logique de tir
        tower.setAttribute('tower-logic', '');

        // Positionnement
        tower.setAttribute('position', pos);
        this.el.sceneEl.appendChild(tower);
    }
});