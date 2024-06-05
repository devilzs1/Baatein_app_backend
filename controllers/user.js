const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");

exports.getMe = catchAsync(async (req, res, next) => {
  // console.log("I",req.user_id);

  const user = await User.findById(req.user_id).select(
    "_id firstName lastName about"
  );
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }
  console.log(user);

  res.status(200).json({
    status: "success",
    data: user,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, "firstName", "lastName", "about");
  const userDoc = await User.findByIdAndUpdate(req.user._id, filteredBody);
  res.status(200).json({
    status: "success",
    data: userDoc,
    message: "Profile Updated successfully",
  });
});

exports.getUsers = catchAsync(async (req, res, next) => {
  const allUsers = await User.find(
    { verified: true, _id: { $ne: req.user._id } },
    { firstName: 1, lastName: 1 }
  );
  const remainingUsers = allUsers.filter(
    (user) => !req.user.friends.includes(user._id)
  );
  res.status(200).json({
    status: "success",
    data: remainingUsers,
    message: "Users found successfully!",
  });
});

exports.getFriends = catchAsync(async (req, res, next) => {
  const thisUser = await User.findById(req.user._id).populate(
    "friends",
    "_id firstName lastName"
  );
  res.status(200).json({
    status: "success",
    data: thisUser.friends,
    message: "Friends found successfully!",
  });
});

exports.getRequests = catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({
    recipient: req.user._id,
  }).populate("sender", "_id firstName lastName");
  res.status(200).json({
    status: "success",
    data: requests,
    message: "Requests found successfully!",
  });
});

exports.getAllVerifiedUsers = catchAsync(async (req, res, next) => {
  const allUsers = await User.find(
    { verified: true, _id: { $ne: req.user._id } },
    { firstName: 1, lastName: 1 }
  );
  res.status(200).json({
    status: "success",
    data: allUsers,
    message: "Users found successfully!",
  });
});
