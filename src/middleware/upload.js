const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary.config");

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const normalizePublicId = (originalname = "") => {
  const fileNameWithoutExt = originalname.replace(/\.[^/.]+$/, "");
  return fileNameWithoutExt
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "documents/pdf",
    resource_type: "raw",
    public_id: `${normalizePublicId(file.originalname) || "document"}-${Date.now()}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const isPdfMime = file?.mimetype === "application/pdf";
  const isPdfExt = /\.pdf$/i.test(file?.originalname || "");

  if (isPdfMime && isPdfExt) {
    return cb(null, true);
  }

  return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "pdfFile"));
};

const pdfUpload = multer({
  storage,
  limits: {
    fileSize: MAX_PDF_SIZE_BYTES,
  },
  fileFilter,
});

module.exports = { pdfUpload, MAX_PDF_SIZE_BYTES };
