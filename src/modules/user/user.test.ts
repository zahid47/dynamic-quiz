import request from "supertest";
import app from "../../utils/app";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "./user.model";
import { createUser, findUserById } from "./user.service";
import { generateRandomUser } from "../../utils/test.randomGenerators";
import { reverseString } from "../../utils/test.reverseString";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateAuthTokens } from "../../utils/jwt";

describe("user", () => {
  beforeAll(async () => {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoose.connection.close();
  });

  describe("sanity check", () => {
    it("has a moddule", () => {
      expect(User).toBeDefined();
    });
  });

  describe("create user", () => {
    describe("POST /user", () => {
      describe("given name, email, password is not provided", () => {
        it("should return a 400 and not create an user", async () => {
          const { statusCode, body } = await request(app).post(`/user`).send(); //sending nothing

          expect(statusCode).toBe(400);
          expect(body).not.toHaveProperty("name");
          expect(body.context).toEqual("validate");
        });
      });

      describe("given name, email, password is provided", () => {
        it("should return a 201 and create an user", async () => {
          const user = generateRandomUser();
          const { statusCode, body } = await request(app)
            .post(`/user`)
            .send(user);
          expect(statusCode).toBe(201);
          expect(body.name).toEqual(user.name);
        });
      });

      describe("given extra unaccepted fields are provided", () => {
        it("should return a 400", async () => {
          let user: any = generateRandomUser();
          user = { ...user, verified: true };

          const { statusCode } = await request(app).post(`/user`).send(user);
          expect(statusCode).toBe(400);
        });
      });

      describe("given duplicate email provided", () => {
        it("should return a 409", async () => {
          const user1 = await createUser(generateRandomUser());
          let user2 = generateRandomUser();
          user2 = { ...user2, email: user1.email };

          const { statusCode } = await request(app).post(`/user`).send(user2);

          expect(statusCode).toBe(409);
        });
      });
    });
  });

  describe("get users", () => {
    describe("GET /user", () => {
      describe("given an user is authenticated and some users exist", () => {
        it("should return a 200 and less than or equal to 'limit' number of users", async () => {
          const adminUser = await createUser(generateRandomUser("admin"));
          const { accessToken } = generateAuthTokens(
            adminUser.id,
            adminUser.role
          );

          await createUser(generateRandomUser());
          await createUser(generateRandomUser());
          await createUser(generateRandomUser());

          const limit = 2;
          const { statusCode, body } = await request(app)
            .get(`/user?limit=${limit}`)
            .set("Authorization", `Bearer ${accessToken}`);

          expect(statusCode).toBe(200);
          expect(body.length).toBeLessThanOrEqual(limit);
        });
      });
    });
  });

  describe("get user by id", () => {
    describe("GET /user/:id", () => {
      describe("given the user is not an admin", () => {
        it("should return a 403", async () => {
          const normalUser = await createUser(generateRandomUser());
          const anotherUser = await createUser(generateRandomUser());
          const { accessToken } = generateAuthTokens(
            normalUser.id,
            normalUser.role
          );

          const { statusCode } = await request(app)
            .get(`/user/${anotherUser._id}`)
            .set("Authorization", `Bearer ${accessToken}`);

          expect(statusCode).toBe(403);
        });
      });

      describe("given a user with a specific id don't exist", () => {
        it("should return a 404", async () => {
          const adminUser = await createUser(generateRandomUser("admin"));
          const anotherUser = await createUser(generateRandomUser());
          const { accessToken } = generateAuthTokens(
            adminUser.id,
            adminUser.role
          );
          const fakeId = reverseString(anotherUser.id);

          const { statusCode } = await request(app)
            .get(`/user/${fakeId}`)
            .set("Authorization", `Bearer ${accessToken}`);

          expect(statusCode).toBe(404);
        });
      });

      describe("given a user with a specific id exist", () => {
        it("should return a 200 and the user", async () => {
          const adminUser = await createUser(generateRandomUser("admin"));
          const { accessToken } = generateAuthTokens(
            adminUser.id,
            adminUser.role
          );
          const user = await createUser(generateRandomUser());
          const { statusCode, body } = await request(app)
            .get(`/user/${user._id}`)
            .set("Authorization", `Bearer ${accessToken}`);

          expect(statusCode).toBe(200);
          expect(body._id).toEqual(user.id);
        });
      });
    });
  });

  describe("update user by id", () => {
    describe("PATCH /user/:id", () => {
      describe("given the user is not authorized", () => {
        it("should return a 401 and not update the user", async () => {
          const user = await createUser(generateRandomUser());
          const updated = { name: "updated" };

          const { statusCode, body } = await request(app)
            .patch(`/user/${user._id}`)
            .send(updated);

          expect(statusCode).toBe(401);
          expect(body.name).not.toEqual(updated.name);
        });
      });

      describe("given the user is trying to update someone else's profile", () => {
        it("should return a 403", async () => {
          const user1 = await createUser(generateRandomUser());
          const user2 = await createUser(generateRandomUser());
          const update = { name: "updated" };
          const { accessToken } = generateAuthTokens(user2.id, user2.role); //logging in as user2

          const { statusCode, body } = await request(app)
            .patch(`/user/${user1._id}`) //but trying to update user1's profile
            .set("Authorization", `Bearer ${accessToken}`)
            .send(update);

          expect(statusCode).toBe(403);
          expect(body._id).not.toEqual(update.name);
        });
      });

      describe("given the user is authorized as the correct user but trying to change to a duplicate email", () => {
        it("should return a 409", async () => {
          const existingUser = await createUser(generateRandomUser());
          const userInfo = generateRandomUser();
          const user = await createUser(userInfo);
          const update = { email: existingUser.email };
          const { accessToken } = generateAuthTokens(user.id, user.role);

          const { statusCode } = await request(app)
            .patch(`/user/${user._id}`)
            .set("Authorization", `Bearer ${accessToken}`) //sending an access token with the request so that the user is authorized
            .send(update);

          expect(statusCode).toBe(409);
        });
      });

      describe("given the user is authorized as the correct user", () => {
        it("should return a 200 and update the user", async () => {
          const userInfo = generateRandomUser();
          const user = await createUser(userInfo);
          const update = { name: "updated" };
          const { accessToken } = generateAuthTokens(user.id, user.role);

          const { statusCode, body } = await request(app)
            .patch(`/user/${user._id}`)
            .set("Authorization", `Bearer ${accessToken}`) //sending an access token with the request so that the user is authorized
            .send(update);

          expect(statusCode).toBe(200);
          expect(body.name).toEqual(update.name);
        });
      });
    });
  });

  describe("delete user by id", () => {
    describe("DELETE /user/:id", () => {
      describe("given the user is not authorized", () => {
        it("should return a 401 and not delete the user", async () => {
          const user = await createUser(generateRandomUser());

          const { statusCode } = await request(app).delete(`/user/${user._id}`);
          const notDeletedUser = await findUserById(user.id);

          expect(statusCode).toBe(401);
          expect(notDeletedUser).not.toBe(null);
        });
      });

      describe("given the user is trying to delete someone else's profile", () => {
        it("should return a 403", async () => {
          const user1 = await createUser(generateRandomUser());
          const user2 = await createUser(generateRandomUser());
          const { accessToken } = generateAuthTokens(user2.id, user2.role); //logging in as user2

          const { statusCode } = await request(app)
            .delete(`/user/${user1._id}`) //but trying to delete user1's profile
            .set("Authorization", `Bearer ${accessToken}`);

          const notDeletedUser = await findUserById(user1.id);

          expect(statusCode).toBe(403);
          expect(notDeletedUser).not.toBe(null);
        });
      });

      describe("given the user is authorized as the correct user", () => {
        it("should return a 200 and delete the user", async () => {
          const user = await createUser(generateRandomUser());
          const { accessToken } = generateAuthTokens(user.id, user.role);

          const { statusCode } = await request(app)
            .delete(`/user/${user._id}`)
            .set("Authorization", `Bearer ${accessToken}`); //sending an access token with the request so that the user is authorized

          const deletedUser = await findUserById(user.id);

          expect(statusCode).toBe(200);
          expect(deletedUser).toBe(null);
        });
      });
    });
  });

  describe("get orders by user", () => {
    describe("GET /user/orders", () => {
      describe("given the user is not authorized", () => {
        it("should return a 401", async () => {
          const { statusCode } = await request(app).get(`/user/orders`);

          expect(statusCode).toBe(401);
        });
      });
    });
  });
});
