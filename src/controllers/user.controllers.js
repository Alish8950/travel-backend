import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  const { fullName, email, username, password } = req.body;

  // validation - not empty

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  //check is user already exists

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists.");
  }
  // if (existingUser.username) {
  //   throw new ApiError(409, "Username already exists.");
  // }

  //check for images, check for avatar - empty

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.converImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar is required.");
  // }

  //upload them to cloudinary, check avatar -empty

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if (!avatar) {
  //   throw new ApiError(400, "Avatar is required.");
  // }

  //create user object - create entry in db

  const user = await User.create({
    fullName,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password and refresh token field from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check for user creation

  if (!createdUser) {
    throw new ApiError(500, "Error creating user.");
  }

  //send response with user data

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, password, username } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User is not registered");
  }

  const isUserValidate = await user.isPasswordCorrect(password);

  if (!isUserValidate) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  console.log("logged in user", loggedInUser);

  const options = {
    httpOnly: true,
    secure: true, //So that cookies can only be managed from server/backend side
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.body._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true, //So that cookies can only be managed from server/backend side
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// const refreshAccessToken = asyncHandler(async (req, res) => {
//   try {
//     const incomingRefreshToken =
//       req.cookies.refreshToken || req.body.refreshToken;

//     if (!incomingRefreshToken) {
//       throw new ApiError(401, "Unauthorizes request");
//     }

//     const decodedToken = jwt.verify(
//       incomingRefreshToken,
//       process.env.REFRESH_TOKEN_SECRET
//     );

//     console.log(decodedToken);

//     const user = await User.findById(decodedToken?.id);

//     console.log(user);

//     if (!user) {
//       throw new ApiError(401, "Invalid Refresh Token");
//     }

//     if (incomingRefreshToken !== user?.refreshToken) {
//       throw new ApiError(401, "Refresh Token is expired or used");
//     }

//     const { newAccessToken, newRefreshToken } = generateAccessAndRefreshToken(
//       user._id
//     );

//     console.log(newAccessToken, newRefreshToken);

//     const options = {
//       httpOnly: true,
//       secure: true,
//     };

//     return res
//       .status(200)
//       .cookie("accessToken", newAccessToken, options)
//       .cookie("refreshToken", newRefreshToken, options)
//       .json(
//         new ApiResponse(
//           200,
//           { newAccessToken, newRefreshToken },
//           "Access token refreshed"
//         )
//       );
//   } catch (error) {
//     throw new ApiError(401, error?.message || "Mujhe nahi pta");
//   }
// });

const refreshAccessToken = asyncHandler(async (req, res) => {
  console.log(req.cookies.refreshToken, "cookies");
  console.log(req.body.refreshToken, "body");

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  console.log(accessToken, refreshToken);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed"
      )
    );
  try {
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// const changeCurrentPassword = asyncHandler(async (req, res) => {
//   const { oldPassword, newPassword } = req.body;

//   const user = await User.findById(req.user?._id);

//   console.log( "This is me", req.user);

//   if (!user) {
//     throw new ApiError(401, "Cannot find user");
//   }
//   const isPasswordValid = user.isPasswordCorrect(oldPassword);

//   if (!isPasswordValid) {
//     throw new ApiError(400, "Invalid old password");
//   }

//   user.password = newPassword;

//   await user.save({ validateBeforeSave: false });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password changed successfully"));
// });

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  // console.log(req.user);

  if (!user) {
    throw new ApiError(401, "Cannot find user");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  console.log(req.body);
  

  if(!userId) { 
    throw new ApiError(400, "User Id is missing")
  }

  const user = await User.findById(userId);

  if(!user) {
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(
      200,
      new ApiResponse(200, user, "Current user fetched successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
      },
      // isSubscribed: {
      //   $cond: {
      //     if: { $in: [req.user?._id, "$subscribers.subscriber"] },
      //     then: true,
      //     else: false,
      //   },
      // },
      isSubscribed: {
        $cond: {
          if: { $if: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel doesn't exists");
  }

  console.log("channel is here", channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

export {
  registerUser,
  getAllUsers,
  logoutUser,
  loginUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
};
