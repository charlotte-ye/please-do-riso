let img = null;
let previewImage = null;
let halftoneLayer1 = null;
let halftoneLayer2 = null;
let layer1 = null;
let layer2 = null;
let generated = false;

const CANVAS_SIZE = 600;
const PAPER_COLOR = [239, 241, 231];
let updateTimer = null;

function setup() {
  pixelDensity(1);

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  canvas.parent("canvas-holder");

  document.getElementById("upload").addEventListener("change", handleUpload);
  document.getElementById("generateBtn").addEventListener("click", generateRiso);

  document.getElementById("color1").addEventListener("change", updateEffectLive);
  document.getElementById("color2").addEventListener("change", updateEffectLive);
  document.getElementById("dotSize").addEventListener("input", scheduleDotUpdate);

  // The preview is static until the user changes a control.
  // This avoids unnecessary work on phones.
  noLoop();
}

function draw() {
  background(...PAPER_COLOR);
  imageMode(CORNER);

  if (!img || !previewImage) {
    drawMessage("Upload an image first");
    return;
  }

  if (!generated) {
    image(previewImage, 0, 0);
    drawBottomMessage("Choose colors, then click Generate");
    return;
  }

  clearRiso();

  // A small fixed offset imitates Riso misregistration.
  layer1.image(halftoneLayer1, 1.5, 1.5);
  layer2.image(halftoneLayer2, -1.5, -1.5);
  drawRiso();
}

function handleUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  generated = false;
  const objectURL = URL.createObjectURL(file);

  loadImage(
    objectURL,
    (loadedImage) => {
      img = loadedImage;
      previewImage = makeCenteredImage(img);
      halftoneLayer1 = null;
      halftoneLayer2 = null;
      URL.revokeObjectURL(objectURL);
      redraw();
    },
    () => {
      URL.revokeObjectURL(objectURL);
      alert("The image could not be loaded. Please try a PNG or JPG file.");
    }
  );
}

function generateRiso() {
  if (!img || !previewImage) {
    alert("Please upload an image first.");
    return;
  }

  buildEffect();
}

function buildEffect() {
  const color1 = document.getElementById("color1").value;
  const color2 = document.getElementById("color2").value;
  const dotSize = Number(document.getElementById("dotSize").value);

  // Remove every old channel before making the new pair.
  // This prevents layers from accumulating after repeated clicks.
  Riso.channels = [];
  layer1 = new Riso(color1);
  layer2 = new Riso(color2);

  // Image processing happens once per click instead of 60 times per second.
  // This makes the page much more reliable on phones.
  const gray = toGray(previewImage);
  gray.filter(POSTERIZE, 4);
  gray.filter(BLUR, 0.5);

  halftoneLayer1 = makeHalftone(gray, 15, dotSize);
  halftoneLayer2 = makeHalftone(gray, -15, dotSize);
  generated = true;
  redraw();
}

function updateEffectLive() {
  if (generated) buildEffect();
}

function scheduleDotUpdate() {
  if (!generated) return;

  clearTimeout(updateTimer);
  updateTimer = setTimeout(buildEffect, 50);
}

function makeCenteredImage(source) {
  const graphic = createGraphics(width, height);
  graphic.pixelDensity(1);
  graphic.background(255);
  graphic.imageMode(CORNER);

  const imageArea = width - 100;
  const ratio = min(imageArea / source.width, imageArea / source.height);
  const imageWidth = source.width * ratio;
  const imageHeight = source.height * ratio;
  const x = (width - imageWidth) / 2;
  const y = (height - imageHeight) / 2;

  graphic.image(source, x, y, imageWidth, imageHeight);
  return graphic;
}

function toGray(source) {
  const graphic = createGraphics(width, height);
  graphic.pixelDensity(1);
  graphic.background(255);
  graphic.image(source, 0, 0);
  graphic.filter(GRAY);
  return graphic;
}

function makeHalftone(source, angleInDegrees, step) {
  const dots = createGraphics(width, height);
  dots.pixelDensity(1);

  // p5.riso converts white pixels to transparent ink and black pixels to
  // opaque ink. A white background is essential; clear() can become black.
  dots.background(255);
  dots.noStroke();
  dots.fill(0);

  source.loadPixels();

  const angle = radians(angleInDegrees);
  const cosAngle = cos(angle);
  const sinAngle = sin(angle);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = ceil(sqrt(width * width + height * height) / 2) + step;

  // Rotate the dot grid mathematically and only draw points that land inside
  // the canvas. This avoids the visible tilted-square edges from the old code.
  for (let gridY = -radius; gridY <= radius; gridY += step) {
    for (let gridX = -radius; gridX <= radius; gridX += step) {
      const x = centerX + gridX * cosAngle - gridY * sinAngle;
      const y = centerY + gridX * sinAngle + gridY * cosAngle;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const sampleX = constrain(floor(x), 0, width - 1);
      const sampleY = constrain(floor(y), 0, height - 1);
      const index = (sampleX + sampleY * width) * 4;

      const red = source.pixels[index];
      const green = source.pixels[index + 1];
      const blue = source.pixels[index + 2];
      const brightness = (red + green + blue) / 3;
      const dotSize = map(brightness, 0, 255, step, 0);

      if (dotSize > 0.3) {
        dots.circle(x, y, dotSize);
      }
    }
  }

  return dots;
}

function drawMessage(message) {
  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(message, width / 2, height / 2);
}

function drawBottomMessage(message) {
  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text(message, width / 2, height - 30);
}
