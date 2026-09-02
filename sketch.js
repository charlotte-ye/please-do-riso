let img;
let layer1;
let layer2;
let generated = false;

function setup() {
  let canvas = createCanvas(600, 600);
  canvas.parent("canvas-holder");

  pixelDensity(1);

  layer1 = new Riso("teal");
  layer2 = new Riso("yellow");

  document.getElementById("upload").addEventListener("change", handleUpload);
  document.getElementById("generateBtn").addEventListener("click", generateRiso);
}

function draw() {
  background(239, 241, 231);
  clearRiso();

  imageMode(CORNER);

  if (!img) {
    drawMessage("Upload an image first");
    return;
  }

  let centeredImage = makeCenteredImage(img);

  if (!generated) {
    image(centeredImage, 0, 0);

    fill(40);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text("Choose colors, then click Generate", width / 2, height - 30);
    return;
  }

  let gray = toGray(centeredImage);
  gray.filter(POSTERIZE, 4);
  gray.filter(BLUR, 0.5);

  let ht1 = halftoneImage(gray, 15, 8);
  let ht2 = halftoneImage(gray, -15, 8);

  let t = millis() * 0.01;
  let dx = sin(t * 0.8) * 3;
  let dy = cos(t * 0.6) * 3;

  layer1.image(ht1, dx, dy);
  layer2.image(ht2, -dx, -dy);

  drawRiso();
}

function handleUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  const url = URL.createObjectURL(file);

  loadImage(url, function (loadedImg) {
    img = loadedImg;
    generated = false;
    console.log("image uploaded");
  });
}

function generateRiso() {
  if (!img) {
    alert("Please upload an image first.");
    return;
  }

  let color1 = document.getElementById("color1").value;
  let color2 = document.getElementById("color2").value;

  layer1 = new Riso(color1);
  layer2 = new Riso(color2);

  generated = true;

  console.log("riso generated");
}

function makeCenteredImage(src) {
  let g = createGraphics(width, height);

  g.background(255);

  let ratio = min(width / src.width, height / src.height);
  let w = src.width * ratio;
  let h = src.height * ratio;

  let x = (width - w) / 2;
  let y = (height - h) / 2;

  g.image(src, x, y, w, h);

  return g;
}

function toGray(src) {
  let g = createGraphics(width, height);

  g.background(255);
  g.image(src, 0, 0);
  g.filter(GRAY);

  return g;
}

function halftoneImage(src, angle, step) {
  let dotLayer = createGraphics(width, height);

  dotLayer.clear();

  src.loadPixels();

  dotLayer.push();

  dotLayer.translate(width / 2, height / 2);
  dotLayer.rotate(radians(angle));
  dotLayer.translate(-width / 2, -height / 2);

  dotLayer.noStroke();
  dotLayer.fill(0);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let index = (x + y * width) * 4;

      let r = src.pixels[index];
      let g = src.pixels[index + 1];
      let b = src.pixels[index + 2];

      let brightness = (r + g + b) / 3;

      let size = map(brightness, 0, 255, step, 0);

      if (size > 0.3) {
        dotLayer.circle(x, y, size);
      }
    }
  }

  dotLayer.pop();

  return dotLayer;
}

function drawMessage(msg) {
  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(msg, width / 2, height / 2);
}