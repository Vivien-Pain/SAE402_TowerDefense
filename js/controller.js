AFRAME.registerComponent('tower-menu', {
    init: function() {
        this.towers = Object.keys(TOWER_DATA);
        this.currentIndex = 0;
        this.selectedTower = this.towers[this.currentIndex];

        let menu = document.createElement('a-entity');
        menu.setAttribute('position', '0 0.08 -0.08');
        menu.setAttribute('rotation', '-45 0 0');

        // --- STYLE MÉDIÉVAL ---
        // Bordure Or massif (#d4af37), opacité plus élevée
        this.bgBorder = document.createElement('a-plane');
        this.bgBorder.setAttribute('width', '0.36');
        this.bgBorder.setAttribute('height', '0.25');
        this.bgBorder.setAttribute('color', '#d4af37');
        this.bgBorder.setAttribute('opacity', '0.8');
        menu.appendChild(this.bgBorder);

        // Fond Bois Sombre (#2c1308)
        this.bg = document.createElement('a-plane');
        this.bg.setAttribute('width', '0.34');
        this.bg.setAttribute('height', '0.24');
        this.bg.setAttribute('color', '#2c1308');
        this.bg.setAttribute('opacity', '0.98');
        this.bg.setAttribute('position', '0 0 0.005');
        menu.appendChild(this.bg);
        // -----------------------

        // Conteneur pour la miniature 3D (inchangé)
        this.modelContainer = document.createElement('a-entity');
        this.modelContainer.setAttribute('position', '0 0.05 0.05');
        this.modelContainer.setAttribute('scale', '0.2 0.2 0.2');
        this.modelContainer.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 6000; easing: linear');
        menu.appendChild(this.modelContainer);

        // Nom de la tour : Couleur Parchemin clair (#f4e4bc) pour la lisibilité
        this.nameEl = document.createElement('a-text');
        this.nameEl.setAttribute('align', 'center');
        this.nameEl.setAttribute('width', '1.2');
        this.nameEl.setAttribute('position', '0 -0.03 0.01');
        this.nameEl.setAttribute('color', '#f4e4bc');
        menu.appendChild(this.nameEl);

        // Coût de la tour : Couleur Or (#d4af37)
        this.costEl = document.createElement('a-text');
        this.costEl.setAttribute('align', 'center');
        this.costEl.setAttribute('width', '1.0');
        this.costEl.setAttribute('position', '0 -0.09 0.01');
        this.costEl.setAttribute('color', '#d4af37');
        menu.appendChild(this.costEl);

        this.updateMenu();
        this.el.appendChild(menu);

        this.el.addEventListener('xbuttondown', () => this.cycleTower());
        this.el.addEventListener('ybuttondown', () => this.cycleTower());
    },
    cycleTower: function() {
        this.currentIndex = (this.currentIndex + 1) % this.towers.length;
        this.selectedTower = this.towers[this.currentIndex];
        this.updateMenu();

        let gameSystem = this.el.sceneEl.systems['game-manager'];
        if(gameSystem) gameSystem.selectedTowerType = this.selectedTower;
    },
    updateMenu: function() {
        let data = TOWER_DATA[this.selectedTower];

        this.nameEl.setAttribute('value', data.name);
        this.costEl.setAttribute('value', 'COST : ' + data.cost + ' G');

        while (this.modelContainer.firstChild) {
            this.modelContainer.removeChild(this.modelContainer.firstChild);
        }

        let miniModel = document.createElement('a-entity');
        miniModel.setAttribute('gltf-model', data.model);
        miniModel.setAttribute('scale', data.scale);
        miniModel.setAttribute('position', `0 ${-0.1} 0`);
        this.modelContainer.appendChild(miniModel);
    }
});
// ... le reste du fichier (ar-game-controller) ne change pas ...
AFRAME.registerComponent('ar-game-controller', {
    init: function () {
        this.reticle = document.getElementById('reticle');
        this.ring = this.reticle.querySelector('a-ring');
        this.cylinder = this.reticle.querySelector('a-cylinder');

        this.hitTestSource = null;
        this.inputSource = null;
        this.isValidPlacement = false;

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

                if (new THREE.Vector3(0, 1, 0).applyQuaternion(pose.transform.orientation).y < 0.8) {
                    this.reticle.setAttribute('visible', 'false');
                    this.isValidPlacement = false;
                    return;
                }

                let hitPos = pose.transform.position;

                this.reticle.setAttribute('visible', 'true');
                this.reticle.object3D.position.copy(hitPos);
                this.reticle.object3D.quaternion.identity();

                let isValid = true;

                let rayPose = frame.getPose(this.inputSource.targetRaySpace, refSpace);
                if (rayPose) {
                    let cp = rayPose.transform.position;
                    let distToController = Math.sqrt(Math.pow(cp.x - hitPos.x, 2) + Math.pow(cp.y - hitPos.y, 2) + Math.pow(cp.z - hitPos.z, 2));
                    if (distToController < 0.35) {
                        isValid = false;
                    }
                }

                let cameraEl = document.querySelector('a-camera');
                if (cameraEl) {
                    let camPos = cameraEl.object3D.position;
                    let distToCam = Math.sqrt(Math.pow(camPos.x - hitPos.x, 2) + Math.pow(camPos.z - hitPos.z, 2));
                    if (distToCam < 0.4) {
                        isValid = false;
                    }
                }

                let gameSystem = this.el.sceneEl.systems['game-manager'];

                if (gameSystem && gameSystem.gameState === 'playing') {
                    let basePos = gameSystem.basePosition;
                    let distToBase = Math.sqrt(Math.pow(basePos.x - hitPos.x, 2) + Math.pow(basePos.z - hitPos.z, 2));
                    if (distToBase < 0.6) {
                        isValid = false;
                    }

                    if (isValid) {
                        let towers = document.querySelectorAll('[tower-logic]');
                        for (let i = 0; i < towers.length; i++) {
                            let tPos = towers[i].object3D.position;
                            let distToTower = Math.sqrt(Math.pow(tPos.x - hitPos.x, 2) + Math.pow(tPos.z - hitPos.z, 2));
                            if (distToTower < 0.5) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }

                this.isValidPlacement = isValid;

                let color = isValid ? '#00FF00' : '#FF0000';
                if (this.ring) this.ring.setAttribute('color', color);
                if (this.cylinder) this.cylinder.setAttribute('color', color);

                return;
            }
        }

        this.reticle.setAttribute('visible', 'false');
        this.isValidPlacement = false;
    },
    tryBuild: function() {
        if (this.reticle.getAttribute('visible') === true && this.isValidPlacement) {
            let gameSystem = this.el.sceneEl.systems['game-manager'];
            if (!gameSystem) return;

            if (gameSystem.gameState === 'placing_base') {
                this.spawnBase(this.reticle.object3D.position);
                gameSystem.setBasePosition(this.reticle.object3D.position);
            }
            else if (gameSystem.gameState === 'playing') {
                let towerType = gameSystem.selectedTowerType;
                if (gameSystem.tryBuyTower(TOWER_DATA[towerType].cost)) {
                    this.spawnTower(this.reticle.object3D.position, towerType);
                }
            }
        }
    },
    spawnBase: function(pos) {
        let base = document.createElement('a-entity');
        base.setAttribute('geometry', 'primitive: octahedron; radius: 0.4');
        base.setAttribute('material', 'color: #00ffff; metalness: 0.8; roughness: 0.2');
        base.setAttribute('position', {x: pos.x, y: pos.y + 0.5, z: pos.z});
        base.setAttribute('animation__rot', 'property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear');
        base.setAttribute('animation__bob', 'property: position; dir: alternate; dur: 2000; easing: easeInOutSine; to: ' + pos.x + ' ' + (pos.y + 0.7) + ' ' + pos.z);
        base.setAttribute('id', 'player-base');
        this.el.sceneEl.appendChild(base);
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