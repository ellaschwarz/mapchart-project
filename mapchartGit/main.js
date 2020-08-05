import { countries } from './countries.js';

class MapChartConfiguration {
    constructor(countryCodeSelector, valueSelector) {
        this.countryCodeSelector = countryCodeSelector;
        this.valueSelector = valueSelector;
    }
}

function plotMapChart(element, config, data) {
    if (!element || !(element instanceof HTMLElement)) {
        throw new Error('elem must be provided and be an HTML element');
    }
    if (!config) {
        throw new Error('config has not been provided');
    }
    if (!(config.countryCodeSelector instanceof Function)) {
        throw new Error('config must have field countryCodeSelector of type Function');
    }
    if (!(config.valueSelector instanceof Function)) {
        throw new Error('config must have field valueSelector of type Function');
    }
    if (!data || !Array.isArray(data)) {
        throw new Error('data must be provided and be an Array');
    }

    element.setAttribute('id', 'overlay');

    const countryExsists = [];

    //Checks if country already exsists in array to avoid duplicate plots.
    function containsDuplicate(countryExsists) {
        for (let i = 0; i < countryExsists.length; ++i) {
            for (let j = 0; j < i; ++j) {
                if (countryExsists[i].code == countryExsists[j].code || countryExsists[i].name == countryExsists[j].name) {
                    return true;
                }
            }
        }
        return false;
    }

    //Filtering data and error handling if input data contains unsupported countries.
    for (let item of data) {
        let countryFromUser = config.countryCodeSelector(item).toLowerCase();
        let filterResult = countries.find(({ code, name }) => code === countryFromUser || name === countryFromUser);

        if (filterResult !== undefined) {
            configPlot.continentArray.push(filterResult.continent);
            countryExsists.push({ 'code': filterResult.code, 'name': filterResult.name });
        } else {
            console.warn(`Sorry, the system do not have support for this country (${countryFromUser}).`);
            alert(`Sorry, the system do not have support for this country  (${countryFromUser}).`);
        }
    }

    //Error handling for duplcates
    if (containsDuplicate(countryExsists)) {
        console.warn('Found duplicate of a country ');
        alert('Found duplicate of a country ');
    } else {
            configPlot.applyConfiguration(configPlot.findBestConfiguration(element), element);
            configPlot.img_container.style.transform = 'scale(0.8)';
        
        window.setTimeout(function() {
            configPlot.img_container.style.transition = '3s';
            configPlot.zoomMap();
          }, 500);
    }

}

class PlotConfiguration {
    constructor(coordinates, rotation) {

        this.coordinates = coordinates;
        this.rotation = rotation;
        this.continentArray = [];
        this.collisions = [];
        this.boxPosition = [];
        this.boxes = [];
        this.img_container;
        this.wrapper;
        this.overlay;
    }

    //Generates rotation, position and data for the country.
    generateConfiguration() {
        const result = [];

        for (let item of data) {

            const countryData = config.countryCodeSelector(item).toLowerCase();
            const v = config.valueSelector(item);

            let filterData = countries.find(({ code, name }) => code === countryData || name === countryData);

            let coords = filterData.coordinates;

            const p = this.coordinates(coords);
            const r = this.rotation(p);
            //console.log(r);
            result.push({ data: filterData, position: p, rotation: r.rotation, value: v, tailSize: r.tailSize });
        }
        return result;
    }

    //Saves generated configurations and returns them in a array.
    cloneConfiguration(source) {
        const result = [];

        for (let item of source) {

            result.push({ data: item.data, position: item.position, rotation: item.rotation, value: item.value, tailSize: item.tailSize });
        }

        return result;
    }

    //If collision, this method is invoked to change configuration
    permutateConfiguration(configs, boxIndices) {

        for (let index of boxIndices) {
            const c = configs[index];

            c.position = this.coordinates(c.data.coordinates);
            let r = this.rotation(c.position);
            c.rotation = r.rotation;
            c.tailSize = r.tailSize;
        }

        return configs;
    }

    //Empty parent element and creates the map and new plots based on the number of countries 
    applyConfiguration(configs, element) {

        this.overlay = element;
        this.overlay.innerHTML = "";
        this.overlay.setAttribute('id', 'overlay');

        this.img_container = document.createElement('div');
        this.img_container.setAttribute('class', 'img_container');

        this.wrapper = document.createElement('div');
        this.wrapper.setAttribute('id', 'wrapper');

        const img = document.createElement('img');
        img.setAttribute('class', 'worldmap');
        img.src = '../public/images/worldmap.png';
        this.img_container.appendChild(this.wrapper);
        this.img_container.appendChild(img);

        this.overlay.appendChild(this.img_container);

        const result = [];

        for (let config of configs) {

            const box = document.createElement("div");
            box.setAttribute('class', 'box');
            const boxTail = document.createElement('div');
            boxTail.id = config.data.code;
            boxTail.name = config.data.name;
            boxTail.setAttribute('class', `boxTail ${config.data.continent}`);

            const boxBody = document.createElement('div');
            boxBody.setAttribute('class', 'boxBody');

            const boxText = document.createElement('div');
            boxText.setAttribute('class', 'boxText');
            let text = document.createTextNode(config.data.name.toUpperCase());
            boxText.appendChild(text);

            const boxValue = document.createElement('div');
            boxValue.setAttribute('class', 'boxValue');

            if ((config.value instanceof HTMLElement)) {
                boxValue.appendChild(config.value);
                let customHtml = boxValue.children[0];
                customHtml.style.maxWidth = '100%';
                customHtml.style.margin = 'auto';
            } else {
                boxValue.innerHTML = config.value;
            }

            boxBody.append(boxText, boxValue);

            const p = config.position;
            const r = config.rotation;
            const item = config.data;
            const tailSize = config.tailSize;

            boxTail.appendChild(boxBody);
            box.appendChild(boxTail);

            this.img_container.appendChild(box);
            this.addPlotStyle(boxTail, r, p, tailSize);
            this.addPlotColor(boxTail);

            this.boxes.push({ data: item, element: boxTail });

            result.push(box);
        }

        return result;
    }

    //Calculates the fitness score and collisions based on clientBoudingRect of plots and map.
    computeFitness(boxes) {

        const allCollisions = [];
        let fitness = 0;
        let viewportOverlapX = 0;
        let viewportOverlapWidth = 0;
        let viewportOverlapY = 0;
        let viewportOverlapYHeight = 0;
        let collision = false;

        let map = this.getPosition(this.overlay);

        this.boxPosition.splice(0, this.boxPosition.length);

        for (let box of boxes) {
            let boxTail = box.children[0];
            let boxText = boxTail.children[0];

            this.boxPosition.push({ tail: this.getPosition(boxTail), tailChild: this.getPosition(boxText), name: box.innerText });
        }

        // Find collisions and compute fitness.
        for (let a = 0; a <= boxes.length; a++) {
            for (let b = a + 1; b < boxes.length; b++) {

                let index = this.boxPosition.indexOf(this.boxPosition[a]);
                let index2 = this.boxPosition.indexOf(this.boxPosition[b]);
                let tailA = this.boxPosition[a].tail;
                let bodyA = this.boxPosition[a].tailChild;
                let tailB = this.boxPosition[b].tail;
                let bodyB = this.boxPosition[b].tailChild;

                //Calculate the percentual overlap if tails collide
                let tailOverlap = Math.max(0, Math.min((tailA.x + tailA.width),
                    (tailB.x + tailB.width)) - Math.max(tailA.x,
                        tailB.x)) * Math.max(0, Math.min((tailA.y + tailA.height),
                            (tailB.y + tailB.height)) - Math.max(tailA.y, tailB.y));

                let tailOverlapPercent = Math.round((tailOverlap /  Math.min((bodyA.height * bodyA.width), (bodyB.height * bodyB.width))) * 100);
                
                console.log(tailA);
                console.log(tailB);
                console.log(tailOverlap);
                console.log(Math.min((tailA.height * tailA.width), (tailB.height * tailB.width)));

                //Calculate the percentual overlap if bodies collide
                let bodyOverlap = Math.max(0, Math.min((bodyA.x + bodyA.width),
                    (bodyB.x + bodyB.width)) - Math.max(bodyA.x,
                        bodyB.x)) * Math.max(0, Math.min((bodyA.y + bodyA.height),
                            (bodyB.y + bodyB.height)) - Math.max(bodyA.y,
                                bodyB.y));

                let bodyOverlapPercent = Math.round((bodyOverlap / Math.min((bodyA.height * bodyA.width), (bodyB.height * bodyB.width))) * 100);

                //Calculate the percental overlap if tail A collide with boxbody B OR if tail B collide with boxbody A
                let bodyTailOverlap = (Math.max(0, Math.min((tailA.x + tailA.width),
                    (bodyB.x + bodyB.width)) - Math.max(tailA.x, bodyB.x)) * Math.max(0, Math.min((tailA.y + tailA.height),
                        (bodyB.y + bodyB.height)) - Math.max(tailA.y, bodyB.y))) + (Math.max(0, Math.min((tailB.x + tailB.width),
                            (bodyA.x + bodyA.width)) - Math.max(tailB.x, bodyA.x)) * Math.max(0, Math.min((tailB.y + tailB.height),
                                (bodyA.y + bodyA.height)) - Math.max(tailB.y, bodyA.y)));

                let bodyTailOverlapPercent = Math.round((bodyTailOverlap / Math.min((bodyA.height * bodyA.width), (bodyB.height * bodyB.width))) * 100);

                if (tailOverlapPercent > 0 || bodyOverlapPercent > 0 || bodyTailOverlapPercent > 0) {
                    allCollisions.push(index, index2);
                    fitness += tailOverlapPercent + bodyOverlapPercent + bodyTailOverlapPercent;
                }
            }
        }

        //Find and compute overlap outside of viewport
        for (let box of this.boxPosition) {
            let plotBody = box.tailChild;
            let index = this.boxPosition.indexOf(box);

            if (plotBody.x < map.x) {
                viewportOverlapX = Math.round((((map.x - plotBody.x) * plotBody.height) / (plotBody.width * plotBody.height)) * 100);
                collision = true;
            }
            if (plotBody.x + plotBody.width > map.x + map.width) {
                viewportOverlapWidth = Math.round(((((plotBody.x + plotBody.width) - (map.x + map.width)) * plotBody.height) / (plotBody.width * plotBody.height)) * 100);
                collision = true;
            }
            if (plotBody.y < map.y) {
                viewportOverlapY = Math.round((((map.y - plotBody.y) * plotBody.width) / (plotBody.width * plotBody.height)) * 100);
                collision = true;
            }
            if (plotBody.y + plotBody.height > map.y + map.height) {
                viewportOverlapYHeight = Math.round(((((plotBody.y + plotBody.height) - (map.y + map.height)) * plotBody.width) / (plotBody.width * plotBody.height)) * 100);
                collision = true;
            }

            if (collision) {
                allCollisions.push(index);
            }
        }

        //Add fitness score
        fitness += viewportOverlapX + viewportOverlapWidth + viewportOverlapY + viewportOverlapYHeight;

        //Filter duplicated collisions
        const uniqueCollisions = new Set(allCollisions);
        this.collisions = [...uniqueCollisions];

        return { fitness, collisions: this.collisions };
    }

    //Creates a configurations and applies new plots until a zero collision configuration is found.
    //If zero collisions can't be found, it applies the configurations with the lowest score.
    findBestConfiguration(content) {
        let best = null;
        let storedConfigs = {};
        let config = this.generateConfiguration();

        for (let attemptCount = 0; attemptCount < 200; ++attemptCount) {

            const boxes = this.applyConfiguration(config, content);

            const fit = this.computeFitness(boxes);
            
            const fitness = fit.fitness;

            const collidingBoxes = fit.collisions;

            if (!best || fitness < best.fitness) {
                const cloneResult = this.cloneConfiguration(config);
                best = { fitness: fitness, config: cloneResult };
                storedConfigs.config = cloneResult;
            }

            if (fitness === 0) {
                break;
            }

            while (true) {
                config = this.permutateConfiguration(config, collidingBoxes);
                const configKey = JSON.stringify(config);
                if (!(configKey in storedConfigs)) {
                    storedConfigs[configKey] = 1;
                    break;
                }
            }
        }
        return best.config;
    }

    //Generates a random plot rotation
    getRandomRotation(rotations) {
        let i, rand, min, max, i2, choice;

        rand = Math.floor(Math.random() * 100);
        choice = -1;

        for (i = 0; i < rotations.length; i++) {

            if (i === 0) {
                min = 0;
            } else {
                min = 0;
                for (i2 = 0; i2 < i; i2++) {
                    min += rotations[i2][0];
                }
                min++;
            }

            if (i === 0) {
                max = rotations[i][0];
            } else {
                max = 0;
                for (i2 = 0; i2 < i + 1; i2++) {
                    max += rotations[i2][0];
                }
            }

            if (rand >= min && rand <= max) {
                choice = i;
                break;
            }
        }
        return rotations[choice][1];
    };

    //Generates a random tail size if a collision has been detected
    getRandomTailSize() {
        const tailSizes = [30, 40, 50, 60, 70, 80, 90, 100];

        const getRandomTailSize = tailSizes[Math.floor(Math.random() * tailSizes.length)];

        return getRandomTailSize;
    }

    //Method to zoom map based on number of continents in dataset.
    zoomMap() {
        let plotScale = null;

        const uniqueContinents = new Set(this.continentArray);
        const continents = [...uniqueContinents];

        if (continents.length === 2) {
            plotScale = .75;
        } else if (continents.length === 1) {
            plotScale = .45;
        }

        if (continents.length > 2) {
            this.img_container.style.transform = 'none';
        } else if (continents.length < 3) {
            if (continents.includes('Europe')) {
                this.img_container.style.transform = 'scale(2.4) translate(-23px, 100px)';
                if (continents.includes('South America')) {
                    this.img_container.style.transform = 'scale(1.1) translate(-110px, -30px)';
                } if (continents.includes('North America')) {
                    this.img_container.style.transform = 'scale(1.35) translate(140px, 100px)';
                } if (continents.includes('Asia')) {
                    this.img_container.style.transform = 'scale(1.4) translate(-200px, 50px)';
                } if (continents.includes('Oceania')) {
                    this.img_container.style.transform = 'scale(1.2) translate(-180px, 10px)';
                } if (continents.includes('Africa')) {
                    this.img_container.style.transform = 'scale(1.38) translate(-50px, 5px)';
                }
            } else if (continents.includes('South America')) {
                this.img_container.style.transform = 'scale(2.2) translate(180px, -120px)';
                if (continents.includes('North America')) {
                    this.img_container.style.transform = 'scale(1.15) translate(300px, 0px)';
                } if (continents.includes('Asia') || continents.includes('Oceania')) {
                    this.img_container.style.transform = 'none';
                } if (continents.includes('Africa')) {
                    this.img_container.style.transform = 'scale(1.7) translate(100px, -85px)';
                }
            } else if (continents.includes('North America')) {
                this.img_container.style.transform = 'scale(1.7) translate(300px, 80px)';
                if (continents.includes('Asia') || continents.includes('Oceania')) {
                    this.img_container.style.transform = 'none';
                } if (continents.includes('Africa')) {
                    this.img_container.style.transform = 'scale(1.2) translate(150px, 30px)';
                }
            } else if (continents.includes('Asia')) {
                this.img_container.style.transform = 'scale(1.6) translate(-180px, 60px)';
                if (continents.includes('Oceania')) {
                    this.img_container.style.transform = 'scale(1.2) translate(-230px, 0px)';
                } if (continents.includes('Africa')) {
                    this.img_container.style.transform = 'scale(1.3) translate(-150px, 20px)';
                }
            } else if (continents.includes('Oceania')) {
                this.img_container.style.transform = 'scale(2.1) translate(-270px, -100px)';
                if (continents.includes('Africa')) {
                    this.img_container.style.transform = 'scale(1.5) translate(-170px, -100px)';
                }
            } else if (continents.includes('Africa')) {
                this.img_container.style.transform = 'scale(2.0) translate(0px, -50px)';
            }
        }
        return { plotScale: plotScale};
    }

    //Adds styling to plots with rotation, position and size.
    addPlotStyle(boxTail, randomRotation, position, tailSize) {

        var boxRotation;
        let zoom = this.zoomMap();

        if (zoom.plotScale !== null) {
            boxRotation = `transform: scale(${zoom.plotScale}) rotate(${randomRotation}deg); transform-origin: top left;`;
        } else {
            boxRotation = `transform: rotate(${randomRotation}deg); transform-origin: top left;`;
        }

        let y = `top: ${position.coord_y}px;`;
        let x = `left: ${position.coord_x}px;`;

        var tailLength = `border-width: 3px ${tailSize}px 3px 0;`;
        var boxBodyMargin = `margin-left: ${tailSize}px;`;

        boxTail.style = boxRotation + y + x + tailLength;

        if (randomRotation == 180) {
            let boxBodyTransform = 'transform: rotate(-180deg);';
            boxTail.children[0].style = boxBodyTransform + boxBodyMargin;
        } else {
            boxTail.children[0].style = boxBodyMargin;
        }

        return boxTail;
    }

    //Adds color to plot based on continent
    addPlotColor(boxTail) {
        let boxText = boxTail.children[0];

        if (boxTail.className === 'boxTail Africa') {
            boxTail.style.borderColor = 'transparent #834B4D';
            boxText.style.backgroundColor = '#834B4D';
        } else if (boxTail.className === 'boxTail Asia') {
            boxTail.style.borderColor = 'transparent #5DA19E';
            boxText.style.backgroundColor = '#5DA19E';
        } else if (boxTail.className === 'boxTail Europe') {
            boxTail.style.borderColor = 'transparent #B96E71';
            boxText.style.backgroundColor = '#B96E71';
        } else if (boxTail.className === 'boxTail North America') {
            boxTail.style.borderColor = 'transparent #0B1E41';
            boxText.style.backgroundColor = '#0B1E41';
        } else if (boxTail.className === 'boxTail Oceania') {
            boxTail.style.borderColor = 'transparent #3B6A68';
            boxText.style.backgroundColor = '#3B6A68';
        } else if (boxTail.className === 'boxTail South America') {
            boxTail.style.borderColor = 'transparent #A3C9C9';
            boxText.style.backgroundColor = '#A3C9C9';
        }
    };

    getPosition(div) {
        return {
            x: div.getBoundingClientRect().left,
            y: div.getBoundingClientRect().top,
            width: div.getBoundingClientRect().width,
            height: div.getBoundingClientRect().height,
            bottom: div.getBoundingClientRect().bottom
        };
    }
}

//Generates new configuration.
const configPlot = new PlotConfiguration(
    /*configPlot.coordinates*/function (coords) {
        let n = 1;
        let randomCoordinate = coords.sort(() => Math.random() - Math.random()).slice(0, n);
        let coord_y = randomCoordinate[0].y;
        let coord_x = randomCoordinate[0].x;

        return { coord_y, coord_x };
    },
    /*configPlot.rotation*/function (coords) {

        if (coords.coord_x < 461.65) {

            let rotations = [
                [20, 0], [80, 180]
            ];
            let rotation = configPlot.getRandomRotation(rotations);

            if (this.collisions.length === 0) {
                let tail = 50;
                return { rotation: rotation, tailSize: tail };
            } else {
                let tail = this.getRandomTailSize();
                return { rotation: rotation, tailSize: tail };
            }

        } else if (coords.coord_x > 461.65) {

            let rotations = [
                [80, 0], [20, 180]
            ];
            let rotation = configPlot.getRandomRotation(rotations);

            if (this.collisions.length === 0) {
                let tail = 50;
                return { rotation: rotation, tailSize: tail };
            } else {
                let tail = this.getRandomTailSize();
                return { rotation: rotation, tailSize: tail };
            }
        }

    });

/* --------------------------------------------------------------------------------------------------------- */
let img = document.createElement('img');
img.src = '../public/images/piechart.png';

let img2 = document.createElement('img');
img2.src = '../public/images/ee9076e3cf70dfc756445b56716b9140-three-parts-pie-chart-by-vexels.png';

let img3 = document.createElement('img');
img3.src = '../public/images/617e25c481c3d5c6d536ad89260c99f7-flat-colorful-pie-chart-by-vexels.png';


// Example usage:
const data = [{ x: 'sweden', y: img }, { x: 'denmark', y: img3 },  { x: 'italy', y: img2 }];

const config = new MapChartConfiguration(
    /*countryCode*/function (item) { return item.x; },
    /*countryMetric*/function (item) { return item.y; });

window.onload = function () {
    const content = document.getElementById('content');
    plotMapChart(content, config, data);



    //Temporary calculator for pixel coordinates
    $('#overlay').bind('click', function (ev) {
        var $div = $(ev.target);
        var $worldmap = $div.find('#overlay');


        var offset = $div.offset();
        var x = ev.clientX - offset.left;
        var y = ev.clientY - offset.top;

        console.log('x: ' + x + ', y: ' + y);
    });
};