import jwt from "jsonwebtoken";
import config from "config";
import User from "../models/user.js";

export default async function auth(req, res, next) {
  const token = req.header("X-Auth-Token");
  if (token) {
    try {
      const decoded = jwt.verify(token, config.get("jwtPrivateKey"));

      const decodedUserID = decoded._id;
      const user = await User.findById(decodedUserID);

      if (user) {
        req.user = user;
        next();
      } else {
        res.status(403).send("Access denied. User is not authorized.");
      }
    } catch (ex) {
      res.status(400).send("Invalid token.");
    }
  } else {
    res.status(401).send("Access denied. No token provided.");
  }
}
