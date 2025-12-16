import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed =
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (allowed) cb(null, true);
  else cb(new Error("Only Excel (.xlsx) files allowed"), false);
};

export default multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
