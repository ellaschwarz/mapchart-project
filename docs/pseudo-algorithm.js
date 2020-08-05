


||==> [Generate configuration] => [Apply configuration] => [Test configuration] ==||
||                                                                                ||
====================================================================================

//Generera en rotation och en position samt datan för landet.
function generateConfiguration() {
    const result = [];

    for (let item of data) {
        const p = selectRandomFromArray(item.positions);
        const r = selectRandomRotation(item.rotations, p);

        result.push({ data: item, position: p, rotation: r });
    }

    return result;
}

//Spara undan den genererade konfigurationen i en array som ett objekt.
function cloneConfiguration(source) {
    const result = [];

    for (let item of source) {
        result.push({ data: item.data, position: item.position, rotation: item.rotation });
    }
    
    return result;
}

//Om det kolliderar anropas denna metod för att rotera och flytta de plottar som har kolliderat.
function permutateConfiguration(configs, boxIndices) {
    const result = cloneConfiguration(configs);
    
    for (let index of boxIndices) {
        const c = result[index];

        c.p = selectRandomFromArray(item.positions);
        c.r = selectRandomRotation(item.rotations, c.p);
    }

    return result;
}

//Tömmer parent elementet och skapar nya boxar baserat på hur många configs som finns.
function applyConfiguration(configs, root) {
    root.innerHTML = "";

    const result = [];
    
    for (let config of configs) {
        const box = document.createElement("div");
        ...

        const p = config.position;
        const r = config.rotation;
        const item = config.data;

        root.appendChild(box);

        result.push(box);
    }
    
    return result;
}

//Hämtar boxarnas boundingRect värde och kontrollerar om boxarna kolliderar.
function computeFitness(boxes) {
    for (let box of boxes) {
        const rect = box.getClientBoundingRect();
        ...
    }

    const collisions = [];
    let fitness = 0;
    // Find collisions and compute fitness...

    return { fitness, collisions };
}

//Skapar en konfiguration, tillämpar nya boxar som den sedan kontrollerar kollision på.
function findBestConfiguration() {
    let best = null;

    let config = generateConfiguration();
    for (let attemptCount = 0; attemptCount < 99; ++attemptCount) {
        const boxes = applyConfiguration(config);

        const r = computeFitness(boxes);

        // r: { fitness, collidingBoxes }

        const fitness = r.fitness;
        const collidingBoxes = r.collisions;

        if (!best || fitness < best.fitness) {
            best = { fitness: fitness, config: config };
        }

        if (fitness === 0) {
            break;
        }

        config = permutateConfiguration(config, collidingBoxes);
    }

    return best.config;
}

applyConfiguration(findBestConfiguration());

class X {
    constructor(data, position, rotation) {
        this.data = data;
        this.position = position;
        this.rotation = rotation;
    }
}
