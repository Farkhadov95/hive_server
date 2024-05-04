import express from "express";
import _ from "lodash";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import auth from "../middleware/auth.js";

const router = express.Router();

//get user by ID
router.get("/:id", [], async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id).select("-password");
  if (!user) res.status(400).send("Invalid user ID");
  res.send(user);
});

// register new user
router.post("/", async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registered");

  user = new User(_.pick(req.body, ["username", "email", "password"]));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  const token = user.generateAuthToken();
  await user.save();

  res
    .header("X-Auth-Token", token)
    .send(_.pick(user, ["_id", "username", "email", "isAdmin", "createdAt"]));
});

// login user
router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Invalid email or password");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("Invalid email or password");

  const token = user.generateAuthToken();

  res
    .header("X-Auth-Token", token)
    .send(_.pick(user, ["_id", "username", "email", "isAdmin", "createdAt"]));
});

// get all users
router.get("/", async (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  const users = await User.find()
    .skip((pageNumber - 1) * pageSize)
    .limit(10)
    .sort({ name: 1 })
    .select("-password");
  res.send(users);
});

// change status for users
router.put("/", [auth], async (req, res) => {
  const { users, status } = req.body;
  try {
    const usersToUpdate = await User.find({ _id: { $in: users } }).select(
      "-password"
    );
    usersToUpdate.forEach(async (user) => {
      user.isAdmin = status;
      await user.save();
    });
    res.send(usersToUpdate);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// delete users
router.delete("/", [auth], async (req, res) => {
  const users = req.body;
  try {
    await User.deleteMany({ _id: { $in: users } });
    res.send("Users deleted successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
