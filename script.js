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

//вcтановлення пікселя за координатами
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
        if (a[o] != b[o]) {
            dist++;
        }
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

function weighted_grayscale(pixel) {
    return Math.round(pixel.R * 0.299 + pixel.G * 0.587 + pixel.B * 0.114);
}
//Критерій Кульбака
function KFE(distance, c) {
    var own = 0; //кількість "своїх"
    var foreign = 0; //кількість "чужих" 

    var rowNumber = distance[0].length;

    for (var r = 0; r < rowNumber; r++) {
        if (distance[0][r] <= c) own++;
        if (distance[1][r] <= c) foreign++;
    }
    var td1 = own / rowNumber;
    var tbetta = foreign / rowNumber;
    var d1b = td1 - tbetta;
    var kfe = d1b * Math.log((1 + d1b + 0.1) / (1 - d1b + 0.1)) / Math.log(2);
    return {
        td1,
        tbetta,
        kfe
    };
}

function calculateRadius(items, delta) {

    items.forEach(currentItem => {

        let trainingResult = currentItem.trainingResults[delta];
        var distance = new Array(); //кодова відстань
        distance.push(new Array());
        distance.push(new Array());
        for (var r = 0; r < currentItem.binMatrix.length; r++) {
            distance[0][r] = 0;
            distance[1][r] = 0;
            for (var c = 0; c < currentItem.binMatrix[r].length; c++) {

                distance[0][r] += Math.abs(currentItem.etalon[c] - currentItem.binMatrix[r][c]);
                distance[1][r] += Math.abs(currentItem.etalon[c] - items[trainingResult.neighbour].binMatrix[r][c]);

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
            if (td1 >= 0.5 && tbetta < 0.5) {
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
        result.delta = delta;
        result.distanceToNeighbour = currentItem.etalon.length;
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

function contrastImage(imageData, contrast) { // contrast as an integer percent  
    var data = imageData.data; // original array modified, but canvas not updated
    contrast *= 2.55; // or *= 255 / 100; scale integer percent to full range
    var factor = (255 + contrast) / (255.01 - contrast); //add .1 to avoid /0 error

    for (var i = 0; i < data.length; i += 4) //pixel values in 4-byte blocks (r,g,b,a)
    {
        data[i] = factor * (data[i] - 128) + 128; //r value
        data[i + 1] = factor * (data[i + 1] - 128) + 128; //g value
        data[i + 2] = factor * (data[i + 2] - 128) + 128; //b value

    }
    return imageData; //optional (e.g. for filter function chaining)
}

//визначення оптимального значення delta
function optimizeDelta(items) {
    let emAvg = -1;
    let optimalDelta = 0;
    let maxEm = 0;
    for (let delta = 0; delta < items[0].trainingResults.length; delta++) {
        items.forEach(item => {
            if (item.trainingResults[delta].radius == -1)
                emAvg += item.trainingResults[delta].no_rab_obl_dostovirn_D1;
            else {
                emAvg += item.trainingResults[delta].maxKFE;
                if (item.trainingResults[delta].maxKFE > item.maxEm) {
                    item.maxEm = item.trainingResults[delta].maxKFE;
                }
            }
        });

        emAvg = emAvg / items.length;
        if (emAvg > maxEm) {
            maxEm = emAvg;
            optimalDelta = delta;
        }
    }
    //перебудова бінарних матриць і еталонних векторів з оптимальним значенням delta
    items.forEach(item => {
        item.calculateCenter(optimalDelta);
        item.buildBinaryMatrix(optimalDelta);
        item.renderBinaryImage();
    });
    return {
        maxEm,
        optimalDelta
    };
}

//Інтерфейс програми
var app = new Vue({

    el: '#app',
    data: {
        activeItem: 'setup', // закладка
        method: 'm_avg', // алгоритм побудови матриці зображення
        delta: 20, // початкове значення Delta
        items: [], // массив класів розпізнавання
        trainingComlete: false, // тренування завершене, система готова до екзамену
        frameSize: 50,
        optimalDelta: 0,
        maxEm: 0,
        sourceImageSelected: false, //базове зображення
        contrast: 0,
        deltaOptimization: true
    },
    methods: {
        //побудова матриць
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
                i.renderBinaryImage();
            }
        },
        //навчання
        train: function () {
            this.trainingComlete = false;
            if (this.deltaOptimization) {
                for (let delta = 0; delta < this.delta; delta++) {
                    this.items.forEach(item => {
                        item.calculateCenter(delta);
                        item.buildBinaryMatrix(delta);

                    });
                    caclulateDistanceToNeighbours(this.items, delta);
                    calculateRadius(this.items, delta);
                }

                var optimizationResult = optimizeDelta(this.items);
                this.maxEm = optimizationResult.maxEm;
                this.optimalDelta = optimizationResult.optimalDelta;
            } else {
                this.items.forEach(item => {
                    item.calculateCenter(+this.optimalDelta);
                    item.buildBinaryMatrix(+this.optimalDelta);
                    item.renderBinaryImage();

                });
                caclulateDistanceToNeighbours(this.items, +this.optimalDelta);
                calculateRadius(this.items, +this.optimalDelta);

            }

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
                            var w = Math.round(this.width / app.frameSize) * app.frameSize;
                            var h = Math.round(this.height / app.frameSize) * app.frameSize;
                            c.width = w;
                            c.height = h;
                            var ctx = c.getContext("2d");
                            ctx.drawImage(this, 0, 0, w, h);
                            app.setupOverlay('map-container', 'source', w, h, app.addItem);
                            initExamCanvas();
                            app.sourceImageSelected = true;
                        }
                        img.src = fr.result;
                    }
                    fr.readAsDataURL(event.target.files[i]);
                }
            }
        },
        //екзамен
        exam: function () {
            fullExam(this.items, this.method);
        },
        //закладки
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
        setupOverlay: function (parentId, sourceCanvasId, width, height, imageCaptured) {
            //Canvas
            const canvas = document.createElement('canvas');
            canvas.setAttribute("class", "overlay");
            canvas.setAttribute("width", width);
            canvas.setAttribute("height", height);
            document.getElementById(parentId).appendChild(canvas);
            const ctx = canvas.getContext('2d');
            //Variables
            let last_mousex = -1;
            let last_mousey = -1;
            let mousex = -1;
            let mousey = -1;

            //Mouseup
            canvas.onmouseup = (ev) => {

                var size = app.frameSize;
                var sourceCanvas = document.getElementById(sourceCanvasId);
                var sourceContext = sourceCanvas.getContext("2d");

                let canvasx = ev.target.offsetLeft;
                let canvasy = ev.target.offsetTop;
                var clientX = ev.pageX;
                var clientY = ev.pageY;
                mousex = parseInt(clientX - canvasx);
                mousey = parseInt(clientY - canvasy);

                var sourceImageData = sourceContext.getImageData(mousex - size / 2, mousey - size / 2, size, size);
                imageCaptured(sourceImageData);
            }

            canvas.onmousemove = (e) => draw_box(e, canvas, ctx);
        },
        addItem: function (sourceImageData) {
            var div = document.createElement("div");
            div.setAttribute("id", "training_class_" + this.items.length)
            var c = document.createElement("canvas");
            c.className = "training";
            c.width = app.frameSize;
            c.height = app.frameSize;

            var context = c.getContext("2d");
            context.putImageData(sourceImageData, 0, 0);
            document.getElementById('training-set').appendChild(c);
            div.appendChild(c);

            c = document.createElement("canvas");
            c.className = "training_bin";
            c.setAttribute("id", "bin_image_" + this.items.length)
            c.width = app.frameSize;
            c.height = app.frameSize;

            var context = c.getContext("2d");
            context.putImageData(sourceImageData, 0, 0);
            div.appendChild(c);

            document.getElementById('training-set').appendChild(div);

            var preview = document.createElement("canvas");
            preview.className = "preview";
            preview.width = app.frameSize;
            preview.height = app.frameSize;
            preview.onclick = (e) => download(e);

            var previewContext = preview.getContext("2d");
            previewContext.putImageData(sourceImageData, 0, 0);
            document.getElementById('preview').appendChild(preview);
            var i = new item();
            i.index = this.items.length;
            app.items.push(i);
        }
    }
})



function draw_box(ev, canvas, ctx) {
    let canvasx = ev.target.offsetLeft;
    let canvasy = ev.target.offsetTop;
    let clientX = ev.pageX;
    let clientY = ev.pageY;

    mousex = parseInt(clientX - canvasx);
    mousey = parseInt(clientY - canvasy);
    let size = app.frameSize;
    ctx.clearRect(-1, 0, canvas.width, canvas.height); //clear canvas
    ctx.beginPath();
    ctx.rect(mousex - size / 2, mousey - size / 2, size, size);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function fullExam(items, method) {
    var results = [];
    let canvas = document.getElementById("ExamCanvas");

    let ctx = canvas.getContext("2d");
    ctx.font = "9px serif ";
    ctx.fillStyle = "#ff0000";

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    var examItem = new item();
    examItem.buildMatrix(imageData, method);
    var examMatrix = examItem.matrix;
    var step = +app.frameSize;


    var binaryCanvas = document.getElementById("ExamBinaryCanvas");
    var binaryCanvasCtx = binaryCanvas.getContext("2d");
    var binaryImageData = binaryCanvasCtx.getImageData(0, 0, canvas.width, canvas.height);


    //відображення сітки
    for (var x = 0; x < canvas.width; x += step)
        for (var y = 0; y < canvas.height; y++)
            imageData.setPixel(x, y, {
                R: 255,
                G: 0,
                B: 0,
            });

    for (var y = 0; y < canvas.height; y += step)
        for (var x = 0; x < canvas.width; x++)
            imageData.setPixel(x, y, {
                R: 255,
                G: 0,
                B: 0
            });

    var i = 0;
    for (var r = 0; r < canvas.height; r += step) {
        results[i] = [];
        for (var c = 0; c < canvas.width; c += step) {
            var testArea = getAreaItem(examMatrix, r, c, step);
            var testResult = ExamArea(testArea, items);

            for (var by = 0; by < testArea.binMatrix.length; by++) {
                for (var bx = 0; bx < testArea.binMatrix[by].length; bx++) {
                    var val = testArea.binMatrix[bx][by];
                    var color = {};
                    if (val == 0) {
                        color = {
                            R: 0,
                            G: 0,
                            B: 0,
                            A: 255
                        };
                    } else {
                        color = {
                            R: 255,
                            G: 255,
                            B: 255,
                            A: 255
                        };
                    }

                    binaryImageData.setPixel(by + c, bx + r, color);

                }
            }
            binaryCanvasCtx.putImageData(binaryImageData, 0, 0);
            results[i].push(testResult);

        }
        i++;
    }

    ctx.putImageData(imageData, 0, 0);


    for (var r = 0; r < results.length; r++) {
        for (var c = 0; c < results[r].length; c++) {
            var result = results[r][c];
            var className = result == -1 ? "unknown" : result.name;

            var x = c * step;
            var y = r * step;

            ctx.fillText(`${className}`, x + 5, y + 10);
        }
    }

}

function cropAreaForExam(sourceImageData) {
    if (!app.trainingComlete) return

    var exItem = new item();
    exItem.buildMatrix(sourceImageData, app.method);
    exItem.calculateCenter(+app.optimalDelta);
    exItem.buildBinaryMatrix();
    var className = "unknown";
    var result = ExamArea(exItem, app.items);
    if (result != -1) className = result.name;
    var label = document.createElement('div');
    label.innerText=className;
    var div = document.createElement('div');
    div.setAttribute("class","exam_frame_result col-1");
    var c = document.createElement("canvas");
    c.className = "exam_frame";
    c.width = app.frameSize;
    c.height = app.frameSize;
    var context = c.getContext("2d");
    context.putImageData(sourceImageData, 0, 0);
    div.appendChild(c);
    div.appendChild(label);
    document.getElementById('exam_frames').appendChild(div);


}

function resetExam() {
    document.getElementById("exam_image_container").innerHTML = "";
    document.getElementById("exam_frames").innerHTML = "";
    initExamCanvas();
}

//ініціалізація зображення, на якому проводиться екзамен
function initExamCanvas() {
    var sourceCanvas = document.getElementById('source');
    var sourceImageData = sourceCanvas.getContext("2d").getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var examCanvas = document.createElement('canvas');
    examCanvas.setAttribute("id", "ExamCanvas");
    examCanvas.width = w;
    examCanvas.height = h;
    var examCtx = examCanvas.getContext('2d');
    examCtx.putImageData(sourceImageData, 0, 0);
    document.getElementById('exam_image_container').appendChild(examCanvas);

    app.setupOverlay('exam_image_container', 'ExamCanvas', w, h, cropAreaForExam);


    var examBinaryCanvas = document.createElement('canvas');
    examBinaryCanvas.setAttribute("id", "ExamBinaryCanvas");
    examBinaryCanvas.width = sourceCanvas.width;
    examBinaryCanvas.height = sourceCanvas.height;
    var examCtx = examBinaryCanvas.getContext('2d');
    examCtx.putImageData(sourceImageData, 0, 0);
    document.getElementById('exam_image_container').appendChild(examBinaryCanvas);
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
    var delta = +app.optimalDelta;
    let result = -1;
    console.log();
    console.log();

    for (var i = 0; i < items.length; i++) {
        var rclas = items[i];

        console.log(`Testing ${rclas.name}`);
        console.log(exItem.etalon.join(''));
        console.log(rclas.etalon.join(''));

        var distance = hemmingDistance(exItem.etalon, rclas.etalon);
        var radius = rclas.trainingResults[delta].radius;
        result = 1 - distance / radius;

        console.log(`distance to ${rclas.name}: ${distance}`);
        console.log(`result: ${distance}/${radius} = ${result}`);

        if (maxf < result && result >= 0) {
            console.log(`this is ${rclas.name}`);
            maxf = result;
            retVal = rclas;
        }
    }

    return retVal;
}