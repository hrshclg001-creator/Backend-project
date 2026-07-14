import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"; // Fixed case
import { uploadOnCLoudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
// register user function
const registerUser = asyncHandler(async (req, res) => {
  // 1. Getting user details
  const { fullname, email, username, password } = req.body;

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
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    // user.save() -> Normal save (Poori checking hogi).
    //user.save({ validateBeforeSave: false }) -> Yeh Mongoose ka hi ek built-in feature/option hai jo Mongoose ko signal deta hai ki validation steps ko skip kar do.
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something wnet wrong while generating the refresh tokens and access tokens."
    );
  }
};

// login user function
const loginUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username and Email are required !");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user password.");
  }
  //User : use it when we use moongoose methods
  // user : use it when you use custom methods

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // options for cookies
  const options = {
    //By this code the cookies can only be modified by server.
    httpOnly: true,
    secure: true,
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
        "User LoggedIn Successfuly"
      )
    );
});

//logout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
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
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //Step 1: Extract Refresh Token
  const incomingrefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingrefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  //Step 2: Decode & Verify Token
  try {
    const decodedToken = jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //Step 3: Find User & Validate
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Unauthorized request");
    }
    // Compare incoming token with stored token in DB
    if (incomingrefreshToken !== user?.refreshToken) {
      throw new ApiError(401, " refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    //Step 5: Generate New Tokens
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    // Send in response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successsfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refreshToken");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
