const router = require("express").Router();

const authController = require("../controllers/auth");
const userController = require("../controllers/user");

router.get("/get-me", authController.protect, userController.getMe);
router.patch("/update-me", authController.protect, userController.updateMe);
router.get(
  "/get-all-verified-users",
  authController.protect,
  userController.getAllVerifiedUsers
);
router.get("/get-users", authController.protect, userController.getUsers);
router.get("/get-friends", authController.protect, userController.getFriends);
router.get(
  "/get-friend-requests",
  authController.protect,
  userController.getRequests
);

module.exports = router;
