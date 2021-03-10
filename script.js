//отримання пікселя по за координатами
ImageData.prototype.getPixel = function (x, y) {
    var i = (x + y * this.width) * 4;
    return {
        R: this.data[i],
        G: this.data[i + 1],
        B: this.data[i + 2],
        A: this.data[i + 3]
    }
}

//втановлення піксеня за координатами
ImageData.prototype.setPixel = function (x, y, c) {
    var i = (x + y * this.width) * 4;
    this.data[i] = c.R;
    this.data[i + 1] = c.G;
    this.data[i + 2] = c.B;
    this.data[i + 3] = c.A;
}

//дистанція Хеммінга
function hemmingDistance(a, b) {
    var dist = 0;
    if (a.length != b.length) throw ("Invalid arguments");
    for (var o = 0; o < a.length; o++) {
        if (a[o] != b[o]) { dist++; }
    }
    return dist;
}

//середнє значення компонент пікселя
function avg(pixel) {
    return Math.round((pixel.R + pixel.G + pixel.B) / 3);
}

function luminosity(pixel) {
    return Math.round(0.21 * pixel.R + 0.72 * pixel.G + 0.07 * pixel.B);
}

//Критерій Кульбака
function KFE(distance, c) {
    var k1 = 0;
    var k2 = 0;
    var rowNumber = distance[0].length;
    for (var r = 0; r < rowNumber; r++) {
        if (distance[0][r] <= c) k1++;
        if (distance[1][r] <= c) k2++;
    }
    var td1 = k1 / rowNumber;
    var tbetta = 3 / rowNumber;
    var d1b = td1 - tbetta;
    var kfe = d1b * Math.log((1 + d1b + 0.1) / (1 - d1b + 0.1)) / Math.log(2);
    return { td1, tbetta, kfe };
}

function calculateRadius(items, delta) {

    items.forEach(currentItem=> {
        
        let trainingResult = currentItem.trainingResults[delta];
        var distance = new Array();//кодова відстань
        distance.push(new Array());
        distance.push(new Array());
        for (var r = 0; r < currentItem.binMatrix.length; r++) {
            distance[0][r] = 0;
            distance[1][r] = 0;
            for (var c = 0; c < currentItem.binMatrix[r].length; c++) {
                distance[0][r] += Math.abs(currentItem.etalon[c] - currentItem.binMatrix[c][r]);
                distance[1][r] += Math.abs(currentItem.etalon[c] - items[trainingResult.neighbour].binMatrix[c][r]);
            }
        }

        for (var c = 0; c < currentItem.binMatrix[0].length; c++) {
            var kfeRes = KFE(distance, c);

            var kfe = kfeRes.kfe;
            var td1 = kfeRes.td1;
            var tbetta = kfeRes.tbetta;

            if (kfe > trainingResult.no_rab_obl_max_KFE) {
                trainingResult.no_rab_obl_max_KFE = kfe;
                trainingResult.no_rab_obl_Radius = c;
                trainingResult.no_rab_obl_dostovirn_D1 = td1;
                trainingResult.no_rab_pomylka_betta = tbetta;;
            }
            if (td1 >= 0.5 && tbetta < 0.5 && c < trainingResult.distanceToNeighbour) {
                if (kfe > trainingResult.maxKFE) {
                    trainingResult.maxKFE = kfe;
                    trainingResult.radius = c;
                    trainingResult.dostovirn_D1 = td1;
                    trainingResult.pomylka_betta = tbetta;
                }
            }
        }
    });
}

function caclulateDistanceToNeighbours(items, delta) {
    for (var i = 0; i < items.length; i++) {
        var currentItem = items[i];
        let result = new trainingResult();
        for (var j = 0; j < items.length; j++) {
            if (i == j) continue;
            let neighbour = items[j];
            let distance = hemmingDistance(currentItem.etalon, neighbour.etalon);
            if (distance <= result.distanceToNeighbour) {
                result.neighbour = j;
                result.distanceToNeighbour = distance;
            }
        }

        currentItem.trainingResults[delta] = result;
    }
}

//Інтерфейс програми
var app = new Vue({

    el: '#app',
    data: {
        activeItem: 'setup', // закладка
        method: 'm_avg',        // алгоритм побудови матриці зображення
        delta: 5,              // початкове значення Delta
        items: [],              // массив класів розпізнавання
        trainingComlete: false, // тренування завершене, система готова до екзамену
        blockSize: 50,
        optimalDelta: 0,
        maxEm: 0
    },
    methods: {
        //Побудова матриць
        buildMatrix: function () {
            var canvases = this.$el.querySelectorAll('canvas.training');
            for (var c = 0; c < canvases.length; c++) {
                var canvas = canvases[c];
                var context = canvas.getContext("2d");
                var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                var i = this.items[c];
                i.reset();
                i.trainingResults = new Array(this.delta);
                i.buildMatrix(imageData, this.method);
            }
        },
        //навчання
        train: function () {
            this.trainingComlete = false;
            for (let delta = 0; delta < this.delta; delta++) {
                for (var i = 0; i < this.items.length; i++) {
                    this.items[i].calculateCenter(delta);
                    this.items[i].buildBinaryMatrix(delta)
                }
                caclulateDistanceToNeighbours(this.items, delta);
                calculateRadius(this.items, delta);
            }

            var emAvg = 0;
            for (let delta = 0; delta < this.delta; delta++) {
                this.items.forEach(item => {
                    if (item.trainingResults[delta].radius == 0)
                        emAvg += item.trainingResults[delta].no_rab_obl_dostovirn_D1;
                    else
                        emAvg += item.trainingResults[delta].maxKFE;
                });

                emAvg = Math.round(emAvg / this.items.length);
                if (emAvg > this.maxEm) {
                    this.maxEm = emAvg;
                    this.optimalDelta = delta;
                }

            }

            this.items.forEach(item => {
                item.calculateCenter(this.optimalDelta);
                item.buildBinaryMatrix(this.optimalDelta);
            });

            this.trainingComlete = true;
        },
        //вибір базового зображення
        addMap: function (event) {
            if (event.target.files.length > 0) {
                for (var i = 0; i < event.target.files.length; i++) {
                    var fr = new FileReader();
                    fr.fileName = event.target.files[i].name;

                    fr.onload = function (e) {
                        var img = new Image();
                        img.onload = function () {

                            var c = document.getElementById('source');
                            var w = Math.round(this.width / app.blockSize) * app.blockSize;
                            var h = Math.round(this.height / app.blockSize) * app.blockSize;
                            c.width = w;
                            c.height = h;
                            var ctx = c.getContext("2d");
                            ctx.drawImage(this, 0, 0, w, h);
                            app.setupOverlay(w, h);
                            initExamCanvas();
                        }
                        img.src = fr.result;
                    }
                    fr.readAsDataURL(event.target.files[i]);
                }
            }
        },
        exam: function () {
            fullExam(this.items, this.method);
        },
        isActive(menuItem) {
            return this.activeItem === menuItem
        },
        setActive(menuItem) {
            this.activeItem = menuItem
        },
        reset: function () {
            resetExam()
        },
        //вибір зображення для класу розпізнавання (setup)
        setupOverlay: function (width, height) {
            //Canvas
            const canvas = document.createElement('canvas');
            canvas.setAttribute("id", "overlay");
            canvas.setAttribute("width", width);
            canvas.setAttribute("height", height);
            document.getElementById('map-container').appendChild(canvas);
            const ctx = canvas.getContext('2d');
            //Variables
            let last_mousex = -1;
            let last_mousey = -1;
            let mousex = -1;
            let mousey = -1;
            let mousedown = false;

            //Mousedowjn
            canvas.onmousedown = (ev) => {
                let canvasx = ev.target.offsetLeft;
                let canvasy = ev.target.offsetTop;

                var clientX = ev.clientX;
                var clientY = ev.clientY;

                last_mousex = parseInt(clientX - canvasx);
                last_mousey = parseInt(clientY - canvasy);
                console.log({ last_mousex, last_mousey });
                mousedown = true;
            };

            //Mouseup
            canvas.onmouseup = (ev) => {

                var size = app.blockSize;
                var sourceCanvas = document.getElementById('source');
                var sourceContext = sourceCanvas.getContext("2d");

                let canvasx = ev.target.offsetLeft;
                let canvasy = ev.target.offsetTop;
                var clientX = ev.pageX;
                var clientY = ev.pageY;
                mousex = parseInt(clientX - canvasx);
                mousey = parseInt(clientY - canvasy);

                var sourceCanvas = document.getElementById('source');
                var sourceContext = sourceCanvas.getContext("2d");
                var sourceImageData = sourceContext.getImageData(mousex - size / 2, mousey - size / 2, size, size);

                var c = document.createElement("canvas");
                c.className = "training";
                c.width = app.blockSize;
                c.height = app.blockSize;

                var context = c.getContext("2d");
                context.putImageData(sourceImageData, 0, 0);
                document.getElementById('training-set').appendChild(c);

                var preview = document.createElement("canvas");
                preview.className = "preview";
                preview.width = app.blockSize;
                preview.height = app.blockSize;
                preview.onclick = (e) => download(e);

                var previewContext = preview.getContext("2d");
                previewContext.putImageData(sourceImageData, 0, 0);
                document.getElementById('preview').appendChild(preview);
                app.items.push(new item());
            }

            //Mousemove
            canvas.onmousemove = (ev) => {

                let canvasx = ev.target.offsetLeft;
                let canvasy = ev.target.offsetTop;
                let clientX = ev.pageX;
                let clientY = ev.pageY;

                mousex = parseInt(clientX - canvasx);
                mousey = parseInt(clientY - canvasy);
                let size = app.blockSize;
                ctx.clearRect(-1, 0, canvas.width, canvas.height); //clear canvas
                ctx.beginPath();
                ctx.rect(mousex - size / 2, mousey - size / 2, size, size);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.stroke();

            };

        }
    }
})

function fullExam(items, method) {
    let canvas = document.getElementById("ExamCanvas");
    let ctx = canvas.getContext("2d");
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    var examItem = new item();
    examItem.buildMatrix(imageData, method);
    var examMatrix = examItem.matrix;
    var step = +app.blockSize;

    for (var x = 0; x < canvas.width; x += step)
        for (var y = 0; y < canvas.height; y++)
            imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

    for (var y = 0; y < canvas.height; y += step)
        for (var x = 0; x < canvas.width; x++)
            imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

    for (var r = 0; r < canvas.height; r += step)
        for (var c = 0; c < canvas.width; c += step) {
            var testArea = getAreaItem(examMatrix, r, c, step);
            var testResult = ExamArea(testArea, items);
            if (testResult != -1) {
                ctx.font = "8px Georgia";
                ctx.fillText(testResult.name, r, c);
                color = testResult.highlightColor;
                highlightArea(imageData, r, c, step, color, 100);
            }
        }

    ctx.putImageData(imageData, 0, 0);
}

function resetExam() {
    document.getElementById("ExamCanvas").outerHTML = "";
    initExamCanvas();
}

//ініціалізація зображення, на якому проводиться екзамен
function initExamCanvas() {
    var sourceCanvas = document.getElementById('source');
    var sourceImageData = sourceCanvas.getContext("2d").getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    var examCanvas = document.createElement('canvas');
    examCanvas.setAttribute("id", "ExamCanvas");
    examCanvas.width = sourceCanvas.width;
    examCanvas.height = sourceCanvas.height;
    var examCtx = examCanvas.getContext('2d');
    examCtx.putImageData(sourceImageData, 0, 0);
    document.getElementById('exam').appendChild(examCanvas);
}

//підсвітка ділянки зображення
function highlightArea(imageData, startY, startX, d, color, intensity) {
    const endY = startY + d;
    const endX = startX + d;
    for (y = startY; y < endY; y++)
        for (x = startX; x < endX; x++) {
            var pixel = imageData.getPixel(x, y);
            switch (color) {
                case 'green':
                    pixel.G = Math.min(255, pixel.G + intensity);
                    break;
                case 'blue':
                    pixel.B = Math.min(255, pixel.B + intensity);
                    break;
                case 'red':
                    pixel.R = Math.min(255, pixel.R + intensity);
                    break;
                case 'yellow':
                    pixel.R = Math.min(255, pixel.R + intensity);
                    pixel.G = Math.min(255, pixel.G + intensity);
                    break;
                default:
                    break;
            }
            imageData.setPixel(x, y, pixel);
        }
}
//вибір кадру для екзамену
function getAreaItem(matrix, startRow, startCol, distance) {
    var endRow = startRow + distance;
    var endCol = startCol + distance;
    var exItem = new item();
    var currentRow = 0;
    for (var r = startRow; r < endRow; r++) {
        exItem.matrix.push(new Array());
        for (var c = startCol; c < endCol; c++) {
            exItem.matrix[currentRow].push(matrix[r][c]);
        }
        currentRow++;
    }
    exItem.calculateCenter(+app.optimalDelta);
    exItem.buildBinaryMatrix();
    return exItem;
}

//Екзамен
function ExamArea(exItem, items) {
    var maxf = -1;

    var retVal = -1;
    var maxDistanse = 50; //TODO
    var delta = +app.optimalDelta;
    let result = -1;

    for (var i = 0; i < items.length; i++) {
        var rclas = items[i];
        var distance = hemmingDistance(exItem.etalon, rclas.etalon);
        console.log(`distance to ${rclas.name}: ${distance}`);
        result = 1 - distance / rclas.trainingResults[delta].radius;
        console.log(`result: ${result}`);

        if (maxf < result && result >= 0) {
            console.log(`this is ${rclas.name}`);
            maxf = result;
            retVal = rclas;
        }

    }

    return retVal;
}
function download(e) {
    var link = document.createElement("a");
    link.download = "image.bmp";
    link.href = e.target.toDataURL("image/bmp").replace("image/bmp", "image/octet-stream");
    link.click();
}
