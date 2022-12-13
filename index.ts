import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { sign, verify } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt, { compare, hash } from "bcrypt";

const saltRounds = 10;

const secret: any = process.env.SECRET;

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  if (user) {
    const hash = user.password;

    bcrypt.compare(password, hash, function (err, result) {
      if (result) {
        const token = sign(
          {
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
            username: email,
          },
          secret
        );

        res.json({ token: token });
      } else {
        res.send("Email or password are incorrect");
      }
    });
  } else {
    res.send(user);
  }
});

app.post("/createUser", async (req, res) => {
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;

  bcrypt.hash(password, saltRounds, async function (err, hash) {
    const createdUser = await prisma.user.create({
      data: {
        email: email,
        username: username,
        password: hash,
      },
    });
    if (createdUser) {
      res.json({ createdUser, message: "success" });
    } else {
      res.json({ message: "Failed to create" });
    }
  });
});

app.post("/getUserData", async (req, res) => {
  const token = req.body.token;

  const verified: any = verify(token, secret);

  const email = verified.username;

  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
    include: {
      posts: true,
    },
  });

  const AllUserData = await prisma.user.findMany({
    include:{
      posts:true,
    }
  })

  console.log(user);

  res.json({userData: user, allUserData: AllUserData});
});

app.listen(process.env.PORT, () => {
  console.log("Server loaded on port:", process.env.PORT);
});
