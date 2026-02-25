const TOWER_DATA = {
    'basic_turret': {
        name: 'Basic Turret',
        cost: 50,
        model: '#model-turret',
        scale: '0.4 0.4 0.4',
        offsetY: 0.0,
        fireRate: 2500,
        range: 5,
        damage: 1,
        upgrades: [
            { cost: 40, damage: 2, fireRate: 2000 },
            { cost: 80, damage: 4, fireRate: 1500 }
        ]
    },
    'lighting_turret': {
        name: 'Lighting Turret',
        cost: 75,
        model: '#model-lighting',
        scale: '0.15 0.15 0.15',
        offsetY: 0.0,
        fireRate: 1500,
        range: 4,
        damage: 0.5,
        stunDuration: 1000,
        upgrades: [
            { cost: 60, damage: 1.0, fireRate: 1200, stunDuration: 1500 },
            { cost: 120, damage: 2.0, fireRate: 900, stunDuration: 2000 }
        ]
    },
    'shield_turret': {
        name: 'Shield Turret',
        cost: 100,
        model: '#model-shield',
        scale: '0.2 0.2 0.2',
        offsetY: 0.0,
        hp: 20,
        upgrades: [
            { cost: 80, hpBonus: 20 },
            { cost: 150, hpBonus: 40 }
        ]
    }
};