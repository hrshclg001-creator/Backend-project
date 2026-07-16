import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCLoudinary } from "../utils/cloudinary.js";

// // 1. Publish a Video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // Validation
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title and description are required");
  }
  // Multer se files nikalna
  let videoFileLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }
  let thumbnailFileLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailFileLocalPath = req.files.thumbnail[0].path;
  }
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is missing");
  }
  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }
  // uploading files on cloudinary
  const videoFile = await uploadOnCLoudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCLoudinary(thumbnailFileLocalPath);

  if (!videoFile?.url) {
    throw new ApiError(400, "Error while uploading video on Cloudinary");
  }
  if (!thumbnail?.url) {
    throw new ApiError(400, "Error while uploading thumbnail on Cloudinary");
  }

  // saving to database
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    isPublished: true,
    owner: req.user._id,
  });
  const createdVideo = await Video.findById(video._id);
  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully"));
});
// get All videos
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    });
  }

  if (userId) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }
  // 4. Hamesha sirf wahi videos dikhao jo "isPublished: true" hain (Private videos hide karo)
  pipeline.push({
    $match: {
      owner: new mongoose.Types.ObjectId(userId),
    },
  });
  // 5. Sorting (Ascending ya Descending)
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }

  const videoAggregate = Video.aggregate(pipeline);
  // 7. Pagination ke options set karo

  const options = {
    // converting the strings to numbers
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched Successfully."));
});

// get a video by id

export { publishAVideo, getAllVideos };
