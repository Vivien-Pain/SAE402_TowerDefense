AFRAME.registerComponent('ar-game-controller', {
    init: function () {
        this.reticle = document.getElementById('reticle');
        this.hitTestSource = null;
        this.inputSource = null;
        this.isHitTestReady = false;

        this.el.sceneEl.renderer.xr.addEventListener('sessionstart', async () => {
            const session = this.el.sceneEl.renderer.xr.getSession();

            session.addEventListener('inputsourceschange', () => {
                this.checkInputSources(session);
            });
            this.checkInputSources(session);

            session.addEventListener('select', () => this.tryBuild());
        });
    },

    checkInputSources: async function(session) {
        let sources = Array.from(session.inputSources);
        let targetSource = sources.find(s => s.targetRayMode === 'tracked-pointer' && s.handedness === 'right');

        if (!targetSource) {
            targetSource = sources.find(s => s.targetRayMode === 'tracked-pointer');
        }

        if (targetSource && this.inputSource !== targetSource) {
            this.inputSource = targetSource;
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

                let cameraEl = document.querySelector('a-camera');
                let cameraPos = cameraEl ? cameraEl.object3D.position : new THREE.Vector3(0,0,0);

                let hitPos = pose.transform.position;

                let dx = cameraPos.x - hitPos.x;
                let dz = cameraPos.z - hitPos.z;
                let distance = Math.sqrt(dx*dx + dz*dz);

                if (distance > 0.3) {
                    this.reticle.setAttribute('visible', 'true');
                    this.reticle.object3D.position.copy(hitPos);
                    this.reticle.object3D.quaternion.copy(pose.transform.orientation);
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

        let geom = document.createElement('a-entity');
        geom.setAttribute('gltf-model', '#model-turret');
        geom.setAttribute('scale', '0.2 0.2 0.2');
        tower.appendChild(geom);

        tower.setAttribute('tower-logic', '');

        tower.setAttribute('position', pos);
        this.el.sceneEl.appendChild(tower);
    }
});