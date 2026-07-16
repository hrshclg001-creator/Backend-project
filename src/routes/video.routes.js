import { Router } from "express";


import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos, publishAVideo } from "../controllers/video.controller.js";

const videoRouter = Router();

videoRouter.use(verifyJWT);// Ab iske neeche jitne bhi routes honge, sab par apne aap verifyJWT lag jayega

videoRouter.route("/").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);
videoRouter.route("/get-all-videos").get(getAllVideos);
export default videoRouter;