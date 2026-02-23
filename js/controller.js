AFRAME.registerComponent('ar-game-controller', {
    init: function () {
        this.reticle = document.getElementById('reticle');
        this.hitTestSource = null;
        this.inputSource = null;
        this.isHitTestReady = false;
        this.el.sceneEl.renderer.xr.addEventListener('sessionstart', async () => {
            const session = this.el.sceneEl.renderer.xr.getSession();
            session.addEventListener('inputsourceschange', () => this.checkInputSources(session));
            this.checkInputSources(session);
            session.addEventListener('select', () => this.tryBuild());
        });
    },
    checkInputSources: async function(session) {
        let sources = Array.from(session.inputSources);
        let targetSource = sources.find(s => s.targetRayMode === 'tracked-pointer' && s.handedness === 'right') || sources.find(s => s.targetRayMode === 'tracked-pointer');
        if (targetSource && this.inputSource !== targetSource) {
            this.inputSource = targetSource;
            this.hitTestSource = await session.requestHitTestSource({ space: targetSource.targetRaySpace });
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
                // Vérification de la surface (doit être horizontale)
                if (new THREE.Vector3(0, 1, 0).applyQuaternion(pose.transform.orientation).y < 0.8) {
                    this.reticle.setAttribute('visible', 'false');
                    this.isHitTestReady = false;
                    return;
                }

                let hitPos = pose.transform.position;

                // NOUVEAU : Calcul de la distance avec la MANETTE
                let rayPose = frame.getPose(this.inputSource.targetRaySpace, refSpace);
                if (rayPose) {
                    let cp = rayPose.transform.position;
                    // Distance en 3D (x, y, z)
                    let distToController = Math.sqrt(Math.pow(cp.x - hitPos.x, 2) + Math.pow(cp.y - hitPos.y, 2) + Math.pow(cp.z - hitPos.z, 2));

                    // Si le curseur est à moins de 20cm (0.2m) de la manette, on annule
                    if (distToController < 0.2) {
                        this.reticle.setAttribute('visible', 'false');
                        this.isHitTestReady = false;
                        return;
                    }
                }

                // Ancienne vérification : Distance avec la CAMERA (tête du joueur)
                let cameraEl = document.querySelector('a-camera');
                let cameraPos = cameraEl ? cameraEl.object3D.position : new THREE.Vector3(0,0,0);
                let dx = cameraPos.x - hitPos.x, dz = cameraPos.z - hitPos.z;

                if (Math.sqrt(dx*dx + dz*dz) > 0.3) {
                    this.reticle.setAttribute('visible', 'true');
                    this.reticle.object3D.position.copy(hitPos);
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
            let towerType = 'basic_turret';
            if (gameSystem && gameSystem.tryBuyTower(TOWER_DATA[towerType].cost)) {
                this.spawnTower(this.reticle.object3D.position, towerType);
            }
        }
    },
    spawnTower: function(pos, towerType) {
        let data = TOWER_DATA[towerType];
        let tower = document.createElement('a-entity');
        let geom = document.createElement('a-entity');
        geom.setAttribute('gltf-model', data.model);
        geom.setAttribute('scale', data.scale);
        geom.setAttribute('position', `0 ${data.offsetY} 0`);
        tower.appendChild(geom);
        tower.setAttribute('tower-logic', `type: ${towerType}`);
        tower.setAttribute('position', pos);
        this.el.sceneEl.appendChild(tower);
    }
});