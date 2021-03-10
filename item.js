//класс розпізнавання
class item {

    constructor() {
        this.name = '';
        this.matrix = new Array();      //матриця зображення   
        this.center = new Array();      //центр контейнера класу розпізнавання
        this.tolerance = new Array();   //массив структур tollerance, (нижня і верхня межа допуску)
        this.binMatrix = new Array();   //бінатрна матриця
        this.etalon = new Array();      //еталонний вектор класу
        this.trainingResults = new Array();

        this.highlightColor = '';        //колір підсвітки на екзамені
        this.showMatrix = false;
        this.showBinaryMatrix = false;
        this.showTrainingRes = false;
        this.showChart = false;

    }
    //створення матриці зображення з об'єкту canvas 
    buildMatrix = function (imageData, method) {
        let width = imageData.width;
        let height = imageData.height;
        this.matrix = new Array();
        for (var y = 0; y < height; y++) {
            this.matrix.push(new Array());
            for (var x = 0; x < width; x++) {
                var pixel = imageData.getPixel(x, y);
                if (method == 'm_avg')
                    this.matrix[y].push(avg(pixel))
                else if (method == 'm_red')
                    this.matrix[y].push(pixel.R)
                else if (method == 'm_green')
                    this.matrix[y].push(pixel.G)
                else if (method == 'm_blue')
                    this.matrix[y].push(pixel.B)
                else if (method == 'm_lum')
                    this.matrix[y].push(luminosity(pixel));
            }
        }
    }

    reset = function () {
        this.matrix = Array();
        this.binMatrix = new Array();
        this.etalon = new Array();
        this.tolerance = new Array();
        this.center = new Array();
        this.trainingResults= new Array();
    }
    // визначення еталонного вектору
    calculateCenter = function (delta) {
        this.tolerance = new Array();
        this.center = new Array();
        let colNumber = this.matrix[0].length;
        for (var col = 0; col < colNumber; col++) {
            var sum = 0;
            for (var row = 0; row < this.matrix.length; row++) {
                var val = this.matrix[row][col];
                sum += val;
            }
            var avg = Math.round(sum / this.matrix.length);
            this.center.push(avg);
            this.tolerance.push(new tolerance(avg + delta, avg - delta));
        }
    }
    // побудова бінарної матриці
    buildBinaryMatrix = function () {
        this.binMatrix = new Array();
        this.etalon = new Array();
        for (var r = 0; r < this.matrix.length; r++) {
            this.binMatrix.push(new Array());
            for (var c = 0; c < this.matrix[r].length; c++) {
                var tolerance = this.tolerance[c];
                this.binMatrix[r][c] = (this.matrix[r][c] >= tolerance.bottom && this.matrix[r][c] <= tolerance.top) ? 1 : 0;
            }
        }
        var colNumber = this.binMatrix[0].length;
        for (var c = 0; c < colNumber; c++) {
            var sum = 0;
            for (var r = 0; r < this.binMatrix.length; r++)
                sum += this.binMatrix[r][c];

            this.etalon.push((sum / this.binMatrix.length) >= 0.5 ? 1 : 0);
        }
        this.distanceToNeighbour = this.etalon.length;
    }
}

//структура для зберігання меж допусків
class tolerance {
    constructor(top, bottom) {
        this.top = top;
        this.bottom = bottom;
    }
}

//результати навчання
class trainingResult {
    constructor() {

        this.neighbour = -1;            //індекс класу сусіда
        this.distanceToNeighbour =50;   //відстань до сусіда;
        this.maxKFE = -1;
        this.no_rab_obl_max_KFE = -1;
        this.radius = 0;
        this.no_rab_obl_Radius = 0;
        this.no_rab_obl_dostovirn_D1 = 0;
        this.no_rab_pomylka_betta = 0;
        this.dostovirn_D1 = 0;
    }
}

Vue.component('line-chart', {
    extends: VueChartJs.Line,
    props: {
        chartdata: {
            type: Array,
            default: null
        }
    },
    mounted() {
        let data = {
            labels: new Array(), datasets: [
                { label: 'Radius', data: new Array() },
                { label: 'Delta', data: new Array() },
            ]
        };

        for (let i = 0; i < this.chartdata.length; i++) {
            data.datasets[0].data.push(this.chartdata[i].maxKFE);
            data.datasets[1].data.push(i);
            data.labels.push(this.chartdata[i].radius);
        }
        this.renderChart(data, {
            responsive: true, maintainAspectRatio: false, scales: {
                yAxes: [{
                    scaleLabel: { display: true, labelString: "Iнформаційна міра" }
                }],
                xAxes: [{
                    scaleLabel: { display: true, labelString: "Радіус" },
                    scaleLabel: { display: true, labelString: "Delta" }
                }]
            }
        })
    }

})
