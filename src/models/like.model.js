import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { plugin } from "./../../node_modules/mongoose/types/index.d";

const likeSchema = mongoose.Schema(
  {
    comment: {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: mongoose.Types.ObjectId,
      ref: "Video",
    },
    likedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    tweet : {
      type: mongoose.Types.ObjectId,
      ref: "Tweets",
    },
  },
  { timestamps: true }
);

likeSchema.plugin(mongooseAggregatePaginate);
export const Like = mongoose.model("Like", likeSchema);
