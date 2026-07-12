import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"; // Fixed case
import { uploadOnCLoudinary } from "../utils/cloudinary.js"; // Make sure spelling matches cloudinary.js
import { ApiResponse } from "../utils/ApiResponse.js";

// register user function
const registerUser = asyncHandler(async (req, res) => {
  // 1. Getting user details
  const {fullname, email, username, password } = req.body;

  // 2. Validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Invalid email: '@' is missing!");
  }

  // 3. Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  console.log(req.files);

  // 4. Check for images
  // Added optional chaining (?.) before [0] to prevent crashes
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } // Safe extraction

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // 5. Upload to Cloudinary
  const avatar = await uploadOnCLoudinary(avatarLocalPath);

  let coverImage = "";
  if (coverImageLocalPath) {
    coverImage = await uploadOnCLoudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar on Cloudinary");
  }

  // 6. Create user object in DB
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // Agar cover image nahi hai, toh khali string save hogi
    email,
    password,
    username: username.toLowerCase(),
  });

  // 7. Remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 8. Check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 9. Return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

export { registerUser };
