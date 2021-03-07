//класс розпізнавання
class item {

    constructor() {
        this.name = '';
        this.matrix = new Array();      //матриця зображення   
        this.center = new Array();      //центр контейнера класу розпізнавання
        this.tolerance = new Array();   //массив структур tollerance, (нижня і верхня межа допуску)
        this.binMatrix = new Array();   //бінатрна матриця
        this.etalon = new Array();      //еталонний вектор класу
        this.neighbour = -1;            //індекс класу сусіда
        this.distanceToNeighbour = 0;   //відстань до сусіда
        this.maxKFE = -1;
        this.no_rab_obl_max_KFE = -1;
        //this.kodova_vidstan = new Array();
        this.radius = 0;
        this.no_rab_obl_Radius = 0;
        this.no_rab_obl_dostovirn_D1 = 0;
        this.no_rab_pomylka_betta = 0;
        this.dostovirn_D1 = 0;
        this.highlightColor = ''        //колір підсвітки на екзамені
    }
    reset= function(){
        this.matrix = Array();
        this.binMatrix = new Array();
        this.etalon = new Array();
        this.tolerance = new Array();
        this.center = new Array();
    }
    // визначення еталонного вектору
    calculateCenter = function (delta) {

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