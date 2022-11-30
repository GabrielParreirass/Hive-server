import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { sign } from "jsonwebtoken";
import { serialize } from "cookie";
const cookieParser = require("cookie-parser");

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
      password: password,
    },
  });

  if(user){

    const token = sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        username: email,
      },
      secret
    )

    res.json({token: token})
  }else{
    res.send("User not found")
  }


});

app.listen(process.env.PORT, () => {
  console.log("Server loaded on port:", process.env.PORT);
});
