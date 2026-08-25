import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDir = path.resolve("./temp");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadDir);
  },
  filename(_req, file, callback) {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "-");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const isPdf = file.mimetype === "application/pdf";
  const isSupportedImage = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
  if (isPdf || isSupportedImage) {
    callback(null, true);
    return;
  }
  callback(new Error("Only PDF, PNG, JPEG, and WebP files are allowed."));
};

export default multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
