import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const travelEntrySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    visualMemories: {
      type: Array,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

travelEntrySchema.plugin(mongooseAggregatePaginate);

export const TravelEntry = mongoose.model("TravelEntry", travelEntrySchema);
