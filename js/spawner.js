AFRAME.registerComponent('smart-animator', {
    init: function() {
        this.el.addEventListener('model-loaded', () => {
            let mesh = this.el.getObject3D('mesh');
            let stats = this.el.getAttribute('enemy-stats');
            if (mesh && mesh.animations && mesh.animations.length > 0) {
                let anims = mesh.animations.map(a => a.name);
                const findAnim = keyword => {
                    if (!keyword) return anims[0];
                    let found = anims.find(a => a.toLowerCase().includes(keyword.toLowerCase()));
                    return found || anims[0];
                };
                let realWalk = findAnim(stats.walkAnim);
                this.el.setAttribute('enemy-stats', {
                    walkAnim: realWalk, attackAnim: findAnim(stats.attackAnim),
                    hitAnim: findAnim(stats.hitAnim), deathAnim: findAnim(stats.deathAnim)
                });
                this.el.setAttribute('animation-mixer', `clip: ${realWalk}; loop: repeat; crossFadeDuration: 0.2`);
            }
        });
    }
});

AFRAME.registerComponent('mob-sound', {
    schema: { src: { type: 'string' } },
    init: function() {
        this.el.setAttribute('sound', `src: ${this.data.src}; loop: false; volume: 0.2; positional: true; refDistance: 1`);
        this.timer = Math.random() * 3000 + 1000;
    },
    tick: function(time, timeDelta) {
        let stats = this.el.components['enemy-stats'];
        if (stats && stats.isDead) return;

        this.timer -= timeDelta;
        if (this.timer <= 0) {
            if(this.el.components.sound) this.el.components.sound.playSound();
            this.timer = Math.random() * 5000 + 5000;
        }
    }
});

AFRAME.registerComponent('environment-manager', {
    init: function () {
        this.meshes = new Map();
        this.occlusionMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });

        this.obstacleGroup = new THREE.Group();
        this.el.object3D.add(this.obstacleGroup);

        this.el.addEventListener('child-attached', (evt) => {
            let childEl = evt.detail.el;
            setTimeout(() => {
                if (childEl.components && childEl.components['xr-plane'] && childEl.components['xr-plane'].data.orientation === 'horizontal') {
                    childEl.classList.add('climbable');
                    childEl.setAttribute('material', { color: '#00FF00', opacity: 0.3, transparent: true, wireframe: true, side: 'double' });
                    childEl.object3D.visible = true;
                }
            }, 500);
        });
    },
    tick: function () {
        const sceneEl = this.el;
        const frame = sceneEl.frame;
        const renderer = sceneEl.renderer;

        if (!frame || !renderer || !renderer.xr) return;

        const refSpace = renderer.xr.getReferenceSpace();
        if (!refSpace) return;

        if (frame.detectedMeshes) {
            const currentMeshes = frame.detectedMeshes;

            currentMeshes.forEach(xrMesh => {
                let meshObj = this.meshes.get(xrMesh);
                let needsUpdate = false;

                if (!meshObj) {
                    const geometry = new THREE.BufferGeometry();
                    meshObj = new THREE.Mesh(geometry, this.occlusionMaterial);
                    meshObj.renderOrder = -1;

                    this.obstacleGroup.add(meshObj);

                    this.meshes.set(xrMesh, meshObj);
                    needsUpdate = true;
                } else if (meshObj.userData.lastChangedTime !== xrMesh.lastChangedTime) {
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    meshObj.geometry.setAttribute('position', new THREE.BufferAttribute(xrMesh.vertices, 3));
                    meshObj.geometry.setIndex(new THREE.BufferAttribute(xrMesh.indices, 1));
                    meshObj.geometry.computeVertexNormals();
                    meshObj.userData.lastChangedTime = xrMesh.lastChangedTime;
                }

                const pose = frame.getPose(xrMesh.meshSpace, refSpace);
                if (pose) {
                    meshObj.matrix.fromArray(pose.transform.matrix);
                    meshObj.matrixAutoUpdate = false;
                    meshObj.visible = true;
                } else {
                    meshObj.visible = false;
                }
            });

            for (let [xrMesh, meshObj] of this.meshes.entries()) {
                if (!currentMeshes.has(xrMesh)) {
                    this.obstacleGroup.remove(meshObj);
                    meshObj.geometry.dispose();
                    this.meshes.delete(xrMesh);
                }
            }
        }
    }
});

AFRAME.registerComponent('enemy-spawner', {
    // spawnInterval réduit de 2500 à 2200 pour un rythme un peu plus soutenu
    schema: { waveInterval: { type: 'number', default: 5000 }, spawnInterval: { type: 'number', default: 2200 } },
    init: function () {
        if (!this.el.sceneEl.hasAttribute('environment-manager')) this.el.sceneEl.setAttribute('environment-manager', '');
        this.timer = 0; this.waveCount = 1; this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true; this.enemiesPerWave = 5;
    },
    tick: function (time, timeDelta) {
        let gameSystem = this.el.sceneEl.systems['game-manager'];
        if (!gameSystem || gameSystem.gameState !== 'playing') return;

        this.timer += timeDelta;
        if (this.isWaveActive) {
            if (this.timer >= this.data.spawnInterval) {
                this.spawnRandomEnemy();
                this.timer = 0;
                this.enemiesSpawnedInWave++;
                if (this.enemiesSpawnedInWave >= this.enemiesPerWave) { this.isWaveActive = false; this.timer = 0; }
            }
        } else if (this.timer >= this.data.waveInterval) {
            this.startNextWave();
            this.timer = 0;
        }
    },
    startNextWave: function() {
        this.waveCount++;
        // Vague plus dense : +3 ennemis par vague au lieu de +2
        this.enemiesPerWave += 3;
        this.enemiesSpawnedInWave = 0;
        this.isWaveActive = true;

        let hud = document.getElementById('hud-hp');
        if(hud) {
            let oldColor = hud.getAttribute('color');
            hud.setAttribute('color', 'yellow');
            setTimeout(() => hud.setAttribute('color', oldColor), 1000);
        }
    },
    spawnRandomEnemy: function () {
        let rand = Math.random(), type = 'demon';
        if (this.waveCount >= 2 && rand > 0.5) type = 'skeleton';
        if (this.waveCount >= 3 && rand > 0.75) type = 'orc';
        if (this.waveCount >= 4 && rand > 0.9) type = 'dragon';
        this.createEnemy(type);
    },
    createEnemy: function (type) {
        let data = MOB_DATA[type];
        if(!data) return;
        let enemy = document.createElement('a-entity');
        enemy.classList.add('enemy');
        let angle = Math.random() * Math.PI * 2, dist = 4;

        let gameSystem = this.el.sceneEl.systems['game-manager'];
        let baseX = gameSystem ? gameSystem.basePosition.x : 0;
        let baseZ = gameSystem ? gameSystem.basePosition.z : 0;
        enemy.setAttribute('position', { x: baseX + Math.cos(angle) * dist, y: 0.5, z: baseZ + Math.sin(angle) * dist });

        enemy.setAttribute('scale', data.scale);
        enemy.setAttribute('gltf-model', data.model);
        enemy.setAttribute('enemy-stats', {
            hp: data.hp, speed: data.speed, damage: data.damage, reward: data.reward, offsetY: data.offsetY,
            isFlying: data.isFlying, attackAnim: data.attackAnim, walkAnim: data.walkAnim, hitAnim: data.hitAnim, deathAnim: data.deathAnim
        });
        enemy.setAttribute('smart-animator', '');

        let soundId = '#snd-gobelin';
        if (type === 'skeleton') soundId = '#snd-skeleton';
        else if (type === 'orc') soundId = '#snd-orc';
        else if (type === 'dragon') soundId = '#snd-dragon';
        enemy.setAttribute('mob-sound', `src: ${soundId}`);

        let sensor = document.createElement('a-entity');
        sensor.setAttribute('position', '0 2.0 -0.5');
        sensor.setAttribute('raycaster', { objects: '.climbable', direction: {x: 0, y: -1, z: 0}, far: 4, interval: 0 });
        sensor.classList.add('altitude-sensor');
        enemy.appendChild(sensor);
        enemy.setAttribute('enemy-walker', '');
        this.el.sceneEl.appendChild(enemy);
    }
});

AFRAME.registerComponent('enemy-stats', {
    schema: { hp: {default: 1}, speed: {default: 1}, damage: {default: 1}, reward: {default: 10}, offsetY: {default: 0}, isFlying: {default: false}, attackAnim: {default: 'Attack'}, walkAnim: {default: 'Walk'}, hitAnim: {default: 'HitReact'}, deathAnim: {default: 'Death'} },
    init: function() { this.isDead = false; this.isAttacking = false; this.hitTimeout = null; this.isStunned = false; this.stunTimeout = null; },
    takeHit: function(damage = 1) {
        if (this.isDead) return;
        this.data.hp -= damage;
        let el = this.el;
        if (this.data.hp <= 0) {
            this.isDead = true;
            el.setAttribute('animation-mixer', `clip: ${this.data.deathAnim}; loop: once; crossFadeDuration: 0.2; timeScale: 1`);
            let system = this.el.sceneEl.systems['game-manager'];
            if(system) system.addMoney(this.data.reward);
            setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 1500);
        } else if (!this.isAttacking && !this.isStunned) {
            el.setAttribute('animation-mixer', `clip: ${this.data.hitAnim}; loop: once; crossFadeDuration: 0.1`);
            clearTimeout(this.hitTimeout);
            this.hitTimeout = setTimeout(() => {
                if (!this.isDead && !this.isAttacking && !this.isStunned) el.setAttribute('animation-mixer', `clip: ${this.data.walkAnim}; loop: repeat; crossFadeDuration: 0.2`);
            }, 500);
        }
    },
    applyStun: function(duration) {
        if (this.isDead) return;
        this.isStunned = true;
        clearTimeout(this.stunTimeout);
        this.el.setAttribute('animation-mixer', `timeScale: 0`);
        this.stunTimeout = setTimeout(() => {
            this.isStunned = false;
            if (!this.isDead && !this.isAttacking) {
                this.el.setAttribute('animation-mixer', `timeScale: 1; clip: ${this.data.walkAnim}; loop: repeat; crossFadeDuration: 0.2`);
            }
        }, duration);
    }
});

AFRAME.registerComponent('enemy-walker', {
    init: function() {
        this.raycaster = new THREE.Raycaster();
        this.rayOrigin = new THREE.Vector3();
        this.rayDir = new THREE.Vector3();

        this.lastDistToTarget = 9999;
        this.checkStuckTimer = 0;
        this.stuckCounter = 0;
        this.ghostMode = false;
        this.ghostTimer = 0;
    },
    tick: function (time, timeDelta) {
        let stats = this.el.components['enemy-stats'];
        if(!stats || stats.isDead || stats.isAttacking || stats.isStunned) return;

        let pos = this.el.object3D.position;
        let gameSystem = this.el.sceneEl.systems['game-manager'];
        let targetPos = gameSystem ? gameSystem.basePosition : new THREE.Vector3(0,0,0);
        let targetTower = null;

        let shieldTowers = document.querySelectorAll('.shield-tower');
        let minDist = Infinity;

        shieldTowers.forEach(shield => {
            let dist = pos.distanceTo(shield.object3D.position);
            if (dist < 3.0 && dist < minDist) {
                minDist = dist;
                targetTower = shield;
            }
        });

        if (targetTower) {
            targetPos = targetTower.object3D.position;
        }

        let dx = targetPos.x - pos.x;
        let dz = targetPos.z - pos.z;
        let distToTarget = Math.sqrt(dx*dx + dz*dz);

        if (distToTarget < 0.3) {
            stats.isAttacking = true;
            this.el.setAttribute('animation-mixer', `clip: ${stats.data.attackAnim}; loop: once; crossFadeDuration: 0.2`);
            setTimeout(() => {
                if (targetTower) {
                    let tLogic = targetTower.components['tower-logic'];
                    if (tLogic) tLogic.takeDamage(stats.data.damage);
                } else if (gameSystem) {
                    gameSystem.takeDamage(stats.data.damage);
                }
                if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
            }, 1000);
            return;
        }

        this.checkStuckTimer += timeDelta;
        if (this.checkStuckTimer > 1000) {
            if (this.lastDistToTarget - distToTarget < 0.05) {
                this.stuckCounter++;
            } else {
                this.stuckCounter = 0;
            }
            this.lastDistToTarget = distToTarget;
            this.checkStuckTimer = 0;
        }

        if (this.stuckCounter >= 2 && !this.ghostMode) {
            this.ghostMode = true;
            this.ghostTimer = 4000;
            this.stuckCounter = 0;
        }

        if (this.ghostMode) {
            this.ghostTimer -= timeDelta;
            if (this.ghostTimer <= 0) {
                this.ghostMode = false;
            }
        }

        let dirX = dx / distToTarget;
        let dirZ = dz / distToTarget;

        let repX = 0;
        let repZ = 0;
        let speedMultiplier = 1.0;

        if (!stats.data.isFlying) {
            let towers = document.querySelectorAll('[tower-logic]');
            let avoidanceRadius = 0.7;

            towers.forEach(tower => {
                if (tower === targetTower) return;

                let tPos = tower.object3D.position;
                let tDx = pos.x - tPos.x;
                let tDz = pos.z - tPos.z;
                let tDist = Math.sqrt(tDx*tDx + tDz*tDz);

                if (tDist < avoidanceRadius && tDist > 0.01) {
                    let force = Math.pow((avoidanceRadius - tDist) / avoidanceRadius, 2);
                    repX += (tDx / tDist) * force * 4.0;
                    repZ += (tDz / tDist) * force * 4.0;

                    let cross = (dirX * tDz) - (dirZ * tDx);
                    let sign = cross > 0 ? 1 : -1;

                    repX += (-tDz / tDist) * force * 3.0 * sign;
                    repZ += (tDx / tDist) * force * 3.0 * sign;
                    speedMultiplier = 1.5;
                }
            });

            if (!this.ghostMode) {
                let envManager = this.el.sceneEl.components['environment-manager'];
                if (envManager && envManager.obstacleGroup) {
                    this.rayOrigin.copy(pos);
                    this.rayOrigin.y += 0.2;

                    let currentHeadingX = Math.sin(this.el.object3D.rotation.y);
                    let currentHeadingZ = Math.cos(this.el.object3D.rotation.y);

                    this.rayDir.set(currentHeadingX, 0, currentHeadingZ).normalize();
                    this.raycaster.set(this.rayOrigin, this.rayDir);
                    this.raycaster.far = 0.8;

                    let intersects = this.raycaster.intersectObject(envManager.obstacleGroup, true);

                    if (intersects.length > 0) {
                        let hit = intersects[0];
                        if (hit.distance > 0.05 && hit.face) {
                            let force = Math.pow((0.8 - hit.distance) / 0.8, 2) * 6.0;
                            let normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();

                            repX += normal.x * force;
                            repZ += normal.z * force;

                            let cross = (dirX * normal.z) - (dirZ * normal.x);
                            let sign = cross > 0 ? 1 : -1;
                            repX += (-normal.z) * force * 3.0 * sign;
                            repZ += (normal.x) * force * 3.0 * sign;

                            speedMultiplier = 2.5;
                        }
                    }
                }
            } else {
                speedMultiplier = 1.5;
            }
        }

        let finalDirX = dirX + repX;
        let finalDirZ = dirZ + repZ;
        let finalDist = Math.sqrt(finalDirX*finalDirX + finalDirZ*finalDirZ);

        if (finalDist > 0) {
            finalDirX /= finalDist;
            finalDirZ /= finalDist;
        }

        let targetAngle = Math.atan2(finalDirX, finalDirZ);
        let currentAngle = this.el.object3D.rotation.y;
        this.el.object3D.rotation.y += (targetAngle - currentAngle) * 0.2;

        let move = (stats.data.speed * speedMultiplier * timeDelta) / 1000;
        this.el.object3D.position.x += finalDirX * move;
        this.el.object3D.position.z += finalDirZ * move;

        let sensorEl = this.el.querySelector('.altitude-sensor'), floorY = 0;
        if (sensorEl && sensorEl.components.raycaster) {
            let ray = sensorEl.components.raycaster, intersections = ray.intersectedEls;
            if (intersections.length > 0) {
                let hit = ray.getIntersection(intersections[0]);
                if (hit) floorY = hit.point.y;
            }
        }
        let targetY = floorY + stats.data.offsetY;
        this.el.object3D.position.y += (targetY - pos.y) * (targetY > pos.y + 0.1 ? 0.2 : 0.1);
    }
});