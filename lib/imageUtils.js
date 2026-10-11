// Förminskar en bild och kodar om den som JPEG.
// Omkodningen via canvas tar bort all EXIF-data, inklusive GPS-position.
export async function resizeToJpeg(file, maxSize, quality) {
  let bitmap;
  try {
    // "from-image" vänder mobilbilder rätt enligt deras EXIF-orientering.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("BILDFEL");
  }

  try {
    // Förstora aldrig, bara förminska så att längsta sidan blir högst maxSize.
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // Vit bakgrund så att genomskinliga PNG:er inte blir svarta i JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("BILDFEL"))),
        "image/jpeg",
        quality
      );
    });
  } finally {
    bitmap.close();
  }
}
