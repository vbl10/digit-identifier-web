class ProbabilityBars {
    #probElmts

    constructor(containerElmt) {
        this.#probElmts = [];

        for (let i = 0; i < 10; i++) {
            const probElmt = document.createElement("div");
            probElmt.setAttribute("style", "display: flex; gap: 10px;");

            const span = document.createElement("span");
            span.innerText = `${i}: 0%`;

            const progress = document.createElement("progress");
            progress.setAttribute("min", "0");
            progress.setAttribute("max", "100");
            progress.setAttribute("value", "0");

            probElmt.appendChild(span);
            probElmt.appendChild(progress);

            this.#probElmts.push({span, progress});
            
            containerElmt.appendChild(probElmt);
        }
    }

    updateProbsPercent(probs) {
        for (let i = 0; i < probs.length && i < this.#probElmts.length; i++) {
            this.#probElmts[i].span.innerText = `${i}: ${probs[i].toFixed(0)}%`;
            this.#probElmts[i].progress.setAttribute("value", `${probs[i]}`);
        }
    }
};

class Canvas {
    canvasElmt;
    #mposElmt;
    #ctx;
    #mouseHeld = false;
    #lastMousePos;
    #updateProbsPromise;
    
    resolution;
    pixels = [];
    strokeWidth = 6;
    onUpdate;
    enabled = true;

    constructor(hostElmt, resolution, onUpdate) {        
        this.onUpdate = onUpdate;
        this.resolution = resolution;
        for (let i = 0; i < this.resolution.x * this.resolution.y; i++)
            this.pixels.push(0);

        this.canvasElmt = document.createElement("canvas");
        this.canvasElmt.setAttribute("width", "400");
        this.canvasElmt.setAttribute("height", "400");
        this.canvasElmt.addEventListener("mousemove", (ev) => this.#onMouseMove({x: ev.offsetX, y: ev.offsetY}));
        this.canvasElmt.addEventListener("mousedown", (ev) => { this.#mouseHeld = true; });
        this.canvasElmt.addEventListener("mouseup", (ev) => this.#onMouseUp());
        this.canvasElmt.addEventListener("mouseleave", (ev) => this.#onMouseUp());

        this.#ctx = this.canvasElmt.getContext('2d');

        this.#mposElmt = document.createElement("span");
        this.#mposElmt.innerText = "x: 0, y: 0";

        const containerElmt = document.createElement("div");
        containerElmt.setAttribute("style", "display: flex; width: fit-content; flex-direction: column; gap: 10px;");
        containerElmt.appendChild(this.canvasElmt);
        containerElmt.appendChild(this.#mposElmt);

        hostElmt.appendChild(containerElmt);

        this.draw();
    }

    #onMouseUp() {
        this.#lastMousePos = null;
        this.#mouseHeld = false;
    }

    #onMouseMove(canvasCoord) {
        const pixelCoord = this.#canvasToPixel(canvasCoord);
        this.#mposElmt.innerText = `x: ${pixelCoord.x.toFixed(0)}, y: ${pixelCoord.y.toFixed(0)}`;
        if (this.#mouseHeld && this.enabled) {
            if (!this.#lastMousePos) {
                this.#lastMousePos = pixelCoord;
            }
            else {
                this.#stroke(this.#lastMousePos, pixelCoord);
                this.#lastMousePos = pixelCoord;
            }
            this.draw();


            if (!this.#updateProbsPromise) {
                this.#updateProbsPromise = new Promise(resolve => {
                    setTimeout(() => {
                        //update probabilities
                        if (this.onUpdate) this.onUpdate();

                        this.#updateProbsPromise = null;
                        resolve();
                    }, 50);
                });
            }
        }
    }

    #canvasToPixel(canvasCoord) {
        return {
            x: canvasCoord.x / this.canvasElmt.width * this.resolution.x, 
            y: canvasCoord.y / this.canvasElmt.height * this.resolution.y
        };
    }

    #stroke(pxA, pxB) {
        const paint = (pixelCoord) => {
            const strokeWidth = this.strokeWidth;
            for (let y = 0; y < strokeWidth; y++) {
                for (let x = 0; x < strokeWidth; x++) {
                    const px = {
                        x: Math.floor(x - strokeWidth / 2 + pixelCoord.x),
                        y: Math.floor(y - strokeWidth / 2 + pixelCoord.y)
                    };
                    if (px.x >= 0 && px.x < this.resolution.x && px.y >= 0 && px.y < this.resolution.y) {
                        let dist = Math.sqrt((x - strokeWidth/2) * (x - strokeWidth/2) + (y - strokeWidth/2) * (y - strokeWidth/2));
                        dist = dist/(strokeWidth/2);
                        dist = Math.min(1.0, dist);
                        const alpha = Math.pow(-dist + 1, 1/3);
                        this.pixels[px.x + px.y * this.resolution.x] = 
                            Math.min(
                                1.0, 
                                this.pixels[px.x + px.y * this.resolution.x] + alpha
                            );
                    } 
                }
            }
        }

        let dx = pxB.x - pxA.x; 
        let dy = pxB.y - pxA.y; 
        let step; 
    
        if (Math.abs(dx) > Math.abs(dy)) 
            step = Math.abs(dx); 
        else
            step = Math.abs(dy); 
    
        let x_incr = (dx / step); 
        let y_incr = (dy / step); 
    
        let x = pxA.x; 
        let y = pxA.y; 
    
        for (let i = 0; i < step; i++) { 
            paint({x, y});
            x += x_incr; 
            y += y_incr; 
        }
    }

    clear() {
        for (let i = 0; i < this.resolution.x*this.resolution.y; i++)
            this.pixels[i] = 0;
        this.draw();
    }

    draw() {
        const w = this.canvasElmt.width;
        const h = this.canvasElmt.height;
        const ctx = this.#ctx;
        const res = this.resolution;
        const pixelSize = w / res.x;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);


        for (let y = 0; y < res.y; y++) {
            for (let x = 0; x < res.x; x++) {
                const val = this.pixels[x + y * res.x] * 255;
                ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
};

class Matrix {
    mem;
    dim;

    constructor(mem, dim) {
        this.dim = dim;
        if (mem) this.mem = mem;
        else {
            this.mem = [];
            for (let i = 0; i < this.dim.x*this.dim.y; i++)
                this.mem.push(0);
        }
    }
    
    static makeVector2d(vec) {
        const out = new Matrix(null, {x: 1, y: 3});
        if (typeof vec == 'number') vec = {x: vec, y: vec};
        out.mem[0] = vec.x;
        out.mem[1] = vec.y;
        out.mem[2] = 1;
        return out;
    }
    static makeIdentity2d() {
        const out = new Matrix(null, {x: 3, y: 3});
        out.mem[0] = 1;
        out.mem[4] = 1;
        out.mem[8] = 1;
        return out;
    }
    static makeTranslation2d(translation) {
        const out = new Matrix(null, {x: 3, y: 3});
        if (typeof translation == 'number') translation = {x: translation, y: translation};
        out.mem[0] = 1;
        out.mem[2] = translation.x;
        out.mem[4] = 1;
        out.mem[5] = translation.y;
        out.mem[8] = 1;
        return out;
    }
    static makeScale2d(scale) {
        const out = new Matrix(null, {x: 3, y: 3});
        if (typeof scale == 'number') scale = {x: scale, y: scale};
        out.mem[0] = scale.x;
        out.mem[4] = scale.y;
        out.mem[8] = 1;
        return out;
    }
    static makeRotation2d(angle) {
        const out = new Matrix(null, {x: 3, y: 3});
        out.mem[0] = Math.cos(angle);
        out.mem[1] = -Math.sin(angle);
        out.mem[3] = Math.sin(angle);
        out.mem[4] = Math.cos(angle);
        out.mem[8] = 1;
        return out;
    }

    translate2d(translation) {
        return this.mult(Matrix.makeTranslation2d(translation));
    }
    scale2d(scale) {
        return this.mult(Matrix.makeScale2d(scale));
    }
    rotate2d(angle) {
        return this.mult(Matrix.makeRotation2d(angle));
    }
    

    toVector2d() {
        return {x: this.mem[0], y: this.mem[1]};
    }

    broadcast(n) {
        const out = new Matrix(null, this.dim.x == 1 ? {x: n, y: this.dim.y} : {x: this.dim.x, y: n});
        for (let i = 0; i < out.dim.y; i++) 
            for (let j = 0; j < out.dim.x; j++)
                out.mem[i * out.dim.x + j] = this.mem[(i % this.dim.y) * this.dim.x + (j % this.dim.x)]
        return out;
    }

    mult(other) {
        if (typeof other == 'number') {
            const out = new Matrix(null, {x: this.dim.x, y: this.dim.y});
            for (let i = 0; i < this.dim.x * this.dim.y; i++) {
                out.mem[i] = this.mem[i] * other;
            }
            return out;
        }
        else {
            if (this.dim.x != other.dim.y) throw new Error("Can't multiply matricies: dimension mismatch");
    
            const out = new Matrix(null, {x: other.dim.x, y: this.dim.y});
    
            const len = this.dim.x;
            for (let i = 0; i < this.dim.y; i++) {
                for (let j = 0; j < other.dim.x; j++) {
                    let elmt = 0;
                    for (let k = 0; k < len; k++) {
                        elmt += this.mem[i * this.dim.x + k] * other.mem[k * other.dim.x + j];
                    }
                    out.mem[i * out.dim.x + j] = elmt;
                }
            }
            return out;
        }
    }
    div(other) {
        if (typeof other == 'number') {
            const out = new Matrix(null, {x: this.dim.x, y: this.dim.y});
            for (let i = 0; i < this.dim.x * this.dim.y; i++) {
                out.mem[i] = this.mem[i] / other;
            }
            return out;
        }
        else {
            if (this.dim.x != other.dim.y) throw new Error("Can't multiply matricies: dimension mismatch");
    
            const out = new Matrix({x: other.dim.x, y: this.dim.y});
            out.mem = [];
    
            const len = this.dim.x;
            for (let i = 0; i < this.dim.y; i++) {
                for (let j = 0; j < other.dim.x; j++) {
                    let elmt = 0;
                    for (let k = 0; k < len; k++) {
                        elmt += this.mem[i * this.dim.x + k] / other.mem[k * other.dim.x + j];
                    }
                    out.mem;
                }
            }
            return out;
        }
    }
    add(other) {
        let out = new Matrix(null, {x: this.dim.x, y: this.dim.y});
        if (typeof other == 'number') {
            for (let i = 0; i < this.dim.x*this.dim.y; i++)
                out.mem[i] = this.mem[i] + other;
        }
        else {
            if (other.dim.x == 1 && this.dim.y == other.dim.y)
                other = other.broadcast(this.dim.x);
            else if (other.dim.y == 1 && this.dim.x == other.dim.x)
                other = other.broadcast(this.dim.y);
            else
                throw new Error("Can't add matricies: dimension mismatch");

            for (let i = 0; i < this.dim.y; i++)
                for (let j = 0; j < this.dim.x; j++)
                    out.mem[i * this.dim.x + j] = this.mem[i * this.dim.x + j] + other.mem[i * other.dim.x + j];
        }
        return out;
    }
    minor(_i, _j) {
        if (this.dim.x != this.dim.y) throw new Error("Can't calculate minor: must be a square matrix");

        const minor = new Matrix(null, {x: this.dim.x - 1, y: this.dim.y - 1});
		for (let i = 0, k = 0; i < this.dim.x; i++) {
			if (i != _i) {
				for (let j = 0, l = 0; j < this.dim.y; j++) {
					if (j != _j) {
						minor.mem[k * minor.dim.x + l] = this.mem[i * this.dim.x + j];
						l++;
					}
				}
				k++;
			}
		}
		return minor;
    }
    determinant() {
        if (this.dim.x != this.dim.y) throw new Error("Can't calculate determinant: must be a square matrix");

        if (this.dim.x == 0) return 1;
        else if (this.dim.x == 1) return this.mem[0];
        else if (this.dim.x == 2) return this.mem[0] * this.mem[3] - this.mem[1] * this.mem[2];
        else {
            let det = 0.0;
            for (let j = 0; j < this.dim.x; j++)
            {
                det += this.mem[j] * (((j + 1) % 2) * 2 - 1) * this.minor(0, j).determinant();
            }
            return det;
        }
    }
    transposed() {
        const out = new Matrix(null, {x: this.dim.y, y: this.dim.x});
        for (let i = 0; i < this.dim.y; i++) {
            for (let j = 0; j < this.dim.x; j++) {
                out.mem[j * out.dim.x + i] = this.mem[i * this.dim.x + j];
            }
        }
        return out;
    }
    cofactors() {
        if (this.dim.x != this.dim.y) throw new Error("Can't calculate cofactors: must be a square matrix");

        const out = new Matrix(null, {x: this.dim.x, y: this.dim.y});

        for (let i = 0; i < this.dim.y; i++) {
            for (let j = 0; j < this.dim.x; j++) {
                out.mem[i * this.dim.x + j] = this.minor(i, j).determinant() * (((i + j + 1) % 2) * 2 - 1);
            }
        }
        return out;
    }
    inverse() {
        return this.cofactors().transposed().div(this.determinant());
    }
    tanh() {
        const out = new Matrix(null, {x: this.dim.x, y: this.dim.y});
        for (let i = 0; i < out.dim.x * out.dim.y; i++)
            out.mem[i] = Math.tanh(this.mem[i]);
        return out;
    }
    sotfmax() {
        const out = new Matrix(null, {x: this.dim.x, y: this.dim.y});
        const max = Math.max(...this.mem);
        let acc = 0;
        for (let i = 0; i < out.dim.x * out.dim.y; i++) {
            out.mem[i] = Math.exp(this.mem[i] - max);
            acc += out.mem[i];
        }
        for (let i = 0; i < out.dim.x * out.dim.y; i++) {
            out.mem[i] /= acc;
        }
        return out;
    }
}

class DigitIdentifier {
    #W1;
    #b1;
    #W2;
    #b2;
    #W3;
    #b3;

    constructor(modelUrl) {
        fetch(modelUrl)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            const params = new Float32Array(buffer);

            let s = 0, e= 0;

            this.#W1 = new Matrix(null, {x: 16, y: 28*28});
            s = e; 
            e = s + this.#W1.dim.x * this.#W1.dim.y;
            params.slice(s, e).forEach((val, i) => this.#W1.mem[i] = val);

            this.#b1 = new Matrix(null, {x: 16, y: 1});
            s = e; 
            e = s + this.#b1.dim.x * this.#b1.dim.y;
            params.slice(s, e).forEach((val, i) => this.#b1.mem[i] = val);

            this.#W2 = new Matrix(null, {x: 16, y: 16});
            s = e; 
            e = s + this.#W2.dim.x * this.#W2.dim.y;
            params.slice(s, e).forEach((val, i) => this.#W2.mem[i] = val);

            this.#b2 = new Matrix(null, {x: 16, y: 1});
            s = e; 
            e = s + this.#b2.dim.x * this.#b2.dim.y;
            params.slice(s, e).forEach((val, i) => this.#b2.mem[i] = val);

            this.#W3 = new Matrix(null, {x: 10, y: 16});
            s = e; 
            e = s + this.#W3.dim.x * this.#W3.dim.y;
            params.slice(s, e).forEach((val, i) => this.#W3.mem[i] = val);

            this.#b3 = new Matrix(null, {x: 10, y: 1});
            s = e; 
            e = s + this.#b3.dim.x * this.#b3.dim.y;
            params.slice(s, e).forEach((val, i) => this.#b3.mem[i] = val);
        })
    }

    predict(imgMat) {
        const L1 = imgMat.mult(this.#W1).add(this.#b1).tanh();
        const L2 = L1.mult(this.#W2).add(this.#b2).tanh();
        const L3 = L2.mult(this.#W3).add(this.#b3);
        return L3.sotfmax();
    }
};

