let img = null;
let previewImage = null;
let halftoneLayer1 = null;
let halftoneLayer2 = null;
let layer1 = null;
let layer2 = null;
let generated = false;
let updateTimer = null;

let paperColor = "#fcfaf0";
let transparentBackground = false;

const RATIO_OPTIONS = {
  square: {
    previewWidth: 600,
    previewHeight: 600,
    exportWidth: 1200,
    exportHeight: 1200,
    fileLabel: "square"
  },
  landscape: {
    previewWidth: 600,
    previewHeight: 450,
    exportWidth: 1600,
    exportHeight: 1200,
    fileLabel: "landscape-4x3"
  },
  portrait: {
    previewWidth: 450,
    previewHeight: 600,
    exportWidth: 1200,
    exportHeight: 1600,
    fileLabel: "portrait-3x4"
  }
};

function setup() {
  pixelDensity(1);

  const initialRatio = getRatioSettings();
  const canvas = createCanvas(
    initialRatio.previewWidth,
    initialRatio.previewHeight
  );
  canvas.parent("canvas-holder");

  document.getElementById("upload").addEventListener("change", handleUpload);
  document.getElementById("generateBtn").addEventListener("click", generateRiso);
  document.getElementById("saveBtn").addEventListener("click", savePNG);
  document.getElementById("color1").addEventListener("change", updateEffectLive);
  document.getElementById("color2").addEventListener("change", updateEffectLive);
  document.getElementById("dotSize").addEventListener("input", scheduleDotUpdate);
  document.getElementById("canvasRatio").addEventListener("change", changeCanvasRatio);
  document.getElementById("backgroundColor").addEventListener("input", useCustomBackground);

  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", usePresetBackground);
  });

  // Draw only when a control changes. This is more reliable on phones.
  noLoop();
}

function draw() {
  drawSelectedBackground();
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
  layer1.image(halftoneLayer1, 1.5, 1.5);
  layer2.image(halftoneLayer2, -1.5, -1.5);
  drawRiso();
}

function drawSelectedBackground() {
  if (transparentBackground) {
    clear();
  } else {
    background(paperColor);
  }
}

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  generated = false;
  document.getElementById("saveBtn").disabled = true;

  const objectURL = URL.createObjectURL(file);

  loadImage(
    objectURL,
    (loadedImage) => {
      img = loadedImage;
      previewImage = makeCenteredImage(img, width, height);
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

  buildPreviewEffect();
}

function buildPreviewEffect() {
  const color1 = document.getElementById("color1").value;
  const color2 = document.getElementById("color2").value;
  const dotSize = Number(document.getElementById("dotSize").value);

  Riso.channels = [];
  layer1 = new Riso(color1, width, height);
  layer2 = new Riso(color2, width, height);

  const gray = prepareGrayImage(previewImage, width, height);
  halftoneLayer1 = makeHalftone(gray, 15, dotSize, width, height);
  halftoneLayer2 = makeHalftone(gray, -15, dotSize, width, height);

  generated = true;
  document.getElementById("saveBtn").disabled = false;
  redraw();
}

function updateEffectLive() {
  if (generated) buildPreviewEffect();
}

function scheduleDotUpdate() {
  if (!generated) return;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(buildPreviewEffect, 50);
}

function changeCanvasRatio() {
  const ratio = getRatioSettings();
  resizeCanvas(ratio.previewWidth, ratio.previewHeight);

  if (img) {
    previewImage = makeCenteredImage(img, width, height);
  }

  if (generated) {
    buildPreviewEffect();
  } else {
    redraw();
  }
}

function getRatioSettings() {
  const ratioName = document.getElementById("canvasRatio").value;
  return RATIO_OPTIONS[ratioName];
}

function useCustomBackground(event) {
  paperColor = event.target.value;
  transparentBackground = false;
  markSelectedBackground(paperColor);
  redraw();
}

function usePresetBackground(event) {
  const selectedBackground = event.currentTarget.dataset.background;
  transparentBackground = selectedBackground === "transparent";

  if (!transparentBackground) {
    paperColor = selectedBackground;
    document.getElementById("backgroundColor").value = paperColor;
  }

  markSelectedBackground(selectedBackground);
  redraw();
}

function markSelectedBackground(selectedBackground) {
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle(
      "selected",
      swatch.dataset.background === selectedBackground
    );
  });
}

function makeCenteredImage(source, targetWidth, targetHeight) {
  const graphic = createGraphics(targetWidth, targetHeight);
  graphic.pixelDensity(1);
  graphic.clear();
  graphic.imageMode(CORNER);

  const padding = min(targetWidth, targetHeight) / 12;
  const availableWidth = targetWidth - padding * 2;
  const availableHeight = targetHeight - padding * 2;
  const ratio = min(
    availableWidth / source.width,
    availableHeight / source.height
  );

  const imageWidth = source.width * ratio;
  const imageHeight = source.height * ratio;
  const x = (targetWidth - imageWidth) / 2;
  const y = (targetHeight - imageHeight) / 2;

  graphic.image(source, x, y, imageWidth, imageHeight);
  return graphic;
}

function prepareGrayImage(source, targetWidth, targetHeight) {
  const graphic = createGraphics(targetWidth, targetHeight);
  graphic.pixelDensity(1);
  graphic.background(255);
  graphic.image(source, 0, 0);
  graphic.filter(GRAY);
  graphic.filter(POSTERIZE, 4);
  graphic.filter(BLUR, 0.5);
  return graphic;
}

function makeHalftone(source, angleInDegrees, step, targetWidth, targetHeight) {
  const dots = createGraphics(targetWidth, targetHeight);
  dots.pixelDensity(1);
  dots.background(255);
  dots.noStroke();
  dots.fill(0);

  source.loadPixels();

  const angle = radians(angleInDegrees);
  const cosAngle = cos(angle);
  const sinAngle = sin(angle);
  const centerX = targetWidth / 2;
  const centerY = targetHeight / 2;
  const radius = ceil(
    sqrt(targetWidth * targetWidth + targetHeight * targetHeight) / 2
  ) + step;

  for (let gridY = -radius; gridY <= radius; gridY += step) {
    for (let gridX = -radius; gridX <= radius; gridX += step) {
      const x = centerX + gridX * cosAngle - gridY * sinAngle;
      const y = centerY + gridX * sinAngle + gridY * cosAngle;

      if (x < 0 || x >= targetWidth || y < 0 || y >= targetHeight) continue;

      const sampleX = constrain(floor(x), 0, targetWidth - 1);
      const sampleY = constrain(floor(y), 0, targetHeight - 1);
      const index = (sampleX + sampleY * targetWidth) * 4;

      const red = source.pixels[index];
      const green = source.pixels[index + 1];
      const blue = source.pixels[index + 2];
      const brightness = (red + green + blue) / 3;
      const dotDiameter = map(brightness, 0, 255, step, 0);

      if (dotDiameter > 0.3) {
        dots.circle(x, y, dotDiameter);
      }
    }
  }

  return dots;
}

function savePNG() {
  if (!generated || !img) {
    alert("Please generate a Riso effect first.");
    return;
  }

  const saveButton = document.getElementById("saveBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Preparing…";

  setTimeout(() => {
    try {
      exportSelectedPNG();
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save PNG";
    }
  }, 30);
}

function exportSelectedPNG() {
  const ratio = getRatioSettings();
  const color1 = document.getElementById("color1").value;
  const color2 = document.getElementById("color2").value;
  const previewDotSize = Number(document.getElementById("dotSize").value);

  const exportWidth = ratio.exportWidth;
  const exportHeight = ratio.exportHeight;
  const exportScale = exportWidth / ratio.previewWidth;
  const exportDotSize = previewDotSize * exportScale;
  const exportOffset = 1.5 * exportScale;

  const exportSource = makeCenteredImage(img, exportWidth, exportHeight);
  const exportGray = prepareGrayImage(exportSource, exportWidth, exportHeight);
  const exportHalftone1 = makeHalftone(
    exportGray,
    15,
    exportDotSize,
    exportWidth,
    exportHeight
  );
  const exportHalftone2 = makeHalftone(
    exportGray,
    -15,
    exportDotSize,
    exportWidth,
    exportHeight
  );

  const previewChannels = Riso.channels;
  Riso.channels = [];

  const exportLayer1 = new Riso(color1, exportWidth, exportHeight);
  const exportLayer2 = new Riso(color2, exportWidth, exportHeight);
  exportLayer1.image(exportHalftone1, exportOffset, exportOffset);
  exportLayer2.image(exportHalftone2, -exportOffset, -exportOffset);

  const output = createGraphics(exportWidth, exportHeight);
  output.pixelDensity(1);

  if (transparentBackground) {
    output.clear();
  } else {
    output.background(paperColor);
  }

  output.blendMode(MULTIPLY);
  output.image(exportLayer1, 0, 0);
  output.image(exportLayer2, 0, 0);
  output.blendMode(BLEND);

  const transparentLabel = transparentBackground ? "-transparent" : "";
  const fileName = `please-do-riso-${ratio.fileLabel}${transparentLabel}`;
  saveCanvas(output.canvas, fileName, "png");

  Riso.channels = previewChannels;
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
