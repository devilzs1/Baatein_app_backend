const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const {Server} = require("socket.io");
const User = require("./models/user");

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); 
});

const DB = process.env.DBURI.replace(
  "<PASSWORD>",
  process.env.DBPASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("DB Connection successful");
  })
  .catch((err) => {
    console.log(err);
  });


  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3001/" || "https://baatein-app-backend.vercel.app/",
      methods: ["GET", "POST"],
    },
  });

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});

io.on("connection", async (socket)=>{
  console.log(socket);
  console.log(JSON.stringify(socket.handshake.query));

  const user_id = socket.handshake.query("user_id");
  const socket_id = socket.id;
  console.log(`User connected ${socket_id}`)

  if (user_id != null && Boolean(user_id)) {
    try {
      User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
    }
  }

  socket.on("friend_request", async (data) => {
    const to = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");

    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    io.to(to?.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });
    io.to(from?.socket_id).emit("request_sent", {
      message: "Request Sent successfully!",
    });
  });

  socket.on("accept_request", async (data) => {
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);
    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  });

    socket.on("end", async (data) => {
      if (data.user_id) {
        await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
      }
      console.log("closing connection");
      socket.disconnect(0);
    });
})

process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1);
  });
});