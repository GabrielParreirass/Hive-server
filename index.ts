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

  const emailUser = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  const nameUser = await prisma.user.findFirst({
    where: {
      username: username,
    },
  });

  if (emailUser) {
    res.json({
      message: "Email já cadastrado em conta existente!",
      create: false,
    });
  } else if (nameUser) {
    res.json({ message: "Usuario já existe!", create: false });
  } else {
    bcrypt.hash(password, saltRounds, async function (err, hash) {
      const createdUser = await prisma.user.create({
        data: {
          email: email,
          username: username,
          password: hash,
          friends: [],
        },
      });
      if (createdUser) {
        res.json({
          createdUser,
          message: "Conta criada com sucesso",
          create: true,
        });
      } else {
        res.json({ message: "Failed to create" });
      }
    });
  }
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
    include: {
      posts: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  const comments = await prisma.comment.findMany({});

  const posts = await prisma.post.findMany({
    orderBy: {
      id: "desc",
    },
  });

  console.log(posts);

  res.json({
    userData: user,
    allUserData: AllUserData,
    comments: comments,
    posts: posts,
  });
});

app.get("/getUser/:id", async (req, res) => {
  const authorId = req.params.id;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: authorId,
      },
      include: {
        posts: true,
      },
    });
    res.json({ message: user });
  } catch (error) {
    res.json({ message: "Usuario não encontrado!" });
  }
});

app.get("/getUsers", async (req, res) => {
  const users = await prisma.user.findMany({});

  res.json({ users });
});

app.post("/createPost", async (req, res) => {
  const title = req.body.title;
  const body = req.body.body;
  const authorId = req.body.authorId;
  const authorUsername = req.body.authorUsername;

  const createdPost = await prisma.post.create({
    data: {
      title: title,
      body: body,
      authorId: authorId,
      authorUsername: authorUsername,
    },
  });

  res.json({ post: createdPost });
});

app.patch("/sendComment", async (req, res) => {
  const authorId = req.body.authorId;
  const authorUsername = req.body.authorUsername;
  const commentText = req.body.comment;
  const postId = req.body.postId;

  const commentSend = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      Comment: {
        createMany: {
          data: [
            {
              comment: commentText,
              authorId: authorId,
              authorUsername: authorUsername,
            },
          ],
        },
      },
    },
  });

  res.send(commentSend);
});

app.delete("/deletePost", async (req, res) => {
  const postId = req.body.postId;

  await prisma.comment.deleteMany({
    where: {
      postId: postId,
    },
  });

  const deletedPost = await prisma.post.delete({
    where: {
      id: postId,
    },
  });

  res.send(deletedPost);
});

app.post("/addFriend", async (req, res) => {
  const friendId = req.body.friendId;
  const friendUsername = req.body.friendUsername;
  const loggedUserId = req.body.loggedUserId;

  await prisma.user.update({
    where: {
      id: loggedUserId,
    },
    data: {
      friends: {
        push: {
          friendId: friendId,
          friendUsername: friendUsername,
        },
      },
    },
  });

  res.send("Adicionado com sucesso!");
});

app.post("/removeFriend", async (req, res) => {
  const IdFriendToBeRemoved = req.body.toBeRemovedId;
  const logedUserId = req.body.loggedUserId;

  const friendsList = await prisma.user.findFirst({
    where: { id: logedUserId },
  });

  const indexFriendToBeRemoved: any = friendsList?.friends.findIndex(
    (friend: any) => friend.friendId == IdFriendToBeRemoved
  );

  friendsList?.friends.splice(indexFriendToBeRemoved, 1);

  const nova = friendsList?.friends;

  await prisma.user.update({
    where: {
      id: logedUserId,
    },
    data: {
      friends: {
        set: nova,
      },
    },
  });

  res.json({ newList: nova });
});

app.post("/addLike", async (req, res) => {
  const postId = req.body.postId;
  const likeAuthorId = req.body.likeAuthorId;
  const likeAuthorUsername = req.body.likeAuthorUsername;

  const liked = await prisma.post.update({
    where: {
      id: postId
    },
    data: {
      likes:{
        push:{
          likeAuthorId: likeAuthorId,
          likeAuthorUsername: likeAuthorUsername
        }
      }
    }
  })

  res.send(liked)

});

app.patch("/removeLike", async (req, res) => {
  const postId = req.body.postId;
  const likeAuthorId = req.body.likeAuthorId

  const likesList = await prisma.post.findFirst({
    where: {
      id:postId
    }
  })

  const indexLikeToBeRemoved: any = likesList?.likes.findIndex(
    (like: any) => like.likeAuthorId == likeAuthorId
  );

  likesList?.likes.splice(indexLikeToBeRemoved, 1)

  const newLikesList = likesList!.likes



  await prisma.post.update({
    where:{
      id: postId
    },
    data:{
      likes:{
        set: newLikesList
      }
    }
  })

  res.json({likes: newLikesList})

  

})

app.listen(process.env.PORT, () => {
  console.log("Server loaded on port:", process.env.PORT);
});
