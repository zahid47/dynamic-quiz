import { Router } from "express";
import {
  createUserController,
  updateUserController,
  deleteUserController,
  getUserController,
  getUsersController,
  verifyEmailController,
  sendVerificationEmailController,
} from "./user.controller";
import protect from "../../middlewares/protect";
import validate from "../../middlewares/validate";
import {
  createUserSchema,
  deleteUserSchema,
  getUserSchema,
  getUsersSchema,
  sendVerificationEmailSchema,
  updateUserSchema,
  verifyEmailSchema,
} from "./user.schema";

const router = Router();

router
  .route("/")
  .post(validate(createUserSchema), createUserController)
  .get(protect("admin"), validate(getUsersSchema), getUsersController);

// router
//   .route("/verify/:code")
//   .get(validate(verifyEmailSchema), verifyEmailController);
// router
//   .route("/verify")
//   .get(validate(sendVerificationEmailSchema), sendVerificationEmailController);

router
  .route("/:id")
  .get(protect("admin"), validate(getUserSchema), getUserController)
  .put(protect("user"), validate(updateUserSchema), updateUserController)
  .delete(protect("user"), validate(deleteUserSchema), deleteUserController);

export default router;
