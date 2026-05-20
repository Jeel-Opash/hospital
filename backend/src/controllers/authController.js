import userModel from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";
import { controller, ok } from "../utils/controller.js";

export const register = controller(async (req, res) => {
  const { username, email, role, password } = req.body;
  if ([email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await userModel.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with username or email already exist");
  }
  const user = await userModel.create({
    username,email,
    password,
    role,
  });
  const token = user.generateToken();
  const createdUser = await userModel.findById(user._id).select("-password");
  res.cookie("token", token);
  return ok(
    { user: createdUser, token },
    "User Register Successfully",
  );
});

export const login = controller(async (req, res) => {
  const { email, password } = req.body;
  if ([email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const findUser = await userModel.findOne({ email });
  if (!findUser) {
    throw new ApiError(400, "Invalid Credientials");
  }
  const isPasswordCorrect = await findUser.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Credientials");
  }
  const token = findUser.generateToken();

  const loggedInUser = await userModel
    .findById(findUser._id)
    .select("-password");

  res.cookie("token", token);
  return ok(
    { user: loggedInUser, token },
    "User LoggedIn Successfully",
  );
});

export const logout = controller(async (req, res) => {
  res.clearCookie("token");
  return ok("User Logged Out Succesfully");
});

export const getMe = controller(async (req, res) => {
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(400, "userId not found");
  }
  const user = await userModel.findById(userId).select("-password");
  return ok(user, "User fetch Successfully");
});
