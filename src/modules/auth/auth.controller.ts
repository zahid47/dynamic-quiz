import { Request, Response, NextFunction } from "express";
import { omit } from "lodash";
import { loginType, refreshAccessTokenType } from "./auth.schema";
import createError from "../../utils/createError";
import { verifyToken, generateAuthTokens } from "../../utils/jwt";
import log from "../../utils/logger";
import refreshCookieOptions from "../../utils/refreshCookieOptions";
import User from "../user/user.model";
import { userDocument } from "../user/user.type";
import config from "../../utils/config";

interface verifyEmailPassReturnType {
  valid: boolean;
  status: number;
  context?: string;
  message?: string;
  user?: userDocument;
}

export const verifyEmailPass = async (
  email: string,
  password: string
): Promise<verifyEmailPassReturnType> => {
  //email exists?
  const user = await User.findOne({ email });
  if (!user)
    return {
      valid: false,
      status: 404,
      context: "email",
      message: "email not found",
    };

  // //email verified?
  // if (!user.verified)
  //   return {
  //     valid: false,
  //     status: 401,
  //     context: "email",
  //     message: "email not verified",

  //   };

  //password correct?
  const isMatched = await user.comparePassword(password);
  if (!isMatched)
    return {
      valid: false,
      status: 401,
      context: "password",
      message: "incorrect password",
    };

  //all good!
  return {
    valid: true,
    status: 200,
    user,
  };
};

export const loginController = async (
  req: Request<{}, {}, loginType["body"]>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const result = await verifyEmailPass(email, password);

    if (!result.valid) {
      return next(createError(result.status, result.context, result.message));
    }

    const user = result.user!; //at this point we are sure that we have a user
    const { accessToken, refreshToken } = generateAuthTokens(
      user.id,
      user.role
    );

    //send tokens
    // res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    return res.status(200).json({ accessToken, refreshToken });
  } catch (err: any) {
    log.error(err);
    return next(err);
  }
};

export const getMeController = (
  _req: Request<{}, {}, loginType["body"]>,
  res: Response,
  next: NextFunction
) => {
  try {
    return res
      .status(200)
      .json(omit(res.locals.user.toJSON(), ["password", "__v"]));
  } catch (err: any) {
    log.error(err);
    return next(err);
  }
};

export const refreshAccessTokenController = (
  req: Request<refreshAccessTokenType["params"]>,
  res: Response,
  next: NextFunction
) => {
  try {
    // const refToken = req.cookies.refreshToken; // FIXME
    const refToken = req.params.refreshToken;
    const secret = config.REFRESH_SECRET;
    try {
      const { valid, expired, payload } = verifyToken(refToken, secret);

      if (expired) return next(createError(401, "jwt", "refreshToken expired"));
      if (!valid) return next(createError(401, "jwt", "refreshToken invalid"));

      //@ts-ignore
      const userId = payload.aud;
      //@ts-ignore
      const role = payload.role;
      const { accessToken, refreshToken } = generateAuthTokens(userId, role);

      //send tokens
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);
      res.status(200).json({ accessToken, role });
    } catch (err: any) {
      return next(createError(401, "refresh access token", err.message));
    }
  } catch (err: any) {
    log.error(err);
    return next(createError(err.status, "refresh access token", err.message));
  }
};

// export const resetPassController = async (
//   req: Request<resetPassType["params"], {}, resetPassType["body"]>,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const secret = config.EMAIL_SECRET;
//     const token = req.params.code;

//     const { valid, expired, payload } = verifyToken(token, secret);
//     if (!valid) return next(createError(401, "jwt", "token invalid"));
//     if (expired) return next(createError(401, "jwt", "token expired"));

//     // @ts-ignore
//     const userId = payload.aud;
//     const user = await findUserById(userId);

//     if (!user) return next(createError(404, "user", "user not found"));

//     const newPassword = req.body.password;
//     const newHashedPassword = await argon2.hash(newPassword);
//     await findAndUpdateUser(userId, { password: newHashedPassword });

//     return res.sendStatus(200);
//   } catch (err: any) {
//     log.error(err);
//     return next(createError(err.status, "reset password", err.message));
//   }
// };

// export const sendResetPassEmailController = async (
//   req: Request<{}, {}, sendResetPassEmailType["body"]>,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const user = await findUserByEmail(req.body.email);

//     if (!user) return next(createError(404, "user", "user not found"));

//     if (process.env.NODE_ENV !== "test") {
//       //all good, lets send the forgot pass email now
//       sendEmail(user.id, user.email, "RESET");
//     }
//     return res.sendStatus(200);
//   } catch (err: any) {
//     log.error(err);
//     return next(createError(err.status, "send reset pass email", err.message));
//   }
// };
