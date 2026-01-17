import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";

const storage = new CloudinaryStorage({
 cloudinary,
  params: {
    folder: "mof-users",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

export const upload = multer({ storage });
