import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { TravelEntry } from "../models/travelEntry.model.js";

const createPost = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required.");
  }

  let visualMemoriesLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.visualMemories) &&
    req.files.visualMemories.length > 0
  ) {
    visualMemoriesLocalPath = req.files.visualMemories;
  }

  let visualMemories = [];
  for (const file of visualMemoriesLocalPath) {
    const uploadedFile = await uploadOnCloudinary(file.path); // Await the upload
    visualMemories.push({
      url: uploadedFile.url,
      public_id: uploadedFile.public_id,
    }); // Add the result to the array
  }

  const travelEntry = await TravelEntry.create({
    title,
    description,
    visualMemories: visualMemories || [],
  });

  const createdtravelEntry = await TravelEntry.findById(travelEntry._id);

  if (!travelEntry) {
    throw new ApiError(500, "Error creating entry.");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, createdtravelEntry, "Entry Created successfully")
    );
});

const editPost = asyncHandler(async (req, res) => {
  const { post } = req.params;
  const { title, description } = req.body;

  if (!post) {
    throw new ApiError(400, "Post id is missing");
  }

  const updatedTravelEntry = await TravelEntry.findByIdAndUpdate(
    post,
    { title, description },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTravelEntry, "Post Deleted successfully")
    );
});

const deletePost = asyncHandler(async (req, res) => {
  const { post } = req.params;

  const travelEntry = await TravelEntry.findById(post);

  if (!travelEntry) {
    throw new ApiError(404, "Post not found");
  }

  // Delete associated visual memories
  travelEntry.visualMemories.forEach(async (visualMemory) => {
    await deleteOnCloudinary(visualMemory.public_id); // Delete the file
  });

  const deletedTravelEntry = await TravelEntry.findByIdAndDelete(post);

  if (!deletedTravelEntry) {
    throw new ApiError(401, "Error Deleting file");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post Deleted successfully"));
});

const getAllPosts = asyncHandler(async (req, res) => {
  const travelEntries = await TravelEntry.find();

  return res
    .status(200)
    .json(new ApiResponse(200, travelEntries, "Entries Fetched successfully"));
});

const getCurrentPost = asyncHandler(async (req, res) => {
  const { post } = req.params;

  if (!post) {
    throw new ApiError(400, "Post id is missing");
  }

  const travelEntry = await TravelEntry.findById(post);

  if (!travelEntry) {
    throw new ApiError(404, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, travelEntry, "Entry fetched successfully"));
});

export { createPost, deletePost, editPost, getAllPosts, getCurrentPost };
